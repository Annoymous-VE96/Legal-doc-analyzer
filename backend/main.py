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

app = FastAPI(lifespan=lifespan)

app.mount('/uploads', StaticFiles(directory='uploads'), name='uploads')

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