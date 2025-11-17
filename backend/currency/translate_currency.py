from database.models import CurrencyExchangeRate
from database.database import SessionLocal


def translate_currency(source_currency_code: str, target_currency_code: str, amount: float) -> float:
    "Translate currency value from source to target currency"
    db = SessionLocal()

    rate = db.query(CurrencyExchangeRate).filter(
        CurrencyExchangeRate.source_currency == source_currency_code,
        CurrencyExchangeRate.target_currency == target_currency_code
    ).first()

    if not rate:
        raise ValueError(
            f"Exchange rate from {source_currency_code} to {target_currency_code} not found")

    db.close()

    return rate.rate * amount
