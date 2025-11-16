from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from assets.asset_fetcher import TwelveDataProvider
from database.database import AsyncSessionLocal


async def update_currencies():
    """Update currency exchange rates in the database (currency_exchange_rates table)"""
    print(f"[{datetime.utcnow()}] Updating currency exchange rates...")

    provider = TwelveDataProvider()

    try:
        # Fetch currency exchange rates from API
        exchange_rates = await provider.get_currency_exchange_rates()

        # Async database operations
        async with AsyncSessionLocal() as db:
            try:
                # Delete existing exchange rates
                await db.execute(text("DELETE FROM currency_exchange_rates"))

                # Prepare batch insert
                valid_rates = []
                for rate in exchange_rates:
                    # Skip rates without required fields
                    if not rate.get('timestamp') or not rate.get('rate') or not rate.get('symbol'):
                        print(f"❌ Skipping invalid rate data: {rate}")
                        continue

                    valid_rates.append({
                        "source_currency": rate["symbol"].split("/")[0],
                        "target_currency": rate["symbol"].split("/")[1],
                        "rate": float(rate["rate"]),
                        "fetched_at": datetime.utcfromtimestamp(rate["timestamp"])
                    })

                # Batch insert with unique index (source_currency, target_currency)
                if valid_rates:
                    await db.execute(
                        text("""
                            INSERT INTO currency_exchange_rates (source_currency, target_currency, rate, fetched_at)
                            VALUES (:source_currency, :target_currency, :rate, :fetched_at)
                            ON CONFLICT (source_currency, target_currency) DO UPDATE SET
                                rate = EXCLUDED.rate,
                                fetched_at = EXCLUDED.fetched_at
                        """),
                        valid_rates
                    )

                await db.commit()
                print(
                    f"✅ Successfully updated {len(valid_rates)} currency exchange rates")

            except Exception as e:
                print(f"❌ Error updating currency exchange rates in DB: {e}")
                await db.rollback()
                raise

    except Exception as e:
        print(f"❌ Error in update_currencies: {e}")
