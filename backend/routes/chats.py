from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from db.schemas import RenameChat
from db.models import User, Chat, Messages
from db.database import get_async_session
from auth.dependencies import get_current_user
from core.crag import CRAGPipeline
import shutil
import asyncio
import os

router = APIRouter()


@router.post('/chat')
async def upload_chat(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    file_dir = f"uploads/{current_user.id}"
    os.makedirs(file_dir, exist_ok=True)

    file_path = f"{file_dir}/{file.filename}"
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    new_chat = Chat(user_id=current_user.id, name=file.filename, pdf_path=file_path)
    db.add(new_chat)
    await db.commit()
    await db.refresh(new_chat)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: CRAGPipeline(
            pdf_path=file_path,
            filename=file.filename,
            vector_store_dir=f'vector_store/{new_chat.id}'
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
        'chats' : result.scalars().all(),
        'username' : current_user.name
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

    # Delete vector store
    vector_store_path = f"vector_store/{chat_id}"
    if os.path.exists(vector_store_path):
        shutil.rmtree(vector_store_path)

    # Delete uploaded PDF  ← chat.pdf_path not Chat.pdf_path
    if chat.pdf_path and os.path.exists(chat.pdf_path):
        os.remove(chat.pdf_path)

    # Delete messages
    await db.execute(delete(Messages).where(Messages.chat_id == chat_id))

    # Delete chat
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

    for chat in chats:
        vector_store_path = f"vector_store/{chat.id}"
        if os.path.exists(vector_store_path):
            shutil.rmtree(vector_store_path)

    chat_ids = [chat.id for chat in chats]

    await db.execute(delete(Messages).where(Messages.chat_id.in_(chat_ids)))  
    await db.execute(delete(Chat).where(Chat.user_id == current_user.id))

    upload_store_path = f"uploads/{current_user.id}"
    if os.path.exists(upload_store_path):
        shutil.rmtree(upload_store_path)

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

