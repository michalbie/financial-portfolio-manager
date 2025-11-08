"""
Background task to fetch stock prices every 5 minutes
"""
import requests

import asyncio
from datetime import datetime
import httpx
from sqlalchemy.orm import Session
from typing import List, Dict
import os
from sqlalchemy import text

from database.database import AsyncSessionLocal, SessionLocal
from database.models import Asset, AssetType


STOCKS_API_KEY = os.getenv("STOCKS_API_KEY", None)


class StockPriceProvider:
    """Base class for stock price providers"""

    async def get_price(self, symbol: str) -> float:
        raise NotImplementedError


class TwelveDataProvider(StockPriceProvider):
    """Twelve Data - Free tier: 8 calls/minute, 800 calls/day"""

    def __init__(self):
        self.api_key = os.getenv("TWELVE_DATA_API_KEY")
        self.base_url = "https://api.twelvedata.com"

    async def get_stocks_list(self) -> List[Dict]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.base_url}/stocks")
            data = response.json()

            if "data" in data:
                return data["data"]

            raise ValueError("Could not fetch stocks list")

    async def get_stock_price(self, symbol: str) -> float:
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
        outputsize: int = 30,  # Number of data points (max 5000)
        start_date: str = None,  # Format: "2024-01-01" or "2024-01-01 09:30:00"
        end_date: str = None
    ) -> List[Dict]:
        """
        Get historical OHLCV data
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
                "outputsize": outputsize,
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
            
            raise ValueError(f"Could not fetch historical prices for {symbol}: {data}")


async def update_stock_list():
    """Fetch and update stocks (not prices) in the database - FULLY ASYNC"""
    print(f"[{datetime.utcnow()}] Updating stock list...")

    provider = TwelveDataProvider()

    try:
        # Async HTTP request
        stocks = await provider.get_stocks_list()

        # Async database operations
        async with AsyncSessionLocal() as db:
            try:
                # Delete existing stocks
                await db.execute(text("DELETE FROM stocks"))

                # Prepare batch insert
                valid_stocks = []
                for stock in stocks:
                    if not stock['figi_code']:
                        continue

                    valid_stocks.append({
                        "symbol": stock["symbol"],
                        "name": stock["name"],
                        "exchange": stock["exchange"],
                        "country": stock["country"],
                        "currency": stock["currency"],
                        "figi_code": stock["figi_code"],
                        "updated_at": datetime.utcnow()
                    })

                # Batch insert (much faster)
                if valid_stocks:
                    await db.execute(
                        text("""
                            INSERT INTO stocks (symbol, name, exchange, country, currency, figi_code, updated_at)
                            VALUES (:symbol, :name, :exchange, :country, :currency, :figi_code, :updated_at)
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
