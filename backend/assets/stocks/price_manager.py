import asyncio
from datetime import datetime, timedelta
from typing import List, Dict
import httpx
from sqlalchemy import text, select
from sqlalchemy.orm import Session

from database.database import AsyncSessionLocal, SessionLocal
from database.models import Asset, StockPrice, AssetType
from assets.stocks.stock_fetcher import TwelveDataProvider


async def backfill_stock_prices(symbol: str, mic_code: str, purchase_date: datetime):
    """
    Backfill historical prices from purchase_date to now
    - Last 30 days: 1-hour interval
    - Older than 30 days: 1-day interval

    Args:
        symbol: Stock symbol (e.g., "AAPL")
        mic_code: Market Identifier Code (e.g., "XNAS" for NASDAQ)
        purchase_date: Date when the stock was purchased
    """
    print(
        f"📊 Backfilling prices for {symbol} on {mic_code} from {purchase_date}")

    provider = TwelveDataProvider()
    now = datetime.now()

    async with AsyncSessionLocal() as db:
        try:
            # Check if we already have data FOR OR BEFORE purchase date
            existing_check = await db.execute(
                select(StockPrice)
                .where(StockPrice.symbol == symbol)
                .where(StockPrice.mic_code == mic_code)
                .where(StockPrice.datetime <= purchase_date)
                .order_by(StockPrice.datetime.desc())
                .limit(1)
            )

            earliest_existing = existing_check.scalar_one_or_none()

            if earliest_existing and earliest_existing.datetime <= purchase_date:
                print(
                    f"✅ {symbol} on {mic_code} already has historical data from {earliest_existing.datetime}, skipping backfill")
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
                await _insert_prices(db, symbol, mic_code, "1hour", hourly_data)

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
                await _insert_prices(db, symbol, mic_code, "1day", daily_data)
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
                await _insert_prices(db, symbol, mic_code, "1hour", hourly_data)

            await db.commit()
            print(f"✅ Backfilled prices for {symbol} on {mic_code}")

        except Exception as e:
            await db.rollback()
            print(f"❌ Error backfilling {symbol} on {mic_code}: {e}")
            raise


async def _insert_prices(db, symbol: str, mic_code: str, interval: str, price_data: List[Dict]):
    """Insert price data into database using (symbol, mic_code) composite key"""
    if not price_data:
        return

    valid_prices = []
    for price in price_data:
        try:
            # Parse datetime string to datetime object
            dt = price["datetime"]
            if isinstance(dt, str):
                # Handle both date and datetime formats
                if 'T' in dt or ' ' in dt:
                    dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
                else:
                    dt = datetime.strptime(dt, "%Y-%m-%d")

            valid_prices.append({
                "symbol": symbol,
                "mic_code": mic_code,
                "datetime": dt,  # Now a datetime object
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
                INSERT INTO stock_prices (symbol, mic_code, datetime, interval, open, high, low, close, volume)
                VALUES (:symbol, :mic_code, :datetime, :interval, :open, :high, :low, :close, :volume)
                ON CONFLICT (symbol, mic_code, datetime, interval) DO NOTHING
            """),
            valid_prices
        )
        print(
            f"  Inserted {len(valid_prices)} {interval} price records for {symbol} on {mic_code}")


async def fetch_latest_prices_for_tracked_stocks():
    """
    Fetch latest prices for all stocks in user portfolios.
    Groups by (symbol, mic_code) to get unique stock identifiers.
    """
    print(f"📈 [{datetime.utcnow()}] Fetching latest prices for tracked stocks...")

    # Get unique (symbol, mic_code) pairs from all user assets
    db = SessionLocal()
    try:
        tracked_stocks = db.query(Asset.symbol, Asset.mic_code).filter(
            Asset.type == AssetType.STOCKS,
            Asset.symbol.isnot(None),
            Asset.mic_code.isnot(None)
        ).distinct().all()

        stock_pairs = [(symbol, mic_code)
                       for symbol, mic_code in tracked_stocks]
    finally:
        db.close()

    if not stock_pairs:
        print("  No stocks to track")
        return

    print(f"  Tracking {len(stock_pairs)} unique stocks")

    provider = TwelveDataProvider()

    print(one_hour_ago.strftime("%Y-%m-%d %H:%M:%S"),
          now.strftime("%Y-%m-%d %H:%M:%S"))

    for symbol, mic_code in stock_pairs:
        try:
            # Fetch latest hourly price using date range
            now = datetime.utcnow()
            one_hour_ago = now - timedelta(hours=1)

            hourly_data = await provider.get_historical_prices(
                symbol=symbol,
                interval="1h",
                start_date=one_hour_ago.strftime("%Y-%m-%d %H:%M:%S"),
                end_date=now.strftime("%Y-%m-%d %H:%M:%S")
            )

            if hourly_data:
                async with AsyncSessionLocal() as db:
                    await _insert_prices(db, symbol, mic_code, "1hour", hourly_data)
                    await db.commit()

            # Rate limiting: 8 calls/minute for free tier
            await asyncio.sleep(8)

        except Exception as e:
            print(f"  ❌ Error fetching {symbol} on {mic_code}: {e}")
            continue

    print(f"✅ Finished fetching latest prices")


async def fetch_daily_prices_for_tracked_stocks():
    """Fetch daily closing prices for all tracked stocks"""
    print(f"📊 [{datetime.utcnow()}] Fetching daily prices for tracked stocks...")

    # Get unique (symbol, mic_code) pairs
    db = SessionLocal()
    try:
        tracked_stocks = db.query(Asset.symbol, Asset.mic_code).filter(
            Asset.type == AssetType.STOCKS,
            Asset.symbol.isnot(None),
            Asset.mic_code.isnot(None)
        ).distinct().all()

        stock_pairs = [(symbol, mic_code)
                       for symbol, mic_code in tracked_stocks]
    finally:
        db.close()

    if not stock_pairs:
        print("  No stocks to track")
        return

    provider = TwelveDataProvider()

    for symbol, mic_code in stock_pairs:
        try:
            # Fetch latest daily price using date range
            today = datetime.utcnow()
            yesterday = today - timedelta(days=1)

            daily_data = await provider.get_historical_prices(
                symbol=symbol,
                interval="1day",
                start_date=yesterday.strftime("%Y-%m-%d"),
                end_date=today.strftime("%Y-%m-%d")
            )

            if daily_data:
                async with AsyncSessionLocal() as db:
                    await _insert_prices(db, symbol, mic_code, "1day", daily_data)
                    await db.commit()

            # Rate limiting
            await asyncio.sleep(8)

        except Exception as e:
            print(f"  ❌ Error fetching {symbol} on {mic_code}: {e}")
            continue

    print(f"✅ Finished fetching daily prices")


async def get_stock_price_history(
    symbol: str,
    mic_code: str,
    start_date: datetime,
    end_date: datetime
) -> List[Dict]:
    """
    Get stock price history for charting.
    Uses (symbol, mic_code) to uniquely identify the stock.
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
            .where(StockPrice.mic_code == mic_code)
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
