# backend/database/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import Base
import os

# Sync engine (for existing code)
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@db:5432/mydb")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Async engine (for async operations)
ASYNC_DATABASE_URL = DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://")
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


def get_db():
    """Dependency to get sync database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db():
    """Dependency to get async database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


def seed_default_data():
    """Seed default roles and permissions"""
    from database.models import Role, Permission

    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Permission).first():
            return

        # Create default permissions
        permissions_data = [
            {"name": "read", "description": "Can view content"},
            {"name": "write", "description": "Can create and edit content"},
            {"name": "delete", "description": "Can delete content"},
            {"name": "manage_users", "description": "Can manage user roles"},
        ]

        permissions = []
        for perm_data in permissions_data:
            perm = Permission(**perm_data)
            db.add(perm)
            permissions.append(perm)

        db.flush()  # Get IDs

        # Create default roles
        admin_role = Role(
            name="admin",
            description="Full access to all features"
        )
        admin_role.permissions = permissions  # All permissions

        user_role = Role(
            name="user",
            description="Standard user access"
        )
        user_role.permissions = [
            p for p in permissions if p.name in ["read", "write"]]

        guest_role = Role(
            name="guest",
            description="Read-only access"
        )
        guest_role.permissions = [p for p in permissions if p.name == "read"]

        db.add(admin_role)
        db.add(user_role)
        db.add(guest_role)

        db.commit()
        print("✅ Default roles and permissions seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding data: {e}")
    finally:
        db.close()
