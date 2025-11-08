import asyncio
from datetime import datetime, timedelta
from typing import List, Dict
import httpx
from sqlalchemy import text, select
from sqlalchemy.orm import Session

from database.database import AsyncSessionLocal, SessionLocal
from database.models import Asset, StockPrice, AssetType
from assets.stock_fetcher import TwelveDataProvider


async def _get_stock_exchange(db, symbol: str) -> str:
    """
    Get the exchange for a stock symbol
    If multiple exchanges have the same symbol, prefer US exchanges
    """
    from sqlalchemy import select
    from database.models import Stock

    result = await db.execute(
        select(Stock.exchange)
        .where(Stock.symbol == symbol)
        .order_by(
            # Prefer major US exchanges
            Stock.exchange.in_(["NASDAQ", "NYSE", "AMEX"]).desc(),
            Stock.exchange
        )
        .limit(1)
    )

    exchange = result.scalar_one_or_none()

    if not exchange:
        # Fallback: try to fetch from API
        print(f"⚠️ Exchange not found for {symbol}, using NASDAQ as fallback")
        return "NASDAQ"

    return exchange


async def backfill_stock_prices(symbol: str, purchase_date: datetime):
    """
    Backfill historical prices from purchase_date to now
    - Last 30 days: 1-hour interval
    - Older than 30 days: 1-day interval
    """
    print(f"📊 Backfilling prices for {symbol} from {purchase_date}")

    provider = TwelveDataProvider()
    now = datetime.utcnow()

    async with AsyncSessionLocal() as db:
        try:
            # Get the correct exchange for this symbol
            exchange = await _get_stock_exchange(db, symbol)
            print(f"  Using exchange: {exchange}")

            # Check if we already have data FOR OR BEFORE purchase date
            existing_check = await db.execute(
                select(StockPrice)
                .where(StockPrice.symbol == symbol)
                .where(StockPrice.exchange == exchange)
                # ← FIXED: Check if we have data at or before purchase
                .where(StockPrice.datetime <= purchase_date)
                .order_by(StockPrice.datetime.desc())
                .limit(1)
            )

            earliest_existing = existing_check.scalar_one_or_none()

            if earliest_existing and earliest_existing.datetime <= purchase_date:
                print(
                    f"✅ {symbol} already has historical data from {earliest_existing.datetime}, skipping backfill")
                return

            # Fetch hourly data for last 30 days
            thirty_days_ago = now - timedelta(days=30)
            if purchase_date < thirty_days_ago:
                # Fetch hourly for last 30 days
                print(f"  Fetching hourly data (last 30 days)...")
                hourly_data = await provider.get_historical_prices(
                    symbol=symbol,
                    interval="1h",
                    start_date=thirty_days_ago.strftime("%Y-%m-%d %H:%M:%S"),
                    end_date=now.strftime("%Y-%m-%d %H:%M:%S")
                )

                # Insert hourly data
                await _insert_prices(db, symbol, exchange, "1hour", hourly_data)

                # Fetch daily data from purchase_date to 30 days ago
                print(
                    f"  Fetching daily data ({purchase_date.date()} to {thirty_days_ago.date()})...")
                daily_data = await provider.get_historical_prices(
                    symbol=symbol,
                    interval="1day",
                    start_date=purchase_date.strftime("%Y-%m-%d"),
                    end_date=thirty_days_ago.strftime("%Y-%m-%d")
                )

                # Insert daily data
                await _insert_prices(db, symbol, exchange, "1day", daily_data)
            else:
                # Purchase was within last 30 days, only fetch hourly
                print(f"  Fetching hourly data from purchase date...")
                hourly_data = await provider.get_historical_prices(
                    symbol=symbol,
                    interval="1h",
                    start_date=purchase_date.strftime("%Y-%m-%d %H:%M:%S"),
                    end_date=now.strftime("%Y-%m-%d %H:%M:%S")
                )

                # Insert hourly data
                await _insert_prices(db, symbol, exchange, "1hour", hourly_data)

            await db.commit()
            print(f"✅ Backfilled prices for {symbol} on {exchange}")

        except Exception as e:
            await db.rollback()
            print(f"❌ Error backfilling {symbol}: {e}")
            raise


async def _insert_prices(db, symbol: str, exchange: str, interval: str, price_data: List[Dict]):
    """Insert price data into database"""
    if not price_data:
        return

    valid_prices = []
    for price in price_data:
        try:
            valid_prices.append({
                "symbol": symbol,
                "exchange": exchange,  # ← Now uses actual exchange
                "datetime": price["datetime"],
                "interval": interval,
                "open": float(price["open"]),
                "high": float(price["high"]),
                "low": float(price["low"]),
                "close": float(price["close"]),
                "volume": int(price["volume"]) if price.get("volume") else 0
            })
        except (KeyError, ValueError) as e:
            print(f"⚠️ Skipping invalid price data: {e}")
            continue

    if valid_prices:
        await db.execute(
            text("""
                INSERT INTO stock_prices (symbol, exchange, datetime, interval, open, high, low, close, volume)
                VALUES (:symbol, :exchange, :datetime, :interval, :open, :high, :low, :close, :volume)
                ON CONFLICT (symbol, exchange, datetime, interval) DO NOTHING
            """),
            valid_prices
        )
        print(
            f"  Inserted {len(valid_prices)} {interval} price records for {symbol} on {exchange}")


