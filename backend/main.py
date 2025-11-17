from dotenv import load_dotenv

load_dotenv()  # noqa

from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
import os

from routers.auth import router as auth_router
from routers.admin import router as admin_router
from routers.assets import router as assets_router
from routers.user_settings import router as user_settings_router
from routers.statistics import router as statistics_router
from database.database import init_db, seed_default_data
from scheduler.scheduler import initialize_scheduler

app = FastAPI()


# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    print("🚀 Initializing database...")
    init_db()
    seed_default_data()
    await initialize_scheduler()
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
app.include_router(assets_router)
app.include_router(user_settings_router)
app.include_router(statistics_router)


@app.get("/")
def root():
    return {"message": "API running with database-backed roles and assets!"}
