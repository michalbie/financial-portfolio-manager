"""
Background task to fetch stock prices and maintain stock list
"""
import os
# from dotenv import load_dotenv
# load_dotenv()  # noqa

import requests
import asyncio
from datetime import datetime
import httpx
from sqlalchemy.orm import Session
from typing import List, Dict
from sqlalchemy import text

from database.database import AsyncSessionLocal, SessionLocal
from database.models import Asset, AssetType


class StockPriceProvider:
    """Base class for stock price providers"""

    async def get_price(self, symbol: str) -> float:
        raise NotImplementedError


class TwelveDataProvider(StockPriceProvider):
    """Twelve Data - Free tier: 8 calls/minute, 800 calls/day"""

    def __init__(self):
        self.api_key = os.getenv("STOCKS_API_KEY", None)
        self.base_url = "https://api.twelvedata.com"

    async def get_stocks_list(self) -> List[Dict]:
        """Fetch list of all available stocks from TwelveData"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.base_url}/stocks")
            data = response.json()

            if "data" in data:
                return data["data"]

            raise ValueError("Could not fetch stocks list")

    async def get_stock_price(self, symbol: str) -> float:
        """Get current price for a symbol"""
        async with httpx.AsyncClient() as client:
            params = {
                "symbol": symbol,
                "apikey": self.api_key
            }
            response = await client.get(f"{self.base_url}/price", params=params)
            data = response.json()

            if "price" in data:
                return float(data["price"])

            raise ValueError(f"Could not fetch price for {symbol}")

    async def get_historical_prices(
        self,
        symbol: str,
        interval: str = "1day",  # 1min, 5min, 15min, 30min, 1h, 1day, 1week, 1month
        start_date: str = None,  # Format: "2024-01-01" or "2024-01-01 09:30:00"
        end_date: str = None
    ) -> List[Dict]:
        """
        Get historical OHLCV data.

        When start_date and end_date are provided, the API returns all data points
        within that range - no need for outputsize parameter.

        Returns: [
            {
                "datetime": "2024-01-15",
                "open": "150.00",
                "high": "152.00",
                "low": "149.50",
                "close": "151.00",
                "volume": "1000000"
            },
            ...
        ]
        """

        async with httpx.AsyncClient(timeout=30.0) as client:
            params = {
                "symbol": symbol,
                "interval": interval,
                "apikey": self.api_key,
                "format": "JSON"
            }

            if start_date:
                params["start_date"] = start_date
            if end_date:
                params["end_date"] = end_date

            response = await client.get(f"{self.base_url}/time_series", params=params)
            data = response.json()

            if "values" in data:
                return data["values"]

            raise ValueError(
                f"Could not fetch historical prices for {symbol}: {data}")


async def update_stock_list():
    """
    Fetch and update the complete stock list from TwelveData.

    Each stock is uniquely identified by (symbol, mic_code):
    - symbol: The ticker symbol (e.g., "AAPL")
    - mic_code: Market Identifier Code (e.g., "XNAS" for NASDAQ)
    - exchange: Human-readable exchange name for display

    Note: MIC code identifies the EXCHANGE, not the stock itself.
    Multiple stocks can have the same MIC code (all NASDAQ stocks have "XNAS").
    """
    print(f"[{datetime.utcnow()}] Updating stock list...")

    provider = TwelveDataProvider()

    try:
        # Fetch stocks from API
        stocks = await provider.get_stocks_list()

        # Async database operations
        async with AsyncSessionLocal() as db:
            try:
                # Delete existing stocks
                await db.execute(text("DELETE FROM stocks"))

                # Prepare batch insert
                valid_stocks = []
                for stock in stocks:
                    # Skip stocks without required fields
                    if not stock.get('symbol') or not stock.get('mic_code'):
                        continue

                    valid_stocks.append({
                        "symbol": stock["symbol"],
                        "mic_code": stock["mic_code"],
                        "exchange": stock["exchange"],
                        "name": stock["name"],
                        "country": stock.get("country"),
                        "currency": stock.get("currency"),
                        "updated_at": datetime.utcnow()
                    })

                # Batch insert with composite primary key (symbol, mic_code)
                if valid_stocks:
                    await db.execute(
                        text("""
                            INSERT INTO stocks (symbol, mic_code, exchange, name, country, currency, updated_at)
                            VALUES (:symbol, :mic_code, :exchange, :name, :country, :currency, :updated_at)
                            ON CONFLICT (symbol, mic_code) DO UPDATE SET
                                exchange = EXCLUDED.exchange,
                                name = EXCLUDED.name,
                                country = EXCLUDED.country,
                                currency = EXCLUDED.currency,
                                updated_at = EXCLUDED.updated_at
                        """),
                        valid_stocks
                    )

                await db.commit()
                print(f"✅ Successfully updated {len(valid_stocks)} stocks")

            except Exception as e:
                print(f"❌ Error updating stocks in DB: {e}")
                await db.rollback()
                raise

    except Exception as e:
        print(f"❌ Error in update_stock_list: {e}")
