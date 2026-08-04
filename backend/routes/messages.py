from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.schemas import MessageCreate
from db.models import User, Chat, Messages
from db.database import get_async_session
from auth.dependencies import get_current_user
from core.crag import CRAGPipeline
from core.storage import get_public_url
import asyncio
import json
import queue
import threading

router = APIRouter()


@router.post('/chats/{chat_id}/messages')
async def send_message(
    chat_id: int,
    query: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    user_msg = Messages(chat_id=chat_id, role='user', content=query.content)
    db.add(user_msg)
    await db.commit()

    chat_row = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat_row = chat_row.scalar_one_or_none()

    history_rows = await db.execute(
        select(Messages).where(Messages.chat_id == chat_id).order_by(Messages.id.desc())
    )
    history = history_rows.scalars().all()[::-1]
    chat_history = [
        {'role': 'user' if m.role == 'user' else 'assistant', 'content': m.content}
        for m in history
    ]

    loop = asyncio.get_event_loop()
    crag_pipeline = await loop.run_in_executor(
        None,
        lambda: CRAGPipeline(
            pdf_path=chat_row.pdf_path,  # only used if Chunk table empty
            filename=chat_row.name,
            chat_id=chat_id
        )
    )

    full_answer = []

    async def stream_response():
        event_queue = queue.Queue()
        SENTINEL = object()

        def worker():
            try:
                def callback(label: str):
                    event_queue.put({"type": "status", "label": label})

                result = crag_pipeline.run(query.content, chat_history, status_callback=callback)
                event_queue.put({"type": "result", "data": result})
            except Exception as e:
                event_queue.put({"type": "error", "error": str(e)})
            finally:
                event_queue.put(SENTINEL)

        thread = threading.Thread(target=worker, daemon=True)
        thread.start()

        crag_result = None
        while True:
            item = await loop.run_in_executor(None, event_queue.get)
            if item is SENTINEL:
                break

            if item["type"] == "status":
                payload = json.dumps({"type": "status", "label": item["label"]})
                yield f"data: {payload}\n\n"
            elif item["type"] == "result":
                crag_result = item["data"]
            elif item["type"] == "error":
                print("Pipeline error:", item["error"])

        thread.join()

        if not crag_result:
            crag_result = {}

        refined_context = crag_result.get('refined_context', '')
        verdict = crag_result.get('verdict', 'CORRECT')

        prompt_msgs = crag_pipeline.answer_prompt.format_messages(
            question=query.content,
            refined_context=refined_context,
            verdict=verdict,
            chat_history=chat_history
        )

        async for chunk in crag_pipeline.llm.astream(prompt_msgs):
            if chunk.content:
                full_answer.append(chunk.content)
                payload = json.dumps({"type": "token", "content": chunk.content})
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0.02)

        complete = "".join(full_answer)
        ai_msg = Messages(chat_id=chat_id, role='AI', content=complete)
        db.add(ai_msg)
        await db.commit()
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )


@router.get('/chats/{chat_id}/messages')
async def get_messages(
    chat_id: int,
    db: AsyncSession = Depends(get_async_session)
):
    results = await db.execute(select(Messages).where(Messages.chat_id == chat_id))
    messages = results.scalars().all()

    chat = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = chat.scalar_one_or_none()

    return {
        'pdf_path': get_public_url(chat.pdf_path) if chat else None,
        'messages': [{'role': m.role, 'message': m.content} for m in messages]
    }