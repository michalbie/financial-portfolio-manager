from apscheduler.schedulers.background import BackgroundScheduler

from assets.stock_fetcher import update_stock_list

scheduler = BackgroundScheduler()


async def initialize_scheduler():
    await update_stock_list()  # Initial run
    scheduler.add_job(update_stock_list, "interval", weeks=1)
    scheduler.start()
