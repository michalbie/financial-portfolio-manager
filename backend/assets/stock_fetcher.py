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

from database.database import SessionLocal
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
        async with httpx.AsyncClient() as client:
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


async def update_stock_list():
    """Fetch and update stocks (not prices) in the database"""
    print(f"[{datetime.utcnow()}] Updating stock list...")
    db: Session = SessionLocal()
    provider = TwelveDataProvider()

    async def fetch_and_update():
        stocks = await provider.get_stocks_list()
        
        db.execute(text("DELETE FROM stocks"))
        for stock in stocks:
            db.execute(
                text("INSERT INTO stocks (symbol, name, exchange, country, currency) VALUES (:symbol, :name, :exchange, :country, :currency)"),
                {
                    "symbol": stock["symbol"],
                    "name": stock["name"],
                    "exchange": stock["exchange"],
                    "country": stock["country"],
                    "currency": stock["currency"]
                }
            )

        db.commit()
        db.close()

    await fetch_and_update()
