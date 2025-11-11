# backend/models.py - CORRECTED VERSION
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table, Float, Enum, Date, Index
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
    settings = relationship("UserSetting", back_populates="users", uselist=False,
                            cascade="all, delete-orphan",
                            single_parent=True,)
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    assets = relationship("Asset", back_populates="owner",
                          cascade="all, delete-orphan")


class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(
        'users.id', ondelete='CASCADE'), unique=True, nullable=False)
    currency = Column(String, default="USD")
    primary_saving_asset_id = Column(Integer, ForeignKey(
        'assets.id', ondelete='SET NULL'), nullable=True)
    salary_per_month = Column(Integer, nullable=True)
    salary_day = Column(Integer, nullable=True, default=1)

    users = relationship("User", back_populates="settings")


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
    SAVINGS = "savings"
    OTHER = "other"


class AssetStatus(str, enum.Enum):
    ACTIVE = "active"
    CLOSED = "closed"


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    symbol = Column(String, nullable=True, index=True)
    exchange = Column(String, nullable=True, index=True)
    mic_code = Column(String, nullable=True, index=True)
    type = Column(Enum(AssetType), nullable=False)
    purchase_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=True)
    purchase_date = Column(DateTime, nullable=True)
    quantity = Column(Float, nullable=True)
    auto_update = Column(Integer, default=1)
    user_id = Column(Integer, ForeignKey(
        'users.id', ondelete='CASCADE'), nullable=False)
    status = Column(Enum(AssetStatus), default=AssetStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="assets")

    __table_args__ = (
        Index('idx_symbol_mic', 'symbol', 'mic_code'),
    )


# Stock list - (symbol, mic_code) uniquely identifies a stock
class Stock(Base):
    __tablename__ = "stocks"

    symbol = Column(String, primary_key=True)
    mic_code = Column(String, primary_key=True)  # Composite primary key
    exchange = Column(String, nullable=False, index=True)  # For display
    name = Column(String, nullable=False)
    country = Column(String, nullable=True, index=True)
    currency = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_symbol', 'symbol'),
        Index('idx_mic_code', 'mic_code'),
        Index('idx_country_exchange', 'country', 'exchange'),
    )


class StockPrice(Base):
    __tablename__ = "stock_prices"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, primary_key=True, nullable=False, index=True)
    mic_code = Column(String, primary_key=True, nullable=False, index=True)
    datetime = Column(DateTime, primary_key=True, nullable=False, index=True)
    interval = Column(String, primary_key=True, nullable=False,
                      index=True)  # "1hour", "1day"

    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Integer, nullable=True)

    __table_args__ = (
        Index('idx_unique_price', 'symbol', 'mic_code',
              'datetime', 'interval', unique=True),
        Index('idx_symbol_interval_datetime',
              'symbol', 'interval', 'datetime'),
        Index('idx_interval_datetime', 'interval',
              'datetime'),  # For cleanup queries
    )


class Statistic(Base):
    __tablename__ = "statistics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(
        'users.id', ondelete='CASCADE'), nullable=False)
    date = Column(Date, nullable=False, index=True)
    total_portfolio_value = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_user_date', 'user_id', 'date', unique=True),
    )
