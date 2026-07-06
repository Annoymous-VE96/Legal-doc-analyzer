from supabase import create_client
import os

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
BUCKET = os.getenv("SUPABASE_BUCKET")

def upload_file(file_obj, key: str):
    supabase.storage.from_(BUCKET).upload(key, file_obj.read())

def delete_file(key: str):
    supabase.storage.from_(BUCKET).remove([key])

def get_public_url(key: str):
    return supabase.storage.from_(BUCKET).get_public_url(key)