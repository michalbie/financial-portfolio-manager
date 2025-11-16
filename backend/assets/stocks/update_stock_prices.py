"""
Stock updater module to update stock assets current prices
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
from sqlalchemy.ext.asyncio import AsyncSession

from database.database import AsyncSessionLocal, SessionLocal, get_async_db
from database.models import Asset, AssetType, AssetPrice


async def update_stock_prices(async_db: AsyncSession, assets: List[Asset]) -> None:
    """Update current prices for all stock assets with auto_update enabled"""

    # Update prices concurrently with stock_prices table
    for asset in assets:
        latest_price = await async_db.execute(
            select(AssetPrice)
            .where(AssetPrice.symbol == asset.symbol)
            .where(AssetPrice.mic_code == asset.mic_code)
            .order_by(AssetPrice.datetime.desc())
            .limit(1)
        )

        latest_price_record = latest_price.scalars().first()

        if latest_price_record:
            print(
                f"Updating asset {asset.symbol} ({asset.mic_code}) price to {latest_price_record.close}")
            asset.current_price = latest_price_record.close

    await async_db.commit()
