from dotenv import load_dotenv
load_dotenv()  # noqa

from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
import os
from auth import router as auth_router


app = FastAPI()

# Sessions are required for OAuth (Authlib stores state/nonce in session)
SESSION_SECRET = os.getenv("SESSION_SECRET", "change_session_secret")
app.add_middleware(SessionMiddleware,
                   secret_key=SESSION_SECRET, https_only=False)

# CORS
origins = (os.getenv("CORS_ORIGINS", "http://localhost:5173")).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)


@app.get("/")
def root():
    return {"message": "API running"}
