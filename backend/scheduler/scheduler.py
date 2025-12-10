# backend/scheduler/scheduler.py

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
from zoneinfo import ZoneInfo

from assets.assets_updater import update_assets_prices
from assets.asset_fetcher import update_assets_list, update_crypto_list
from assets.asset_price_historian import (
    fetch_latest_prices_for_tracked_assets,
    fetch_daily_prices_for_tracked_assets,
    cleanup_old_price_data
)
from statistics.portfolio_value_updater import update_portfolio_values
from currency.update_currencies import update_currencies

scheduler = AsyncIOScheduler()


async def initialize_scheduler():
    """Initialize all scheduled jobs"""

    # Update currency exchange rates daily
    scheduler.add_job(update_currencies, "interval",
                      days=1)

    # Update asset list weekly (background)
    scheduler.add_job(update_assets_list, "interval", weeks=1)
    scheduler.add_job(update_crypto_list, "interval", weeks=1)

    # Update users assets actual prices periodically
    scheduler.add_job(update_assets_prices, "interval",
                      hours=1, next_run_time=datetime.now(tz=ZoneInfo("Europe/Warsaw")))

    scheduler.add_job(update_portfolio_values, "interval",
                      hours=1)

    # Fetch hourly prices every hour (during market hours ideally)
    scheduler.add_job(
        fetch_latest_prices_for_tracked_assets,
        "interval",
        hours=1,
        id="fetch_hourly_prices"
    )

    # Fetch daily prices once per day at 6 PM EST (after market close)
    scheduler.add_job(
        fetch_daily_prices_for_tracked_assets,
        "cron",
        hour=18,  # 6 PM
        minute=0,
        id="fetch_daily_prices"
    )

    # Cleanup old data once per day at 2 AM
    scheduler.add_job(
        cleanup_old_price_data,
        "cron",
        hour=2,
        minute=0,
        id="cleanup_old_data"
    )

    scheduler.start()
    print("⏰ Scheduler initialized")
