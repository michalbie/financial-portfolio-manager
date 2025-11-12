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

from database.database import AsyncSessionLocal
from database.models import Asset, Statistic


async def update_portfolio_values() -> None:
    """Update portfolio value statistics for all users using update_user_portfolio_value on each user"""

    async with AsyncSessionLocal() as async_db:
        result = await async_db.execute(
            select(Asset.user_id).distinct()
        )
        user_ids = [row[0] for row in result.fetchall()]

    # Update portfolio values for each user concurrently
    await asyncio.gather(*[
        update_user_portfolio_value(user_id)
        for user_id in user_ids
    ])

    print("Portfolio values updated.")


async def update_user_portfolio_value(user_id: int) -> None:
    """Update portfolio value statistics for the user"""
    
    async with AsyncSessionLocal() as async_db:
        result = await async_db.execute(
            select(Asset).where(
                Asset.user_id == user_id,
                Asset.status == 'ACTIVE'
            )
        )
        assets = result.scalars().all()

        total_value = 0.0

        for asset in assets:
            if asset.current_price and asset.quantity:
                total_value += asset.current_price * asset.quantity

        # Create a new Statistic entry
        statistic = Statistic(
            user_id=user_id,
            date=datetime.utcnow(),
            total_portfolio_value=total_value
        )

        async_db.add(statistic)
        await async_db.commit()
