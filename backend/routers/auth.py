# backend/auth.py
from fastapi import APIRouter, Request, HTTPException, Depends, Header
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth, OAuthError
from jose import jwt, JWTError
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
import os

from database.database import get_db
from database.models import User, Role

router = APIRouter(prefix="/auth", tags=["auth"])

# -----------------------
# ENV / CONFIG
# -----------------------
APP_SECRET_KEY = os.getenv("APP_SECRET_KEY", "change_me")
APP_JWT_ALG = os.getenv("APP_JWT_ALG", "HS256")
APP_JWT_EXPIRE_MIN = int(os.getenv("APP_JWT_EXPIRE_MIN", "60"))

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
    raise RuntimeError("Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in env.")

# -----------------------
# OAuth setup (Authlib)
# -----------------------
oauth = OAuth()
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# -----------------------
# JWT helpers
# -----------------------


def create_access_token(data: dict, expires_minutes: int = APP_JWT_EXPIRE_MIN):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, APP_SECRET_KEY, algorithm=APP_JWT_ALG)


def verify_access_token(token: str):
    try:
        payload = jwt.decode(token, APP_SECRET_KEY, algorithms=[APP_JWT_ALG])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# -----------------------
# Database helpers
# -----------------------


def get_or_create_user(db: Session, email: str, name: str) -> User:
    """Get user from DB or create if doesn't exist"""
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Create new user with default 'user' role
        user = User(email=email, name=name)

        # Assign default 'user' role
        default_role = db.query(Role).filter(Role.name == "user").first()
        if default_role:
            user.roles.append(default_role)

        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def get_user_permissions(user: User) -> List[str]:
    """Get all permissions for a user based on their roles"""
    permissions = set()
    for role in user.roles:
        for permission in role.permissions:
            permissions.add(permission.name)
    return list(permissions)


def get_user_roles(user: User) -> List[str]:
    """Get all role names for a user"""
    return [role.name for role in user.roles]


# -----------------------
# Role-based access control
# -----------------------


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get current user from JWT token"""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    payload = verify_access_token(token)

    # Get user from database
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


def require_permission(permission: str):
    """Dependency to require a specific permission"""
    def permission_checker(user: User = Depends(get_current_user)):
        user_permissions = get_user_permissions(user)
        if permission not in user_permissions:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied. Required permission: {permission}"
            )
        return user
    return permission_checker


def require_role(role_name: str):
    """Dependency to require a specific role"""
    def role_checker(user: User = Depends(get_current_user)):
        user_roles = get_user_roles(user)
        if role_name not in user_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role: {role_name}"
            )
        return user
    return role_checker


# -----------------------
# ROUTES
# -----------------------


@router.get("/login/google")
async def login_google(request: Request):
    """Redirect user to Google's consent screen"""
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback/google", name="google_callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle callback from Google"""
    try:
        token = await oauth.google.authorize_access_token(request)
        userinfo = token.get("userinfo")
        if not userinfo:
            raise HTTPException(
                status_code=400, detail="No user info from provider")
    except OAuthError as e:
        raise HTTPException(
            status_code=400, detail=f"OAuth error: {e.error}") from e

    # Get or create user in database
    user_email = userinfo["email"]
    user_name = userinfo.get("name", user_email.split("@")[0])

    user = get_or_create_user(db, user_email, user_name)

    # Get user's roles and permissions
    user_roles = get_user_roles(user)
    user_permissions = get_user_permissions(user)

    # Create JWT token with role information
    app_token = create_access_token({
        "sub": user_email,
        "name": user_name,
        "roles": user_roles,
        "permissions": user_permissions
    })

    # Redirect back to frontend with token
    redirect_url = f"{FRONTEND_URL}/auth/callback?token={app_token}"
    return RedirectResponse(url=redirect_url)


class MeOut(BaseModel):
    email: str
    name: str
    roles: List[str]
    permissions: List[str]


@router.get("/me", response_model=MeOut)
def get_me(user: User = Depends(get_current_user)):
    """Get current user info"""
    return MeOut(
        email=user.email,
        name=user.name,
        roles=get_user_roles(user),
        permissions=get_user_permissions(user)
    )
