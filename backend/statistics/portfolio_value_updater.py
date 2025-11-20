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
from sqlalchemy import Date, cast, select, text

from assets.asset_price_historian import get_asset_price_at_datetime
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
        update_user_portfolio_value(user_id, False)
        for user_id in user_ids
    ])

    print("Portfolio values updated.")


async def update_user_portfolio_value(user_id: int, backwards: bool = True) -> None:
    """Update portfolio value statistics for the user, going backwards in time"""
    # Now add statistic based on asset purchase date (and all other assets that were purchased at or before that date)
    # If record for that date already exists, update it instead of adding new

    async with AsyncSessionLocal() as async_db:
        # The one that triggered this portfolio update
        latest_asset = await async_db.execute(
            select(Asset)
            .where(
                Asset.user_id == user_id,
                Asset.status == 'ACTIVE'
            )
            .order_by(Asset.updated_at.desc())
            .limit(1)
        )
        latest_asset = latest_asset.scalar_one_or_none()
        if not latest_asset:
            return

        purchase_date = latest_asset.purchase_date

        relevant = await async_db.execute(
            select(Statistic)
            .where(
                Statistic.user_id == user_id,
                cast(Statistic.date, Date) >= cast(purchase_date, Date)
            )
            .order_by(Statistic.date.asc())
        )
        relevant_statistics = relevant.scalars().all()

        # ---------------------------------------------------------------------------------------
        # 1. If record for purchase_date not existing, create new statistic for that date
        # ---------------------------------------------------------------------------------------
        if relevant_statistics and relevant_statistics[0] and relevant_statistics[0].date.date() > purchase_date.date() and backwards:
            result = await async_db.execute(
                select(Asset)
                .where(
                    Asset.user_id == user_id,
                    Asset.status == 'ACTIVE',
                    cast(Asset.purchase_date, Date) <= cast(
                        purchase_date, Date)
                )
            )
            assets = result.scalars().all()

            total_value = 0.0
            portfolio_distribution = {}

            for asset in assets:
                if asset.id == latest_asset.id:
                    asset_price = latest_asset.purchase_price

                else:
                    asset_price = await get_asset_price_at_datetime(
                        asset.id, purchase_date) or asset.purchase_price

                if asset.currency and asset.currency != "USD":
                    total_value += translate_currency(
                        asset.currency, "USD", asset_price * asset.quantity)
                    portfolio_distribution[asset.type] = portfolio_distribution.get(asset.type, 0) + translate_currency(
                        asset.currency, "USD", asset_price * asset.quantity)

                else:
                    total_value += asset_price * asset.quantity
                    portfolio_distribution[asset.type] = portfolio_distribution.get(
                        asset.type, 0) + (asset_price * asset.quantity)

            # Create a new Statistic entry
            statistic = Statistic(
                user_id=user_id,
                date=purchase_date,
                total_portfolio_value=total_value,
                portfolio_distribution=portfolio_distribution
            )

            async_db.add(statistic)
            await async_db.commit()
            await async_db.refresh(statistic)

        # ---------------------------------------------------------------------------------------
        #  2. Update existing statistics
        # ---------------------------------------------------------------------------------------
        if relevant_statistics and backwards:
            for statistic in relevant_statistics:
                result = await async_db.execute(
                    select(Asset)
                    .where(
                        Asset.user_id == user_id,
                        Asset.status == 'ACTIVE',
                        Asset.purchase_date <= statistic.date
                    )
                )
                assets = result.scalars().all()

                total_value = 0.0
                portfolio_distribution = {}

                for asset in assets:
                    asset_price = await get_asset_price_at_datetime(
                        asset.id, statistic.date) or asset.purchase_price

                    print(statistic.date, " vs datetime now ", datetime.utcnow())

                    if asset.currency and asset.currency != "USD":
                        total_value += translate_currency(
                            asset.currency, "USD", asset_price * asset.quantity)
                        portfolio_distribution[asset.type] = portfolio_distribution.get(asset.type, 0) + translate_currency(
                            asset.currency, "USD", asset_price * asset.quantity)

                    else:
                        total_value += asset_price * asset.quantity
                        portfolio_distribution[asset.type] = portfolio_distribution.get(
                            asset.type, 0) + (asset_price * asset.quantity)

                statistic.total_portfolio_value = total_value
                statistic.portfolio_distribution = portfolio_distribution

            await async_db.commit()

        # ---------------------------------------------------------------------------------------
        # 3. Add statistic new statistic for today if needed
        # --------------------------------------------------------------------------------------
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
