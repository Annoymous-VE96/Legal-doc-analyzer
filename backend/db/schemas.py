from pydantic import BaseModel, EmailStr

class Register(BaseModel):
    name : str
    email : EmailStr
    password : str

class Login(BaseModel):
    email : EmailStr
    password : str

class MessageCreate(BaseModel):
    content : str

class RenameChat(BaseModel):
    name : str
