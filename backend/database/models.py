# backend/models.py - UPDATED ASSET MODEL
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table, Float, Enum, Date, Index
from sqlalchemy import Column, Index, Integer, String, DateTime, ForeignKey, Table, Float, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

# Many-to-many relationship table for users and roles
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE')),
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'))
)

# Many-to-many relationship table for roles and permissions
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE')),
    Column('permission_id', Integer, ForeignKey(
        'permissions.id', ondelete='CASCADE'))
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    # Relationships
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    assets = relationship("Asset", back_populates="owner",
                          cascade="all, delete-orphan")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship(
        "Permission", secondary=role_permissions, back_populates="roles")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    roles = relationship("Role", secondary=role_permissions,
                         back_populates="permissions")


class AssetType(str, enum.Enum):
    STOCKS = "stocks"
    BONDS = "bonds"
    CRYPTO = "crypto"
    REAL_ESTATE = "real-estate"
    CASH = "cash"
    OTHER = "other"


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    symbol = Column(String, nullable=True, index=True)
    # ← NEW: Store exchange with asset
    mic_code = Column(String, nullable=True, index=True)
    exchange = Column(String, nullable=True, index=True)
    type = Column(Enum(AssetType), nullable=False)
    purchase_price = Column(Float, nullable=False)
    purchase_date = Column(DateTime, nullable=True)
    quantity = Column(Float, nullable=True)
    auto_update = Column(Integer, default=1)
    user_id = Column(Integer, ForeignKey(
        'users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="assets")

    __table_args__ = (
        Index('idx_symbol_exchange', 'symbol', 'exchange'),
    )


# Stock list
class Stock(Base):
    __tablename__ = "stocks"

    symbol = Column(String, primary_key=True)
    exchange = Column(String, primary_key=True)
    mic_code = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=True, index=True)
    currency = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_country_exchange', 'country', 'exchange'),
    )


class StockPrice(Base):
    __tablename__ = "stock_prices"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=False, index=True)
    exchange = Column(String, nullable=False, index=True)
    mic_code = Column(String, nullable=False, index=True)
    datetime = Column(DateTime, nullable=False, index=True)
    interval = Column(String, nullable=False, index=True)  # "1hour", "1day"

    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Integer, nullable=True)

    __table_args__ = (
        Index('idx_unique_price', 'symbol', 'exchange',
              'datetime', 'interval', unique=True),
        Index('idx_symbol_interval_datetime',
              'symbol', 'interval', 'datetime'),
        Index('idx_interval_datetime', 'interval',
              'datetime'),  # For cleanup queries
    )
