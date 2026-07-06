from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from db.schemas import RenameChat, AnalysisResponse
from db.models import User, Chat, Messages, Analysis, Chunk
from db.database import get_async_session
from auth.dependencies import get_current_user
from core.crag import CRAGPipeline
from core.storage import upload_file, get_public_url, delete_file
import asyncio
import os
import json
import tempfile
import shutil

router = APIRouter()


@router.post('/chat')
async def upload_chat(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    # upload file to supabase
    key = f"{current_user.id}/{file.filename}"
    upload_file(file.file, key)

    # create a new Chat
    new_chat = Chat(user_id=current_user.id, name=file.filename, pdf_path=key)
    db.add(new_chat)
    await db.commit()
    await db.refresh(new_chat)

    # Run to immediately create embeddings + save them
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: CRAGPipeline(
            pdf_path=key,
            filename=file.filename,
            chat_id=new_chat.id
        )
    )

    return new_chat


@router.get('/history')
async def history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    result = await db.execute(select(Chat).where(Chat.user_id == current_user.id))
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
    if chat.pdf_path:
        delete_file(chat.pdf_path)

    # Delete Chat + embeddings + messages
    await db.execute(delete(Chunk).where(Chunk.chat_id == chat_id))
    await db.execute(delete(Messages).where(Messages.chat_id == chat_id))
    await db.execute(delete(Chunk).where(Chunk.chat_id == chat_id))
    await db.delete(chat)
    await db.commit()

    return {'message': 'Chat deleted'}


@router.delete('/delete_all_chat')
async def delete_all_chat(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    chats = await db.execute(select(Chat).where(Chat.user_id == current_user.id))
    chats = chats.scalars().all()
    chat_ids = [chat.id for chat in chats]

    # Delete files from supabase 
    for chat in chats:
        if chat.pdf_path:
            delete_file(chat.pdf_path)

    # Delete Chat + Messages + Chunk
    await db.execute(delete(Chunk).where(Chunk.chat_id.in_(chat_ids)))
    await db.execute(delete(Messages).where(Messages.chat_id.in_(chat_ids)))
    await db.execute(delete(Chat).where(Chat.user_id == current_user.id))
    await db.commit()

    return {'message': 'All chats deleted'}


@router.patch('/chats/{chat_id}/rename')
async def rename_chat(
    chat_id: int,
    new_name: RenameChat,
    db: AsyncSession = Depends(get_async_session)
):
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
):
    chat_row = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat_row = chat_row.scalar_one_or_none()
    if not chat_row:
        raise HTTPException(status_code=404, detail='Chat not found')

    existing = await db.execute(select(Analysis).where(Analysis.chat_id == chat_id))
    existing = existing.scalar_one_or_none()
    if existing:
        return AnalysisResponse(
            chat_id=chat_id,
            clauses=json.loads(existing.clauses),
            risks=json.loads(existing.risks),
            summary=existing.summary,
            improvements=json.loads(existing.improvements),
        )

    # Vector store already built on upload — no need to re-download PDF,
    # pass a dummy path since CRAGPipeline only needs it if chunks are missing
    loop = asyncio.get_event_loop()
    pipeline = await loop.run_in_executor(
        None,
        lambda: CRAGPipeline(
            pdf_path=chat_row.pdf_path,  # only used if Chunk table is empty (edge case)
            filename=chat_row.name,
            chat_id=chat_id
        )
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