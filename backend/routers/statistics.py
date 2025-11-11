# backend/assets/assets.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database.database import get_db
from database.models import Asset, AssetType, Statistic, StockPrice, User
from routers.auth import get_current_user
from assets.stocks.price_manager import backfill_stock_prices
from assets.stocks.price_manager import get_stock_price_history

router = APIRouter(prefix="/statistics", tags=["statistics"])


class AssetCreate(BaseModel):
    name: str
    type: AssetType
    symbol: Optional[str] = None
    mic_code: Optional[str] = None  # ← MIC code
    purchase_price: float
    purchase_date: Optional[datetime] = None
    quantity: Optional[float] = 1.0


class AssetResponse(BaseModel):
    id: int
    name: str
    type: AssetType
    symbol: Optional[str]
    mic_code: Optional[str]  # ← MIC code
    current_price: Optional[float] = None
    purchase_price: float
    purchase_date: Optional[datetime]
    quantity: Optional[float]
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AssetResponse])
def get_my_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get portfolio history statistics"""
    history = db.query(Statistic).filter(Statistic.user_id == user.id).all()
    return history


@router.post("/", response_model=AssetResponse)
async def create_asset(
    asset_data: AssetCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new asset"""

    # If asset_data.deduct_from_savings is True, deduct amount from user's savings asset
    if asset_data.type != AssetType.SAVINGS:
        primary_saving_asset_id = user.settings.primary_saving_asset_id
        if primary_saving_asset_id:
            savings_asset = db.query(Asset).filter(
                Asset.id == primary_saving_asset_id,
                Asset.user_id == user.id
            ).first()
            if savings_asset:
                total_cost = asset_data.purchase_price * \
                    (asset_data.quantity or 1)
                if savings_asset.purchase_price >= total_cost:
                    savings_asset.purchase_price -= total_cost
                else:
                    raise HTTPException(
                        status_code=400, detail="Insufficient funds in savings asset")
    db.flush()

    # Validate stock symbol and MIC code for stocks
    if asset_data.type == AssetType.STOCKS:
        if not asset_data.symbol:
            raise HTTPException(
                status_code=400, detail="Symbol is required for stock assets")
        if not asset_data.mic_code:
            raise HTTPException(
                status_code=400, detail="MIC code is required for stock assets")

    # Create asset
    asset = Asset(
        name=asset_data.name,
        type=asset_data.type,
        symbol=asset_data.symbol,
        mic_code=asset_data.mic_code,
        purchase_price=asset_data.purchase_price,
        purchase_date=asset_data.purchase_date or datetime.utcnow(),
        quantity=asset_data.quantity or 1.0,
        user_id=user.id
    )

    db.add(asset)
    db.commit()
    db.refresh(asset)

    # If it's a stock, backfill historical prices
    if asset.type == AssetType.STOCKS and asset.symbol and asset.mic_code and asset.purchase_date:
        try:
            await backfill_stock_prices(asset.symbol, asset.mic_code, asset.purchase_date)
        except Exception as e:
            print(
                f"⚠️ Warning: Could not backfill prices for {asset.symbol} (MIC: {asset.mic_code}): {e}")

    return asset


@router.get("/stats/summary")
def get_portfolio_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get portfolio summary statistics"""
    assets = db.query(Asset).filter(Asset.user_id == user.id).all()

    total_value = sum(asset.purchase_price * (asset.quantity or 1)
                      for asset in assets)
    total_cost = sum(asset.purchase_price * (asset.quantity or 1)
                     for asset in assets)
    total_gain_loss = 0

    # Group by type
    by_type = {}
    for asset in assets:
        asset_type = asset.type.value
        if asset_type not in by_type:
            by_type[asset_type] = {
                "count": 0,
                "total_value": 0,
                "total_cost": 0
            }
        by_type[asset_type]["count"] += 1
        by_type[asset_type]["total_value"] += asset.purchase_price * \
            (asset.quantity or 1)
        by_type[asset_type]["total_cost"] += asset.purchase_price * \
            (asset.quantity or 1)

    return {
        "total_net_worth": total_value,
        "total_invested": total_cost,
        "total_gain_loss": total_gain_loss,
        "gain_loss_percentage": (total_gain_loss / total_cost * 100) if total_cost > 0 else 0,
        "asset_count": len(assets),
        "by_type": by_type
    }
