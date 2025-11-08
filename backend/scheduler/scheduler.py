# backend/scheduler/scheduler.py

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from assets.stock_fetcher import update_stock_list
from assets.price_manager import (
    fetch_latest_prices_for_tracked_stocks,
    fetch_daily_prices_for_tracked_stocks,
    cleanup_old_price_data
)

scheduler = AsyncIOScheduler()


async def initialize_scheduler():
    """Initialize all scheduled jobs"""

    # Update stock list weekly (background)
    asyncio.create_task(update_stock_list())
    scheduler.add_job(update_stock_list, "interval", weeks=1)

    # Fetch hourly prices every hour (during market hours ideally)
    scheduler.add_job(
        fetch_latest_prices_for_tracked_stocks,
        "interval",
        hours=1,
        id="fetch_hourly_prices"
    )

    # Fetch daily prices once per day at 6 PM EST (after market close)
    scheduler.add_job(
        fetch_daily_prices_for_tracked_stocks,
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
    print("⏰ Scheduler initialized with jobs:")
    print("  - Update stock list: weekly")
    print("  - Fetch hourly prices: every hour")
    print("  - Fetch daily prices: daily at 6 PM")
    print("  - Cleanup old data: daily at 2 AM")
