from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from user_db.schemas import Base

DATABASE_URL = 'sqlite+aiosqlite:///./user.db' 
engine = create_async_engine(
    DATABASE_URL,
    pool_size=6, # number of connections in pool
    max_overflow=10 # extra connections allowed beyonnd pool_size if all 6 are busy
)
session_maker = async_sessionmaker(engine, expire_on_commit=False)

# To get session to interact with the DB when needed
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with session_maker as session:
        yield session
    '''
        get_async_session() runs
            ↓
        hits yield → pauses, hands session to FastAPI
            ↓
        FastAPI runs the route using the session
            ↓
        route finishes
            ↓
        FastAPI signals back → function resumes
            ↓
        async with closes the session → function done
    '''

# Creates the table according to the schema defined in : models.py
async def create_all_tables():
    with engine.begin() as e:
        await e.run_sync(Base.metadata.create_all())
    '''
    engine : a connection pool. By default it has 5 connections
    engine.begin() : picks up a connection to use it 
    await : it works same as async as making connection takes time. App can handle other things while waiting for it.
    '''
    