# backend/assets/assets.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database.database import get_db
from database.models import Asset, AssetType, AssetPrice, User, UserSetting
from dependencies.auth_dependencies import get_current_user

router = APIRouter(prefix="/user_settings", tags=["user_settings"])


class UserSettingsUpdate(BaseModel):
    currency: Optional[str] = None
    primary_saving_asset_id: Optional[int] = None
    salary_per_month: Optional[int] = None
    salary_day: Optional[int] = None


class UserSettingsResponse(BaseModel):
    id: int
    user_id: int
    currency: str
    primary_saving_asset_id: Optional[int] = None
    salary_per_month: Optional[int] = None
    salary_day: Optional[int] = None

    class Config:
        from_attributes = True
        arbitrary_types_allowed = True


@router.get("/{user_id}", response_model=UserSettingsResponse)
def get_user_settings(
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user settings"""
    if user.id != user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access these settings")

    settings = db.query(UserSetting).filter(
        UserSetting.user_id == user_id).first()
    if not settings:
        raise HTTPException(status_code=404, detail="User settings not found")

    return settings


@router.put("/{user_id}", response_model=UserSettingsResponse)
def update_user_settings(
    user_id: int,
    settings_update: UserSettingsUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user settings"""
    if user.id != user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to update these settings")

    settings = db.query(UserSetting).filter(
        UserSetting.user_id == user_id).first()
    if not settings:
        raise HTTPException(status_code=404, detail="User settings not found")

    if settings_update.currency is not None:
        settings.currency = settings_update.currency
    if settings_update.primary_saving_asset_id is not None:
        settings.primary_saving_asset_id = settings_update.primary_saving_asset_id
    if settings_update.salary_per_month is not None:
        settings.salary_per_month = settings_update.salary_per_month
    if settings_update.salary_day is not None:
        settings.salary_day = settings_update.salary_day

    db.commit()
    db.refresh(settings)

    return settings
