from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = 'HS256' 
EXPIRE_DAY = 7

def create_token(user_id : int) -> str:
    payload = {
        'sub': str(user_id),
        'exp': datetime.now() + timedelta(days=EXPIRE_DAY)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token : str) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]) 
        return int(payload.get('sub'))
    except JWTError:
        raise HTTPException(status_code=401, detail='Invalid or expired token')

# return int(payload.get('sub')) -> returns the user id as string converted in int
# at login, you stored: payload = {"sub": "42", "exp": ...}