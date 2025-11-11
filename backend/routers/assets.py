# backend/assets/assets.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database.database import get_db
from database.models import Asset, AssetStatus, AssetType, StockPrice, User
from routers.auth import get_current_user
from assets.stocks.price_manager import backfill_stock_prices
from assets.stocks.price_manager import get_stock_price_history

router = APIRouter(prefix="/assets", tags=["assets"])


class AssetCreate(BaseModel):
    name: str
    type: AssetType
    symbol: Optional[str] = None
    mic_code: Optional[str] = None  # ← MIC code
    purchase_price: float
    purchase_date: Optional[datetime] = None
    exchange: Optional[str] = None
    quantity: Optional[float] = 1.0


class AssetUpdate(BaseModel):
    name: str | None = None
    type: AssetType | None = None
    symbol: str | None = None
    mic_code: str | None = None  # ← MIC code
    purchase_price: float | None = None
    purchase_date: datetime | None = None
    exchange: str | None = None
    quantity: float | None = None


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
    status: AssetStatus

    class Config:
        from_attributes = True


class AssetCloseRequest(BaseModel):
    transfer_to_savings: bool = True

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AssetResponse])
def get_my_assets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all assets for current user"""
    assets = db.query(Asset).filter(Asset.user_id == user.id).all()
    # Attach current_price to each asset (if stock) from latest stock prices
    for asset in assets:
        if asset.type == AssetType.STOCKS and asset.symbol and asset.mic_code:
            latest_price = db.query(StockPrice).filter(
                StockPrice.symbol == asset.symbol,
                StockPrice.mic_code == asset.mic_code
            ).order_by(StockPrice.datetime.desc()).first()
            asset.current_price = latest_price.close if latest_price else None

            db.commit()
            db.refresh(asset)

    return assets


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
        exchange=asset_data.exchange or None,
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
    if asset_data.symbol is not None:
        asset.symbol = asset_data.symbol
    if asset_data.mic_code is not None:
        asset.mic_code = asset_data.mic_code
    if asset_data.purchase_price is not None:
        asset.purchase_price = asset_data.purchase_price
    if asset_data.purchase_date is not None:
        asset.purchase_date = asset_data.purchase_date
    if asset_data.quantity is not None:
        asset.quantity = asset_data.quantity
    if asset_data.exchange is not None:
        asset.exchange = asset_data.exchange

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


@router.post("/{asset_id}/close")
def close_asset(
    asset_id: int,
    request: AssetCloseRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Close an asset"""
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.user_id == user.id
    ).first()

    # Based on request.transfer_to_savings, implement logic to transfer value to savings
    if request.transfer_to_savings:
        primary_saving_asset_id = user.settings.primary_saving_asset_id
        if primary_saving_asset_id:
            savings_asset = db.query(Asset).filter(
                Asset.id == primary_saving_asset_id,
                Asset.user_id == user.id
            ).first()
            if savings_asset:
                savings_asset.purchase_price += (asset.current_price or asset.purchase_price) * \
                    (asset.quantity or 1)

    db.flush()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset.status = AssetStatus.CLOSED
    db.refresh(asset)
    db.commit()

    return {"message": "Asset closed successfully"}


@router.get("/stocks/search/{symbol}")
async def search_stocks_by_symbol(
    symbol: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for stocks by symbol
    Returns all exchanges that have this symbol with their MIC codes
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
                "mic_code": stock.mic_code,  # ← Include MIC code
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

    total_value = sum(asset.purchase_price * (asset.quantity or 1)
                      for asset in assets)
    total_cost = sum(asset.purchase_price * (asset.quantity or 1)
                     for asset in assets)
    total_gain_loss = 0  # TODO: Calculate based on current prices

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


@router.get("/prices/{symbol}/{mic_code}")
async def get_asset_price_history(
    symbol: str,
    mic_code: str,  # ← Use MIC code
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
        history = await get_stock_price_history(symbol, mic_code, start_date, end_date)
        return {
            "symbol": symbol,
            "mic_code": mic_code,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "data": history
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching price history: {str(e)}")
