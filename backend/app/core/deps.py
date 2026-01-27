from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.crud.user import get_user_by_email


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = _decode_token(token)
        sub: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if sub is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user_by_email(db, sub)
    if user is None:
        raise credentials_exception
    return user

