"""
Pytest configuration and fixtures
"""
from database.models import User, Role, Permission, UserSetting, Asset, AssetType, CurrencyExchangeRate
from database.database import Base, get_db
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker, close_all_sessions
from sqlalchemy import create_engine, event, text
import pytest
from dotenv import load_dotenv
import sys
import os
from pathlib import Path

sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))

env_path = Path(__file__).parent.parent / '.env.test'
load_dotenv(dotenv_path=env_path, override=True)


@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine"""
    TEST_DATABASE_URL = os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/test_db")
    engine = create_engine(TEST_DATABASE_URL, echo=False, pool_pre_ping=True)

    Base.metadata.create_all(bind=engine)

    yield engine

    close_all_sessions()

    try:
        with engine.connect() as conn:
            conn.execute(text("""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = 'test_db'
                AND pid <> pg_backend_pid()
            """))
            conn.commit()
    except:
        pass

    engine.dispose()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session", autouse=True)
def seed_test_data(test_engine):
    """Seed roles that persist across tests"""
    SessionLocal = sessionmaker(bind=test_engine)
    db = SessionLocal()

    try:
        if not db.query(Role).filter(Role.name == "user").first():
            user_role = Role(name="user", description="Standard user")
            db.add(user_role)

        if not db.query(Role).filter(Role.name == "admin").first():
            admin_role = Role(name="admin", description="Admin user")
            db.add(admin_role)

        db.commit()
    except:
        db.rollback()
    finally:
        db.close()


@pytest.fixture(scope="function")
def test_db(test_engine):
    """Create test database session with transaction rollback"""
    connection = test_engine.connect()
    transaction = connection.begin()

    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=connection,
        expire_on_commit=False
    )

    session = TestingSessionLocal()
    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def end_savepoint(session, transaction):
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def app_instance():
    """Create FastAPI app instance"""
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from starlette.middleware.sessions import SessionMiddleware

    from routers.auth import router as auth_router
    from routers.assets import router as assets_router
    from routers.user_settings import router as user_settings_router
    from routers.statistics import router as statistics_router
    from routers.bank_history import router as bank_history_router

    app = FastAPI()

    SESSION_SECRET = os.getenv("SESSION_SECRET", "test_session_secret")
    app.add_middleware(SessionMiddleware,
                       secret_key=SESSION_SECRET, https_only=False)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router)
    app.include_router(assets_router)
    app.include_router(user_settings_router)
    app.include_router(statistics_router)
    app.include_router(bank_history_router)

    return app


@pytest.fixture(scope="function")
def client(test_db, app_instance):
    """Create test client"""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app_instance.dependency_overrides[get_db] = override_get_db

    with TestClient(app_instance) as test_client:
        yield test_client

    app_instance.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_user(test_db):
    """Create test user"""
    user_role = test_db.query(Role).filter(Role.name == "user").first()

    user = User(
        email="test@example.com",
        name="Test User",
        created_at=datetime.utcnow()
    )
    user.roles.append(user_role)
    test_db.add(user)
    test_db.flush()

    settings = UserSetting(
        user_id=user.id,
        currency="USD",
        salary_per_month=5000,
        salary_day=1
    )
    test_db.add(settings)
    test_db.commit()
    test_db.refresh(user)

    return user


@pytest.fixture(scope="function")
def auth_headers(test_user):
    """Create auth headers"""
    from jose import jwt

    token = jwt.encode({
        "sub": test_user.email,
        "name": test_user.name,
        "roles": ["user"],
        "permissions": ["read", "write"]
    }, "change_me", algorithm="HS256")

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def sample_asset(test_db, test_user):
    """Create sample asset"""
    asset = Asset(
        name="Test Stock",
        type=AssetType.STOCKS,
        symbol="TEST",
        mic_code="XNAS",
        currency="USD",
        purchase_price=100.0,
        current_price=110.0,
        purchase_date=datetime.utcnow(),
        quantity=10,
        user_id=test_user.id,
        exchange="NASDAQ"
    )
    test_db.add(asset)
    test_db.commit()
    test_db.refresh(asset)
    return asset


@pytest.fixture(scope="function")
def sample_savings_asset(test_db, test_user):
    """Create sample savings asset"""
    asset = Asset(
        name="Test Savings",
        type=AssetType.SAVINGS,
        currency="USD",
        purchase_price=5000.0,
        current_price=5000.0,
        purchase_date=datetime.utcnow(),
        quantity=1,
        user_id=test_user.id
    )
    test_db.add(asset)
    test_db.commit()
    test_db.refresh(asset)

    test_user.settings.primary_saving_asset_id = asset.id
    test_db.commit()

    return asset


@pytest.fixture(scope="function")
def currency_rates(test_db):
    """Create currency rates"""
    rates = [
        CurrencyExchangeRate(source_currency="USD", target_currency="EUR",
                             rate=0.92, fetched_at=datetime.utcnow()),
        CurrencyExchangeRate(source_currency="EUR", target_currency="USD",
                             rate=1.09, fetched_at=datetime.utcnow()),
        CurrencyExchangeRate(source_currency="USD", target_currency="PLN",
                             rate=4.0, fetched_at=datetime.utcnow()),
        CurrencyExchangeRate(source_currency="PLN", target_currency="USD",
                             rate=0.25, fetched_at=datetime.utcnow()),
    ]

    for rate in rates:
        test_db.add(rate)

    test_db.commit()
    return rates
