
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from currency.translate_currency import translate_currency
from database.database import get_db
from database.models import Asset, AssetType, Statistic, AssetPrice, User
from routers.auth import get_current_user

router = APIRouter(prefix="/statistics", tags=["statistics"])


class StatisticResponse(BaseModel):
    id: int
    user_id: int
    date: datetime
    total_portfolio_value: float
    portfolio_distribution: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/me", response_model=List[StatisticResponse])
def get_my_statistics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistics for the current user"""
    statistics = db.query(Statistic).filter(
        Statistic.user_id == user.id
    ).order_by(Statistic.date.asc()).all()

    user_currency = user.settings.currency
    for stat in statistics:
        if user_currency != "USD":
            stat.total_portfolio_value = translate_currency(
                "USD", user_currency, stat.total_portfolio_value)
            for asset_type, value in stat.portfolio_distribution.items():
                stat.portfolio_distribution[asset_type] = translate_currency(
                    "USD", user_currency, value)

    return statistics
