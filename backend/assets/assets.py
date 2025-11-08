# backend/assets.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from datetime import datetime

from database.database import get_db
from database.models import Asset, AssetType, User
from auth import get_current_user

router = APIRouter(prefix="/assets", tags=["assets"])


# -----------------------
# Pydantic Models
# -----------------------

class AssetCreate(BaseModel):
    name: str
    type: AssetType
    value: float
    purchase_price: float


class AssetUpdate(BaseModel):
    name: str | None = None
    type: AssetType | None = None
    value: float | None = None
    purchase_price: float | None = None


class AssetResponse(BaseModel):
    id: int
    name: str
    type: AssetType
    value: float
    purchase_price: float
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# -----------------------
# CRUD Endpoints
# -----------------------

@router.get("/", response_model=List[AssetResponse])
def get_my_assets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all assets for the current user"""
    assets = db.query(Asset).filter(Asset.user_id == user.id).all()
    return assets


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific asset by ID"""
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.user_id == user.id
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    return asset


@router.post("/", response_model=AssetResponse)
def create_asset(
    asset_data: AssetCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new asset"""
    asset = Asset(
        name=asset_data.name,
        type=asset_data.type,
        value=asset_data.value,
        purchase_price=asset_data.purchase_price,
        user_id=user.id
    )

    db.add(asset)
    db.commit()
    db.refresh(asset)

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
