"""
Crypto updater module to update crypto assets current prices
"""
from typing import Dict
from dateutil.relativedelta import relativedelta
import os
# from dotenv import load_dotenv
# load_dotenv()  # noqa

from fastapi import Depends
import requests
import asyncio
from datetime import datetime, timezone
import httpx
from sqlalchemy.orm import Session
from typing import List, Dict
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from database.database import AsyncSessionLocal, SessionLocal, get_async_db
from database.models import Asset, AssetType, AssetPrice

example_bond_settings = {"capitalizationOfInterest": True, "capitalizationFrequency": 12, "interestRateResetsFrequency": 12, "bondType": "fixed",
                         "maturityDate": "2029-11-17T13:29:00.000Z", "interestRates": {"1": {"rate": 4.5}, "2": {"rate": 2}, "3": {"rate": 2}, "4": {"rate": 2}}}


def calculate_bond_value(
    purchase_price: float,
    capitalization_of_interest: bool,
    capitalization_frequency: int = None,  # w miesiącach lub None
    interestRateResetsFrequency: int = 12,  # w miesiącach
    purchase_date: str = None,
    maturity_date: str = None,
    interest_rates: dict = None,
    calculate_maturity_value: bool = False
) -> float:
    """
    Calculate current or maturity value of a bond with daily accrual,
    considering interest rate resets every interestRateResetsFrequency months.
    """

    print("Calculating bond value with settings:", {
        "purchase_price": purchase_price,
        "maturity_date": maturity_date,
        "calculating_maturity_value": calculate_maturity_value
    })

    if not purchase_date or not maturity_date or not interest_rates:
        raise ValueError(
            "purchase_date, maturity_date, and interest_rates must be provided")

    # Daty offset-aware w UTC
    purchase_dt = datetime.fromisoformat(purchase_date.replace("Z", ""))
    maturity_dt = datetime.fromisoformat(maturity_date.replace("Z", ""))

    end_dt = maturity_dt if calculate_maturity_value else datetime.utcnow()
    if end_dt < purchase_dt:
        raise ValueError("End date is before purchase date")

    principal = purchase_price
    accrued_interest = 0.0
    current_dt = purchase_dt

    while current_dt < end_dt:
        # Obliczamy numer okresu resetu stopy procentowej
        months_passed = ((current_dt.year - purchase_dt.year) * 12 +
                         (current_dt.month - purchase_dt.month)) // interestRateResetsFrequency + 1
        # Pobieramy stopę procentową dla tego okresu, jeśli brak → ostatnia dostępna
        rate_info = interest_rates.get(str(months_passed),
                                       interest_rates.get(str(max(map(int, interest_rates.keys())))))
        annual_rate = rate_info["rate"] / 100

        # Wyznaczamy następny reset stopy procentowej
        next_reset_dt = current_dt + \
            relativedelta(months=interestRateResetsFrequency)

        # Wyznaczamy następny moment kapitalizacji
        if capitalization_of_interest and capitalization_frequency is not None:
            next_capitalization_dt = current_dt + \
                relativedelta(months=capitalization_frequency)
        else:
            next_capitalization_dt = maturity_dt  # brak kapitalizacji w trakcie

        # Wybieramy najbliższe zdarzenie
        next_dt = min(next_reset_dt, next_capitalization_dt,
                      end_dt, maturity_dt)

        # Liczymy liczbę dni w tym okresie
        days = (next_dt - current_dt).days
        daily_rate = annual_rate / 365
        accrued_interest += principal * daily_rate * days

        # Kapitalizacja odsetek
        if capitalization_of_interest and capitalization_frequency is not None and next_dt == next_capitalization_dt:
            principal += accrued_interest
            accrued_interest = 0.0

        # Przechodzimy do następnego zdarzenia
        current_dt = next_dt

    # Końcowa wartość obligacji
    return principal + accrued_interest


async def update_bonds_prices(async_db: AsyncSession, assets: List[Asset]) -> None:
    """Update current prices for all crypto assets with auto_update enabled"""

    # Update prices concurrently
    for asset in assets:
        if asset.type != AssetType.BONDS:
            continue
        if not asset.bond_settings:
            continue

        bond_settings = asset.bond_settings

        new_price = calculate_bond_value(
            purchase_price=asset.purchase_price,
            capitalization_of_interest=bond_settings.get(
                "capitalizationOfInterest", False),
            capitalization_frequency=bond_settings.get(
                "capitalizationFrequency", None),
            interestRateResetsFrequency=bond_settings.get(
                "interestRateResetsFrequency", 12),
            purchase_date=asset.purchase_date.isoformat()
            if asset.purchase_date else None,
            maturity_date=bond_settings.get("maturityDate", None),
            interest_rates=bond_settings.get("interestRates", None),
            calculate_maturity_value=False
        )

        asset.current_price = new_price

    await async_db.commit()