async def fetch_latest_prices_for_tracked_stocks():
    """
    Fetch latest prices for all stocks in user portfolios
    """
    print(f"📈 [{datetime.utcnow()}] Fetching latest prices for tracked stocks...")

    # Get unique stock symbols AND exchanges from all user assets
    db = SessionLocal()
    try:
        tracked_stocks = db.query(Asset.symbol, Asset.exchange).filter(
            Asset.type == AssetType.STOCKS,
            Asset.symbol.isnot(None),
            Asset.exchange.isnot(None)
        ).distinct().all()

        stock_pairs = [(symbol, exchange)
                       for symbol, exchange in tracked_stocks]
    finally:
        db.close()

    if not stock_pairs:
        print("  No stocks to track")
        return

    print(f"  Tracking {len(stock_pairs)} stocks")

    provider = TwelveDataProvider()

    for symbol, exchange in stock_pairs:
        try:
            # Fetch latest hourly price
            hourly_data = await provider.get_historical_prices(
                symbol=symbol,
                interval="1h",
                outputsize=1
            )

            if hourly_data:
                async with AsyncSessionLocal() as db:
                    await _insert_prices(db, symbol, exchange, "1hour", hourly_data)
                    await db.commit()

            # Rate limiting: 8 calls/minute
            await asyncio.sleep(8)

        except Exception as e:
            print(f"  ❌ Error fetching {symbol} on {exchange}: {e}")
            continue

    print(f"✅ Finished fetching latest prices")


async def fetch_daily_prices_for_tracked_stocks():
    """Fetch daily closing prices for all tracked stocks"""
    print(f"📊 [{datetime.utcnow()}] Fetching daily prices for tracked stocks...")

    # Get unique stock symbols AND exchanges
    db = SessionLocal()
    try:
        tracked_stocks = db.query(Asset.symbol, Asset.exchange).filter(
            Asset.type == AssetType.STOCKS,
            Asset.symbol.isnot(None),
            Asset.exchange.isnot(None)
        ).distinct().all()

        stock_pairs = [(symbol, exchange)
                       for symbol, exchange in tracked_stocks]
    finally:
        db.close()

    if not stock_pairs:
        print("  No stocks to track")
        return

    provider = TwelveDataProvider()

    for symbol, exchange in stock_pairs:
        try:
            # Fetch latest daily price
            daily_data = await provider.get_historical_prices(
                symbol=symbol,
                interval="1day",
                outputsize=1
            )

            if daily_data:
                async with AsyncSessionLocal() as db:
                    await _insert_prices(db, symbol, exchange, "1day", daily_data)
                    await db.commit()

            # Rate limiting
            await asyncio.sleep(8)

        except Exception as e:
            print(f"  ❌ Error fetching {symbol} on {exchange}: {e}")
            continue

    print(f"✅ Finished fetching daily prices")


async def get_stock_price_history(
    symbol: str,
    exchange: str,  # ← NEW parameter
    start_date: datetime,
    end_date: datetime
) -> List[Dict]:
    """
    Get stock price history for charting
    """
    days_diff = (end_date - start_date).days

    # Choose interval based on range
    if days_diff <= 7:
        interval = "1hour"
    else:
        interval = "1day"

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(StockPrice)
            .where(StockPrice.symbol == symbol)
            .where(StockPrice.exchange == exchange)  # ← Added exchange filter
            .where(StockPrice.interval == interval)
            .where(StockPrice.datetime >= start_date)
            .where(StockPrice.datetime <= end_date)
            .order_by(StockPrice.datetime)
        )

        prices = result.scalars().all()

        return [
            {
                "datetime": price.datetime.isoformat(),
                "open": price.open,
                "high": price.high,
                "low": price.low,
                "close": price.close,
                "volume": price.volume
            }
            for price in prices
        ]


async def cleanup_old_price_data():
    """
    Remove old price data based on retention policy:
    - 1-hour data: Keep last 30 days
    """
    print(f"🧹 [{datetime.utcnow()}] Cleaning up old price data...")

    async with AsyncSessionLocal() as db:
        try:
            # Delete hourly data older than 30 days
            result = await db.execute(
                text("""
                    DELETE FROM stock_prices
                    WHERE interval = '1hour'
                      AND datetime < NOW() - INTERVAL '30 days'
                """)
            )

            deleted_count = result.rowcount
            await db.commit()

            print(f"✅ Cleaned up {deleted_count} old hourly price records")

        except Exception as e:
            await db.rollback()
            print(f"❌ Error cleaning up old data: {e}")


async def get_stock_price_history(
    symbol: str,
    start_date: datetime,
    end_date: datetime
) -> List[Dict]:
    """
    Get stock price history for charting
    Automatically selects appropriate interval based on date range
    """
    days_diff = (end_date - start_date).days

    # Choose interval based on range
    if days_diff <= 7:
        interval = "1hour"
    else:
        interval = "1day"

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(StockPrice)
            .where(StockPrice.symbol == symbol)
            .where(StockPrice.interval == interval)
            .where(StockPrice.datetime >= start_date)
            .where(StockPrice.datetime <= end_date)
            .order_by(StockPrice.datetime)
        )

        prices = result.scalars().all()

        return [
            {
                "datetime": price.datetime.isoformat(),
                "open": price.open,
                "high": price.high,
                "low": price.low,
                "close": price.close,
                "volume": price.volume
            }
            for price in prices
        ]
