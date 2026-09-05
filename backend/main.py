import sys
from pathlib import Path

# Add backend directory to sys.path so imports like `from db...` work seamlessly anywhere
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from db.database import create_all_tables
from routes import auth, chats, messages


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_all_tables()
    yield

import os

app = FastAPI(lifespan=lifespan)

uploads_dir = Path(__file__).resolve().parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount('/uploads', StaticFiles(directory=str(uploads_dir)), name='uploads')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'https://lexaifrontend-six.vercel.app',
        'http://localhost:3000'
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

app.include_router(auth.router)
app.include_router(chats.router)
app.include_router(messages.router)

@app.get("/", response_model=dict, status_code=200)
async def root():
    return {
        "message": "Welcome to the API",
        "status": "running"
    }