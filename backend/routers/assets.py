# backend/assets/assets.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database.database import get_db
from database.models import Asset, AssetStatus, AssetType, AssetPrice, Statistic, User
from routers.auth import get_current_user
from assets.asset_price_historian import backfill_asset_prices
from assets.asset_price_historian import get_asset_price_history
from assets.assets_updater import update_user_assets_prices
from statistics.portfolio_value_updater import update_user_portfolio_value
from currency.translate_currency import translate_currency

router = APIRouter(prefix="/assets", tags=["assets"])


class AssetCreate(BaseModel):
    name: str
    type: AssetType
    symbol: Optional[str] = None
    mic_code: Optional[str] = None  # ← MIC code
    currency: Optional[str] = None
    purchase_price: float
    purchase_date: Optional[datetime] = None
    exchange: Optional[str] = None
    quantity: Optional[float] = 1.0
    deduct_from_savings: bool = False


class AssetUpdate(BaseModel):
    name: str | None = None
    type: AssetType | None = None
    symbol: str | None = None
    mic_code: str | None = None  # ← MIC code
    currency: str | None = None
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
    currency: Optional[str]
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
async def get_my_assets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all assets for current user"""
    assets = await update_user_assets_prices(user.id)
    await update_user_portfolio_value(user.id)

    return assets


@router.post("/", response_model=AssetResponse)
async def create_asset(
    asset_data: AssetCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new asset"""

    # If asset_data.deduct_from_savings is True, deduct amount from user's savings asset
    if asset_data.type != AssetType.SAVINGS and asset_data.deduct_from_savings:
        primary_saving_asset_id = user.settings.primary_saving_asset_id
        if primary_saving_asset_id:
            savings_asset = db.query(Asset).filter(
                Asset.id == primary_saving_asset_id,
                Asset.user_id == user.id
            ).first()
            if savings_asset:
                total_cost = asset_data.purchase_price * \
                    (asset_data.quantity or 1)

                if asset_data.currency and savings_asset.currency and asset_data.currency != savings_asset.currency:
                    total_cost = translate_currency(
                        asset_data.currency, savings_asset.currency, total_cost)

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
        currency=asset_data.currency,
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
            await backfill_asset_prices(asset.symbol, asset.mic_code, asset.exchange, asset.purchase_date)
        except Exception as e:
            print(
                f"⚠️ Warning: Could not backfill prices for {asset.symbol} (MIC: {asset.mic_code}): {e}")

    # Update asset prices and portfolio value
    await update_user_assets_prices(user.id)
    await update_user_portfolio_value(user.id)

    return asset


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
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
    if asset_data.currency is not None:
        asset.currency = asset_data.currency
    if asset_data.purchase_date is not None:
        asset.purchase_date = asset_data.purchase_date
    if asset_data.quantity is not None:
        asset.quantity = asset_data.quantity
    if asset_data.exchange is not None:
        asset.exchange = asset_data.exchange

    db.commit()
    db.refresh(asset)

    await update_user_assets_prices(user.id)
    await update_user_portfolio_value(user.id)

    return asset


@router.delete("/{asset_id}")
async def delete_asset(
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

    await update_user_assets_prices(user.id)
    await update_user_portfolio_value(user.id)

    return {"message": "Asset deleted successfully"}


@router.post("/{asset_id}/close")
async def close_asset(
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
                # Ensure asset exists before transferring
                if not asset:
                    raise HTTPException(
                        status_code=404, detail="Asset not found")

                unit_price = asset.current_price if asset.current_price is not None else (
                    asset.purchase_price or 0.0)
                quantity = asset.quantity or 0.0
                gross_value = unit_price * quantity

                # Translate currency if needed
                try:
                    if asset.currency and savings_asset.currency and asset.currency != savings_asset.currency:
                        transferred_amount = translate_currency(
                            asset.currency, savings_asset.currency, gross_value)
                    else:
                        transferred_amount = gross_value
                except Exception as e:
                    raise HTTPException(
                        status_code=500, detail=f"Currency translation failed: {e}")

                # Apply transfer to savings (ensure numeric)
                savings_asset.purchase_price = (
                    savings_asset.purchase_price or 0.0) + transferred_amount

    db.flush()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset.status = AssetStatus.CLOSED
    db.commit()

    await update_user_assets_prices(user.id)
    await update_user_portfolio_value(user.id)

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
    from database.models import AssetList

    stocks = db.query(AssetList).filter(AssetList.symbol == symbol).all()

    if not stocks:
        return {"symbol": symbol, "matches": []}

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


@router.get("/prices/{symbol}/{mic_code}")
async def get_asset_price_time_series(
    symbol: str,
    mic_code: str,  # ← Use MIC code
    exchange: str,
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
        history = await get_asset_price_history(symbol, mic_code, exchange, start_date, end_date)
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
