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

from currency.translate_currency import translate_currency
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
        portfolio_distribution = {}

        for asset in assets:
            asset_price = asset.current_price if asset.current_price is not None else asset.purchase_price

            if asset.currency and asset.currency != "USD":
                total_value += translate_currency(
                    asset.currency, "USD", asset_price * asset.quantity)
                portfolio_distribution[asset.type] = portfolio_distribution.get(asset.type, 0) + translate_currency(
                    asset.currency, "USD", asset_price * asset.quantity)

            else:
                total_value += asset_price * asset.quantity
                portfolio_distribution[asset.type] = portfolio_distribution.get(
                    asset.type, 0) + (asset_price * asset.quantity)

        last_statistic = await async_db.execute(
            select(Statistic)
            .where(Statistic.user_id == user_id)
            .order_by(Statistic.date.desc())
            .limit(1)
        )
        last_statistic = last_statistic.scalar_one_or_none()

        if last_statistic and last_statistic.total_portfolio_value == total_value:
            # No change in portfolio value, skip adding a new statistic
            return

        # Create a new Statistic entry
        statistic = Statistic(
            user_id=user_id,
            date=datetime.utcnow(),
            total_portfolio_value=total_value,
            portfolio_distribution=portfolio_distribution
        )

        async_db.add(statistic)
        await async_db.commit()
