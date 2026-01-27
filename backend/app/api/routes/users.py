from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.crud.user import delete_user, get_user_by_email, get_user_by_username, update_user
from app.db.session import get_db
from app.schemas.user import UserResponse, UserUpdate


router = APIRouter()


@router.get("/me", response_model=UserResponse)
def read_me(current_user=Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if user_in.email and user_in.email != current_user.email:
        if get_user_by_email(db, user_in.email):
            raise HTTPException(status_code=400, detail="Email already registered")
    if user_in.username and user_in.username != current_user.username:
        if get_user_by_username(db, user_in.username):
            raise HTTPException(status_code=400, detail="Username already taken")
    return update_user(db, current_user, user_in)


@router.delete("/me", status_code=204)
def delete_me(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    delete_user(db, current_user)
    return None

