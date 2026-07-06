from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from db.schemas import Register, Login
from db.models import User, Chat, Messages
from db.database import get_async_session
from auth.authentication import create_token
from auth.dependencies import get_current_user
import bcrypt
import os 
import shutil

router = APIRouter()

def hashing(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(
        password.encode("utf-8"),
        salt
    ).decode("utf-8")

@router.post('/register')
async def register(
    details: Register,
    db: AsyncSession = Depends(get_async_session)
):
    result = await db.execute(select(User).where(User.email == details.email))
    result = result.scalar_one_or_none()

    if result:
        raise HTTPException(status_code=404, detail='User already exists')

    hashed = hashing(details.password)
    new_user = User(name=details.name, email=details.email, password=hashed)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    result = await db.execute(select(User).where(User.email == details.email))
    result = result.scalar_one_or_none()

    token = create_token(result.id)
    return {'access_token': token, 'token_type': 'bearer'}


@router.post('/login')
async def login(
    details: Login,
    db: AsyncSession = Depends(get_async_session)
):
    result = await db.execute(select(User).where(User.email == details.email))
    result = result.scalar_one_or_none()

    if not result:
        raise HTTPException(status_code=400, detail='Invalid Email')
    elif not bcrypt.checkpw(details.password.encode('utf-8'),  result.password.encode("utf-8")):
        raise HTTPException(status_code=400, detail='Invalid Password')

    token = create_token(result.id)
    return {'access_token': token, 'token_type': 'bearer'}


@router.delete('/delete_account')  
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    chats = await db.execute(select(Chat).where(Chat.user_id == current_user.id))
    chats = chats.scalars().all()
    chat_ids = [chat.id for chat in chats]

    # Delete vector stores
    for chat in chats:
        vector_store_path = f"vector_store/{chat.id}"
        if os.path.exists(vector_store_path):
            shutil.rmtree(vector_store_path)

    # Delete messages
    await db.execute(delete(Messages).where(Messages.chat_id.in_(chat_ids)))  
    await db.commit()

    # Delete chats
    await db.execute(delete(Chat).where(Chat.user_id == current_user.id))
    await db.commit()
    
    # Delete uploaded files
    upload_store_path = f"uploads/{current_user.id}"
    if os.path.exists(upload_store_path):
        shutil.rmtree(upload_store_path)

    # Delete user
    await db.execute(delete(User).where(User.id == current_user.id))
    await db.commit()      

    return {'message': 'Account deleted'}