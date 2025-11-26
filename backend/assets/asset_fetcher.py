"""
Background task to fetch stock prices and maintain stock list
"""
import os

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

    async def get_crypto_list(self) -> List[Dict]:
        """Fetch list of all available cryptocurrencies from TwelveData"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            crypto_response = await client.get(f"{self.base_url}/cryptocurrencies")

            crypto_data = crypto_response.json()

            if "data" in crypto_data:
                return crypto_data["data"]

            raise ValueError("Could not fetch cryptocurrencies list")

    async def get_currency_exchange_rates(self) -> List[Dict]:
        """Fetch list of currency exchange rates from TwelveData"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            symbols = ["USD/EUR", "EUR/USD", "USD/GBP",
                       "GBP/USD", "USD/PLN", "PLN/USD"]
            currency_data = []

            for symbol in symbols:
                currency_response = await client.get(f"{self.base_url}/exchange_rate", params={
                    "apikey": self.api_key,
                    "symbol": symbol
                })
                currency_data.append(currency_response.json())

            return currency_data

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
                for item in data["values"]:
                    item["currency"] = data["meta"].get("currency", None)
                data["values"]
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
        assets = await provider.get_assets_list()

        async with AsyncSessionLocal() as db:
            try:
                await db.execute(text("DELETE FROM assets_list"))

                valid_assets = []
                for asset in assets:
                    if not asset.get('symbol') or not asset.get('mic_code'):
                        continue

                    valid_assets.append({
                        "symbol": asset["symbol"],
                        "mic_code": asset["mic_code"],
                        "exchange": asset["exchange"],
                        "currency": asset.get("currency"),
                        "name": asset["name"],
                        "country": asset.get("country"),
                        "currency": asset.get("currency"),
                        "updated_at": datetime.utcnow()
                    })

                if valid_assets:
                    await db.execute(
                        text("""
                            INSERT INTO assets_list (symbol, mic_code, exchange, currency, name, country, currency, updated_at)
                            VALUES (:symbol, :mic_code, :exchange, :currency, :name, :country, :currency, :updated_at)
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


async def update_crypto_list():
    """
    Fetch and update the complete cryptocurrency list from TwelveData.

    Each crypto is uniquely identified by (symbol, mic_code):
    - symbol: The ticker symbol (e.g., "BTC/USD")
    - available_exchanges: ARRAY of exchanges where the crypto is traded
    """
    print(f"[{datetime.utcnow()}] Updating cryptocurrency list...")

    provider = TwelveDataProvider()

    try:
        # Fetch cryptocurrencies from API
        cryptos = await provider.get_crypto_list()

        # Async database operations
        async with AsyncSessionLocal() as db:
            try:
                # Delete existing cryptocurrencies
                await db.execute(text("DELETE FROM crypto_list"))

                # Prepare batch insert
                valid_cryptos = []
                for crypto in cryptos:
                    # Skip cryptos without required fields
                    if not crypto.get('symbol') or not crypto.get('available_exchanges'):
                        continue

                    valid_cryptos.append({
                        "symbol": crypto["symbol"],
                        "available_exchanges": crypto["available_exchanges"],
                        "currency_base": crypto.get("currency_base"),
                        "currency_quote": crypto.get("currency_quote"),
                        "updated_at": datetime.utcnow()
                    })

                # Batch insert with composite primary key (symbol, mic_code)
                if valid_cryptos:
                    await db.execute(
                        text("""
                            INSERT INTO crypto_list (symbol, available_exchanges, currency_base, currency_quote, updated_at)
                            VALUES (:symbol, :available_exchanges, :currency_base, :currency_quote, :updated_at)
                            ON CONFLICT (symbol) DO UPDATE SET
                                available_exchanges = EXCLUDED.available_exchanges,
                                currency_base = EXCLUDED.currency_base,
                                currency_quote = EXCLUDED.currency_quote,
                                updated_at = EXCLUDED.updated_at
                        """),
                        valid_cryptos
                    )

                await db.commit()
                print(
                    f"✅ Successfully updated {len(valid_cryptos)} cryptocurrencies")

            except Exception as e:
                print(f"❌ Error updating cryptocurrencies in DB: {e}")
                await db.rollback()
                raise

    except Exception as e:
        print(f"❌ Error in update_crypto_list: {e}")
