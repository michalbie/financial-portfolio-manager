"""
Assets updater module to update assets current prices
"""
import os
# from dotenv import load_dotenv
# load_dotenv()  # noqa

from fastapi import Depends
import requests
import asyncio
from datetime import datetime
import httpx
from sqlalchemy.orm import Session
from typing import List, Dict
from sqlalchemy import select, text

from database.database import AsyncSessionLocal, SessionLocal, get_async_db
from database.models import Asset, AssetType, AssetPrice
from assets.stocks.stock_updater import update_stock_prices


async def update_assets_prices() -> None:
    """Update current prices for all assets for all users using update_user_assets_prices on each user"""

    async with AsyncSessionLocal() as async_db:
        result = await async_db.execute(
            select(Asset.user_id).distinct()
        )
        user_ids = [row[0] for row in result.fetchall()]

    # Update assets prices for each user concurrently
    await asyncio.gather(*[
        update_user_assets_prices(user_id)
        for user_id in user_ids
    ])

    print("Assets prices updated.")


async def update_user_assets_prices(user_id: int) -> None:
    """Update current prices for all assets"""

    async with AsyncSessionLocal() as async_db:
        result = await async_db.execute(
            select(Asset).where(
                Asset.user_id == user_id,
                Asset.status == 'ACTIVE'
            )
        )
        assets = result.scalars().all()
        stocks = [asset for asset in assets if asset.type == AssetType.STOCKS]

        await update_stock_prices(async_db, stocks)

        return assets
