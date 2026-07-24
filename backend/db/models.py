from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Integer, String, DateTime, ForeignKey, Text, Boolean
from datetime import datetime
from pgvector.sqlalchemy import Vector

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = 'User'

    id : Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name : Mapped[str] = mapped_column(String)
    email : Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password : Mapped[str] = mapped_column(String, nullable=False)
    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

class Chat(Base):
    __tablename__ = 'Chat'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('User.id'), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    pdf_path: Mapped[str] = mapped_column(String, nullable=False)
    page_offset: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    
class Messages(Base):
    __tablename__ = 'Messages'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chat_id: Mapped[int] = mapped_column(Integer, ForeignKey('Chat.id'), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  
    content: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

class Analysis(Base):
    __tablename__ = 'Analysis'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chat_id: Mapped[int] = mapped_column(Integer, ForeignKey('Chat.id'), nullable=False, unique=True)
    clauses: Mapped[str] = mapped_column(Text, nullable=False) # JSON String
    risks: Mapped[str] = mapped_column(Text, nullable=False) # JSON String
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    improvements: Mapped[str] = mapped_column(Text, nullable=False) # JSON String
    created_at: Mapped[str] = mapped_column(DateTime, default=datetime.now)

class Chunk(Base):
    __tablename__ = 'Chunk'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chat_id: Mapped[int] = mapped_column(Integer, ForeignKey('Chat.id'), nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)
    page: Mapped[int] = mapped_column(Integer, nullable=True)
    embedding: Mapped[list] = mapped_column(Vector(384))  # MiniLM = 384 dims