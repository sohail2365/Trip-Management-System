from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config import settings

# Bcrypt hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
JWT_SECRET = settings.JWT_SECRET if hasattr(settings, "JWT_SECRET") else "change-me-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24  # 24 hours


def hash_password(password: str) -> str:
    """Plain password ko hash mein convert karo."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Plain password hash se match karta hai?"""
    return pwd_context.verify(plain, hashed)


def create_token(user_id: int, role: str) -> str:
    """JWT token banao."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Token decode karo. Invalid hone par ValueError."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")