from fastapi import FastAPI, HTTPException
from db.user_db.schemas import Register, Login
from db.user_db.models import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import bcrypt


def hashing(password) -> bytes:
    salt = bcrypt.gensalt() # Random string that's added to password before hashing
    return bcrypt.hashpw(password.encode('utf-8'), salt)


app = FastAPI()

@app.post('/register')
async def register(details : Register, db : AsyncSession):
    result = await db.execute(
        select(User).where(User.email == details.email)
    )

    result = result.scalar_one_or_none()

    hashed = hashing(details.password)

    if result:
        raise HTTPException(status_code=404, detail='User already exists')
    else: 
        new_user = User(
            name = details.name,
            email = details.email,
            password = hashed
        )

        db.add(new_user)
        await db.commit() 
        await db.refresh(new_user)

        return {'message' : 'New user Created'}

@app.post('/login')
async def login(details : Login, db : AsyncSession):
    # here checkpw() is used to extract the salt and then check only the password matches or not
    result = await db.execute(
        select(User).where(User.email == details.email)
    )
    result = result.scalar_one_or_none()

    if not result:
        raise HTTPException(status_code=400, detail='Invalid Email')
    elif not bcrypt.checkpw(details.password.encode('utf-8'), result.password):
        raise HTTPException(status_code=400, detail='Invalid Password')
    
    return {'message' : 'Login Successful'}
    
    
    