# backend/assets/assets.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from database.database import get_db
from database.models import Asset, AssetType, User
from auth import get_current_user
from assets.price_manager import backfill_stock_prices  # ← NEW
from assets.price_manager import get_stock_price_history

router = APIRouter(prefix="/assets", tags=["assets"])


# backend/assets/assets.py

class AssetCreate(BaseModel):
    name: str
    type: AssetType
    symbol: Optional[str] = None
    exchange: Optional[str] = None  # ← NEW
    purchase_price: float
    purchase_date: Optional[datetime] = None
    quantity: Optional[float] = 1.0


class AssetUpdate(BaseModel):
    name: str | None = None
    type: AssetType | None = None
    symbol: str | None = None
    exchange: str | None = None  # ← NEW
    purchase_price: float | None = None
    purchase_date: datetime | None = None
    quantity: float | None = None


class AssetResponse(BaseModel):
    id: int
    name: str
    type: AssetType
    symbol: Optional[str]
    exchange: Optional[str]  # ← NEW
    purchase_price: float
    purchase_date: Optional[datetime]
    quantity: Optional[float]
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("/", response_model=AssetResponse)
async def create_asset(
    asset_data: AssetCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new asset"""

    # Validate stock symbol and exchange for stocks
    if asset_data.type == AssetType.STOCKS:
        if not asset_data.symbol:
            raise HTTPException(
                status_code=400, detail="Symbol is required for stock assets")
        if not asset_data.exchange:
            raise HTTPException(
                status_code=400, detail="Exchange is required for stock assets")

    # Create asset
    asset = Asset(
        name=asset_data.name,
        type=asset_data.type,
        symbol=asset_data.symbol,
        exchange=asset_data.exchange,
        purchase_price=asset_data.purchase_price,
        purchase_date=asset_data.purchase_date or datetime.utcnow(),
        quantity=asset_data.quantity or 1.0,
        user_id=user.id
    )

    db.add(asset)
    db.commit()
    db.refresh(asset)

    # If it's a stock, backfill historical prices
    if asset.type == AssetType.STOCKS and asset.symbol and asset.purchase_date:
        try:
            await backfill_stock_prices(asset.symbol, asset.purchase_date)
        except Exception as e:
            print(
                f"⚠️ Warning: Could not backfill prices for {asset.symbol}: {e}")

    return asset


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: int,
    asset_data: AssetUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing asset"""
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.user_id == user.id
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Update only provided fields
    if asset_data.name is not None:
        asset.name = asset_data.name
    if asset_data.type is not None:
        asset.type = asset_data.type
    if asset_data.value is not None:
        asset.value = asset_data.value
    if asset_data.purchase_price is not None:
        asset.purchase_price = asset_data.purchase_price

    db.commit()
    db.refresh(asset)

    return asset


@router.delete("/{asset_id}")
def delete_asset(
    asset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an asset"""
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.user_id == user.id
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    db.delete(asset)
    db.commit()

    return {"message": "Asset deleted successfully"}


@router.get("/stocks/search/{symbol}")
async def search_stocks_by_symbol(
    symbol: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for stocks by symbol
    Returns all exchanges that have this symbol
    """
    from database.models import Stock

    stocks = db.query(Stock).filter(Stock.symbol == symbol).all()

    if not stocks:
        raise HTTPException(
            status_code=404, detail=f"No stocks found with symbol {symbol}")

    return {
        "symbol": symbol,
        "matches": [
            {
                "symbol": stock.symbol,
                "name": stock.name,
                "exchange": stock.exchange,
                "country": stock.country,
                "currency": stock.currency
            }
            for stock in stocks
        ]
    }


@router.get("/stats/summary")
def get_portfolio_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get portfolio summary statistics"""
    assets = db.query(Asset).filter(Asset.user_id == user.id).all()

    total_value = sum(asset.value for asset in assets)
    total_cost = sum(asset.purchase_price for asset in assets)
    total_gain_loss = total_value - total_cost

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
        by_type[asset_type]["total_value"] += asset.value
        by_type[asset_type]["total_cost"] += asset.purchase_price

    return {
        "total_net_worth": total_value,
        "total_invested": total_cost,
        "total_gain_loss": total_gain_loss,
        "gain_loss_percentage": (total_gain_loss / total_cost * 100) if total_cost > 0 else 0,
        "asset_count": len(assets),
        "by_type": by_type
    }


@router.get("/prices/{symbol}/{exchange}")
async def get_asset_price_history(
    symbol: str,
    exchange: str,  # ← NEW parameter
    start_date: datetime = None,
    end_date: datetime = None,
    user: User = Depends(get_current_user)
):
    """Get price history for a stock asset"""

    # Default to last 30 days if not specified
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    try:
        history = await get_stock_price_history(symbol, exchange, start_date, end_date)
        return {
            "symbol": symbol,
            "exchange": exchange,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "data": history
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching price history: {str(e)}")
