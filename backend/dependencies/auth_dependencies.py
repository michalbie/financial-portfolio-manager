from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import os

from database.database import get_db
from database.models import User

APP_SECRET_KEY = os.getenv("APP_SECRET_KEY", "change_me")
APP_JWT_ALG = os.getenv("APP_JWT_ALG", "HS256")


def verify_access_token(token: str):
    try:
        payload = jwt.decode(token, APP_SECRET_KEY, algorithms=[APP_JWT_ALG])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get current user from JWT token"""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1]
    payload = verify_access_token(token)
    email = payload.get("sub")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
