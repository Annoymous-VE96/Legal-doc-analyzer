import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
BUCKET = os.getenv("SUPABASE_BUCKET", "documents")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_public_url(key: str) -> str:
    return supabase.storage.from_(BUCKET).get_public_url(key)


def upload_file(file_bytes: bytes, key: str) -> str:
    """Upload raw bytes to bucket at key = 'user_id/filename.pdf'."""
    supabase.storage.from_(BUCKET).upload(key, file_bytes, {"upsert": "true"})
    return key


def download_file(key: str, local_path: str) -> str:
    """Pull file from bucket to a local temp path (PyPDFLoader needs a real file)."""
    data = supabase.storage.from_(BUCKET).download(key)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    with open(local_path, "wb") as f:
        f.write(data)
    return local_path


def rename_file(old_key: str, new_key: str) -> None:
    """Rename/move a file within the bucket."""
    supabase.storage.from_(BUCKET).move(old_key, new_key)


def delete_file(key: str) -> None:
    supabase.storage.from_(BUCKET).remove([key])


def delete_folder(prefix: str) -> None:
    """Delete all files under a user_id/ folder."""
    files = supabase.storage.from_(BUCKET).list(prefix)
    keys = [f"{prefix}/{f['name']}" for f in files]
    if keys:
        supabase.storage.from_(BUCKET).remove(keys)