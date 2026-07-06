import boto3
import os
from botocore.client import Config

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{os.getenv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
    config=Config(signature_version="s3v4"),
)
BUCKET = os.getenv("R2_BUCKET_NAME")

def upload_file(file_obj, key: str):
    s3.upload_fileobj(file_obj, BUCKET, key)

def get_signed_url(key: str, expires_in=3600):
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET, "Key": key},
        ExpiresIn=expires_in,
    )