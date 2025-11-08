import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from assets.stock_fetcher import update_stock_list

scheduler = AsyncIOScheduler()


async def initialize_scheduler():
    # asyncio.create_task(update_stock_list())
    scheduler.add_job(update_stock_list, "interval", weeks=1)
    scheduler.start()
