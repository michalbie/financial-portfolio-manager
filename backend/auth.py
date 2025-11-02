# backend/auth.py
from sqlalchemy.orm import Session
from fastapi import APIRouter, Request, HTTPException, Depends, Header
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth, OAuthError
from jose import jwt, JWTError
from datetime import datetime, timedelta
from pydantic import BaseModel
import os


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
# ROUTES
# -----------------------


@router.get("/login/google")
async def login_google(request: Request):
    # Redirect user to Google's consent screen
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback/google", name="google_callback")
async def google_callback(request: Request):
    # Handle callback from Google
    try:
        token = await oauth.google.authorize_access_token(request)
        userinfo = token.get("userinfo")
        if not userinfo:
            raise HTTPException(
                status_code=400, detail="No user info from provider")
    except OAuthError as e:
        raise HTTPException(
            status_code=400, detail=f"OAuth error: {e.error}") from e

    # Minimal "user record" derived from Google profile
    user_email = userinfo["email"]
    user_name = userinfo.get("name", user_email.split("@")[0])

    # Create your app's JWT
    app_token = create_access_token({"sub": user_email, "name": user_name})

    # Redirect back to frontend with token in query string
    redirect_url = f"{FRONTEND_URL}/auth/callback?token={app_token}"
    return RedirectResponse(url=redirect_url)


class MeOut(BaseModel):
    email: str
    name: str


@router.get("/me", response_model=MeOut)
def get_me(authorization: str = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    payload = verify_access_token(token)
    return MeOut(email=payload.get("sub"), name=payload.get("name"))
