import hashlib
from fastapi import Request

def get_user_hash(request: Request) -> str:
    token = request.headers.get("Authorization", "")
    return hashlib.sha256(token.encode()).hexdigest()