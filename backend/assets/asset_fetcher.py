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


class TwelveDataProvider():
    """Twelve Data - Free tier: 8 calls/minute, 800 calls/day"""

    def __init__(self):
        self.api_key = os.getenv("TWELVE_DATA_API_KEY", None)
        self.base_url = "https://api.twelvedata.com"

    async def get_assets_list(self) -> List[Dict]:
        """Fetch list of all available assets from TwelveData"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            stocks_response = await client.get(f"{self.base_url}/stocks")
            etfs_response = await client.get(f"{self.base_url}/etfs")

            stocks_data = stocks_response.json()
            etfs_data = etfs_response.json()

            data = []

            if "data" in stocks_data:
                data.extend(stocks_data["data"])
            if "data" in etfs_data:
                data.extend(etfs_data["data"])

            if data:
                return data

            raise ValueError("Could not fetch assets list")

    async def get_historical_prices(
        self,
        symbol: str,
        mic_code: str,
        exchange: str = None,
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
                "mic_code": mic_code,
                "exchange": exchange,
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


async def update_assets_list():
    """
    Fetch and update the complete asset list from TwelveData.

    Each asset is uniquely identified by (symbol, mic_code):
    - symbol: The ticker symbol (e.g., "AAPL")
    - mic_code: Market Identifier Code (e.g., "XNAS" for NASDAQ)
    - exchange: Human-readable exchange name for display

    Note: MIC code identifies the EXCHANGE, not the asset itself.
    Multiple assets can have the same MIC code (all NASDAQ assets have "XNAS").
    """
    print(f"[{datetime.utcnow()}] Updating asset list...")

    provider = TwelveDataProvider()

    try:
        # Fetch assets from API
        assets = await provider.get_assets_list()

        # Async database operations
        async with AsyncSessionLocal() as db:
            try:
                # Delete existing assets
                await db.execute(text("DELETE FROM assets_list"))

                # Prepare batch insert
                valid_assets = []
                for asset in assets:
                    # Skip assets without required fields
                    if not asset.get('symbol') or not asset.get('mic_code'):
                        continue

                    valid_assets.append({
                        "symbol": asset["symbol"],
                        "mic_code": asset["mic_code"],
                        "exchange": asset["exchange"],
                        "name": asset["name"],
                        "country": asset.get("country"),
                        "currency": asset.get("currency"),
                        "updated_at": datetime.utcnow()
                    })

                # Batch insert with composite primary key (symbol, mic_code)
                if valid_assets:
                    await db.execute(
                        text("""
                            INSERT INTO assets_list (symbol, mic_code, exchange, name, country, currency, updated_at)
                            VALUES (:symbol, :mic_code, :exchange, :name, :country, :currency, :updated_at)
                            ON CONFLICT (symbol, mic_code) DO UPDATE SET
                                exchange = EXCLUDED.exchange,
                                name = EXCLUDED.name,
                                country = EXCLUDED.country,
                                currency = EXCLUDED.currency,
                                updated_at = EXCLUDED.updated_at
                        """),
                        valid_assets
                    )

                await db.commit()
                print(f"✅ Successfully updated {len(valid_assets)} assets")

            except Exception as e:
                print(f"❌ Error updating assets in DB: {e}")
                await db.rollback()
                raise

    except Exception as e:
        print(f"❌ Error in update_assets_list: {e}")
