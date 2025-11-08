# backend/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import Base
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@db:5432/mydb")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
