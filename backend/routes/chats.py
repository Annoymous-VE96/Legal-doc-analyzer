from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from sqlalchemy import select, delete, exists
from sqlalchemy.ext.asyncio import AsyncSession
from db.schemas import RenameChat, AnalysisResponse, NewChat
from db.models import User, Chat, Messages, Analysis, Chunk
from db.database import get_async_session
from auth.dependencies import get_current_user
from core.crag import CRAGPipeline
from typing import Sequence
from core.storage import upload_file, download_file, delete_file, delete_folder
import asyncio
import os
import json

router = APIRouter()


def _process_vector_embeddings(pdf_path: str, filename: str, chat_id: int):
    try:
        CRAGPipeline(
            pdf_path=pdf_path,
            filename=filename,
            chat_id=chat_id
        )
    finally:
        if os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
            except Exception:
                pass


@router.post('/chat')
async def upload_chat(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
) -> NewChat:
    
    # Upload file bytes to Supabase Storage
    content = await file.read()
    key = f'{current_user.id}/{file.filename}'
    upload_file(content, key)

    # Create new Chat DB record
    new_chat = Chat(user_id=current_user.id, name=file.filename, pdf_path=key)
    db.add(new_chat)
    await db.commit()
    await db.refresh(new_chat)

    # Write file bytes directly to temp directory without redundant HTTP re-download
    tmp_dir = os.path.join(os.getcwd(), "uploads", "tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_path = os.path.join(tmp_dir, f"{new_chat.id}_{file.filename}")
    with open(tmp_path, "wb") as f:
        f.write(content)

    # Offload vector embedding creation to BackgroundTask for instant response
    background_tasks.add_task(
        _process_vector_embeddings,
        tmp_path,
        file.filename,
        new_chat.id
    )

    chat = NewChat(
        id=new_chat.id,
        user_id=new_chat.user_id,
        name=new_chat.name,
        pdf_path=new_chat.pdf_path,
        page_offset=new_chat.page_offset,
        created_at=new_chat.created_at,
        pinned=new_chat.pinned
    )
    return chat


@router.get('/history')
async def history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    
    result = await db.execute(
        select(Chat).where(Chat.user_id == current_user.id).order_by(Chat.created_at.desc())
    )
    return {
        'chats': result.scalars().all(),
        'username': current_user.name
    }


@router.delete('/delete_chat')
async def delete_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail='Chat not found')
    
    # Delete the file from Supabase
    key = chat.pdf_path
    delete_file(key)

    # Delete Chat + embeddings + messages
    await db.execute(delete(Messages).where(Messages.chat_id == chat_id))
    await db.execute(delete(Chunk).where(Chunk.chat_id == chat_id))
    await db.execute(delete(Analysis).where(Analysis.chat_id == chat_id))
    await db.execute(delete(Chat).where(Chat.id == chat_id))
    await db.delete(chat)
    await db.commit()

    return {'message': 'Chat deleted'}


@router.delete('/delete_all_chat')
async def delete_all_chat(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
) -> dict[str, str]:
    
    chats = await db.execute(select(Chat).where(Chat.user_id == current_user.id))
    chats = chats.scalars().all()
    chat_ids = [chat.id for chat in chats]

    # Delete a folder from supabase 
    prefix = str(current_user.id)
    delete_folder(prefix)

    # Delete Chat + Messages + Chunk
    await db.execute(delete(Chunk).where(Chunk.chat_id.in_(chat_ids)))
    await db.execute(delete(Messages).where(Messages.chat_id.in_(chat_ids)))
    await db.execute(delete(Analysis).where(Analysis.chat_id.in_(chat_ids)))
    await db.execute(delete(Chat).where(Chat.user_id == current_user.id))
    await db.commit()

    return {'message': 'All chats deleted'}


@router.patch('/chats/{chat_id}/rename')
async def rename_chat(
    chat_id: int,
    new_name: RenameChat,
    db: AsyncSession = Depends(get_async_session)
) -> dict[str, str]:
    
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail='Chat not found')

    chat.name = new_name.name
    await db.commit()
    await db.refresh(chat)
    return {'message': 'Rename Done'}


@router.post('/chats/{chat_id}/analyze', response_model=AnalysisResponse)
async def analyze_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
) -> AnalysisResponse:
    
    chat_task = db.execute(select(Chat).where(Chat.id == chat_id))
    analysis_task = db.execute(select(Analysis).where(Analysis.chat_id == chat_id))
    chat_row, existing = await asyncio.gather(chat_task, analysis_task)
    chat_row = chat_row.scalar_one_or_none()
    existing = existing.scalar_one_or_none()

    if existing:
        return AnalysisResponse(
            chat_id=chat_id,
            clauses=json.loads(existing.clauses),
            risks=json.loads(existing.risks),
            summary=existing.summary,
            improvements=json.loads(existing.improvements),
        )
    
    chunks_exist = await db.execute(select(exists().where(Chunk.chat_id == chat_id))) # Lighter than a whole query
    chunks_exist = chunks_exist.scalar()
    loop = asyncio.get_running_loop()
    pipeline = await loop.run_in_executor(
            None,
            lambda: CRAGPipeline(pdf_path=chat_row.pdf_path, filename=chat_row.name, chat_id=chat_id)
        )

    result = await loop.run_in_executor(None, pipeline.analyze_document)

    analysis = Analysis(
        chat_id=chat_id,
        clauses=json.dumps([c.model_dump() for c in result.clauses]),
        risks=json.dumps([r.model_dump() for r in result.risks]),
        summary=result.summary,
        improvements=json.dumps(result.improvements),
    )
    db.add(analysis)
    await db.commit()

    return AnalysisResponse(
        chat_id=chat_id,
        clauses=result.clauses,
        risks=result.risks,
        summary=result.summary,
        improvements=result.improvements,
    )


@router.get('/chats/{chat_id}/analyze', response_model=AnalysisResponse)
async def get_analysis(
    chat_id: int,
    db: AsyncSession = Depends(get_async_session)
):
    result = await db.execute(select(Analysis).where(Analysis.chat_id == chat_id))
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail='No analysis yet')

    return AnalysisResponse(
        chat_id=chat_id,
        clauses=json.loads(analysis.clauses),
        risks=json.loads(analysis.risks),
        summary=analysis.summary,
        improvements=json.loads(analysis.improvements),
    )

@router.patch('/chats/{chat_id}/pin')
async def pin_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail='Chat not found')

    if not chat.pinned:
        # about to pin — check the 10 limit
        count_result = await db.execute(
            select(Chat).where(Chat.user_id == current_user.id, Chat.pinned == True)
        )
        pinned_count = len(count_result.scalars().all())
        if pinned_count >= 10:
            raise HTTPException(status_code=400, detail='Max 10 pinned chats allowed')

    chat.pinned = not chat.pinned # just converts : not(True) = False. Helps to unpin by clicking again
    await db.commit()
    await db.refresh(chat)
    return {'pinned': chat.pinned}