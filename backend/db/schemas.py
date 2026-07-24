from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import List
from enum import Enum

class Register(BaseModel):
    name : str
    email : EmailStr
    password : str

class Login(BaseModel):
    email : EmailStr
    password : str

class NewChat(BaseModel):
    id: int 
    user_id: int
    name: str
    pdf_path: str 
    page_offset: int
    created_at: datetime
    pinned: bool = False

class MessageCreate(BaseModel):
    content : str

class RenameChat(BaseModel):
    name : str

class Clause(BaseModel):
    title: str
    text: str

class Severity(str, Enum):
    H = 'High'
    M = 'Medium'
    L = 'Low'
    
class Risk(BaseModel):
    clause: str
    reason: str
    severity: Severity

class AnalysisResult(BaseModel):
    clauses: List[Clause]
    risks: List[Risk]
    summary: str
    improvements: List[str]

    @field_validator('improvements', mode='before')
    @classmethod
    def split_improvements(cls, v):
        if isinstance(v, str):
            import re
            items = re.split(r'\n?\d+\.\s*', v)
            return [i.strip() for i in items if i.strip()]
        return v

class AnalysisResponse(BaseModel):
    chat_id: int
    clauses: List[Clause]
    risks: List[Risk]
    summary: str
    improvements: List[str]


