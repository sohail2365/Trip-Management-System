from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import User
from app.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    # DEV_MODE: token check skip, pehla user return karo
    if settings.DEV_MODE:
        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(500, "DEV_MODE mein koi user nahi hai. Pehle admin banao.")
        return user

    # Normal mode: token check
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing")
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except (ValueError, KeyError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid ya expired token")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User nahi mila")
    return user


def require_role(*roles: str):
    async def checker(user: User = Depends(current_user)) -> User:
        if settings.DEV_MODE:
            return user  # DEV mode mein role check skip
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Forbidden")
        return user
    return checker