from dotenv import load_dotenv
load_dotenv()  # noqa

from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
import os

from auth import router as auth_router
from admin import router as admin_router
from database import init_db, seed_default_data

app = FastAPI()

# Initialize database on startup


@app.on_event("startup")
def startup_event():
    print("🚀 Initializing database...")
    init_db()
    seed_default_data()
    print("✅ Database ready!")


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
app.include_router(admin_router)


@app.get("/")
def root():
    return {"message": "API running with database-backed roles!"}
