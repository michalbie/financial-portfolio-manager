from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth, OAuthError
from jose import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
import os

router = APIRouter()

# -----------------------
# CONFIG
# -----------------------
SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# -----------------------
# OAUTH SETUP
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
# MODELS
# -----------------------


class Token(BaseModel):
    access_token: str
    token_type: str


def create_access_token(data: dict, expires_delta=None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# -----------------------
# ROUTES
# -----------------------


@router.get("/login")
async def login_via_google(request: Request):
    redirect_uri = request.url_for("auth_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def auth_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo")
        if user_info is None:
            raise HTTPException(
                status_code=400, detail="Google authentication failed")
    except OAuthError:
        raise HTTPException(
            status_code=400, detail="OAuth authentication failed")

    # Example user object from Google
    user_email = user_info["email"]
    user_name = user_info["name"]

    # Create JWT for your app
    jwt_token = create_access_token({"sub": user_email, "name": user_name})

    # Redirect frontend with JWT token in query param
    redirect_url = f"{FRONTEND_URL}/auth/callback?token={jwt_token}"
    return RedirectResponse(url=redirect_url)
