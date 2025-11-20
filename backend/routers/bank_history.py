"""
FILE LOCATION: backend/routers/bank_history.py

Bank History Router - Handle CSV uploads for transaction history
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, date

from database.database import get_db
from database.models import BankHistory, User, Asset, AssetType
from dependencies.auth_dependencies import get_current_user
from csv_parser import CSVParser
from statistics.portfolio_value_updater import update_user_portfolio_value

router = APIRouter(prefix="/bank_history", tags=["bank_history"])


class BankHistoryResponse(BaseModel):
    id: int
    user_id: int
    asset_id: Optional[int]
    date_start: date
    date_end: date
    incomes: float
    expenses: float
    final_balance: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[BankHistoryResponse])
def get_my_bank_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all bank history records for current user"""
    records = db.query(BankHistory).filter(
        BankHistory.user_id == user.id
    ).order_by(BankHistory.date_start.desc()).all()

    return records


@router.post("/upload", response_model=BankHistoryResponse)
async def upload_bank_csv(
    file: UploadFile = File(...),
    asset_id: Optional[int] = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload and parse a bank CSV file

    The CSV will be intelligently parsed by AI, which will:
    - Automatically skip header and footer rows
    - Detect transaction columns (dates, amounts, descriptions, balance)
    - Handle various CSV formats (signed amounts or split debit/credit)
    - Calculate totals and date ranges

    The system supports messy CSV files with metadata rows at the top/bottom.
    """

    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported"
        )

    # Validate asset_id if provided
    if asset_id:
        asset = db.query(Asset).filter(
            Asset.id == asset_id,
            Asset.user_id == user.id,
            Asset.type == AssetType.SAVINGS
        ).first()

        if not asset:
            raise HTTPException(
                status_code=404,
                detail="Savings asset not found or does not belong to you"
            )

    # Read CSV content
    try:
        csv_content = await file.read()
        csv_text = csv_content.decode('utf-8')
    except UnicodeDecodeError:
        # Try with different encoding if UTF-8 fails
        try:
            csv_text = csv_content.decode('windows-1252')
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to read CSV file. Please ensure it's a valid CSV with UTF-8 or Windows-1252 encoding."
            )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read CSV file: {str(e)}"
        )

    # Parse CSV using Claude API
    parser = CSVParser()

    try:
        parsed_data = parser.parse_csv(csv_text, asset_id)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"CSV parsing error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse CSV. The file may be in an unsupported format. Error: {str(e)}"
        )

    # Validate date range doesn't overlap with existing records
    date_start = parsed_data['date_start']
    date_end = parsed_data['date_end']

    overlapping_records = db.query(BankHistory).filter(
        BankHistory.user_id == user.id,
        or_(
            # New record starts during existing record
            and_(
                BankHistory.date_start <= date_start,
                BankHistory.date_end >= date_start
            ),
            # New record ends during existing record
            and_(
                BankHistory.date_start <= date_end,
                BankHistory.date_end >= date_end
            ),
            # New record completely contains existing record
            and_(
                BankHistory.date_start >= date_start,
                BankHistory.date_end <= date_end
            )
        )
    ).first()

    if overlapping_records:
        raise HTTPException(
            status_code=400,
            detail=f"Date range {date_start} to {date_end} overlaps with existing record from {overlapping_records.date_start} to {overlapping_records.date_end}. Please delete the existing record first or upload a CSV with a different date range."
        )

    # Create bank history record
    bank_history = BankHistory(
        user_id=user.id,
        asset_id=asset_id,
        date_start=date_start,
        date_end=date_end,
        incomes=parsed_data['incomes'],
        expenses=parsed_data['expenses'],
        final_balance=parsed_data['final_balance']
    )

    db.add(bank_history)
    db.commit()
    db.refresh(bank_history)

    savings_asset = db.query(Asset).filter(
        Asset.id == asset_id
    ).first() if asset_id else None

    if savings_asset:
        # Update linked savings asset's current balance
        savings_asset.purchase_price = bank_history.final_balance
        db.commit()
        db.refresh(savings_asset)
        await update_user_portfolio_value(savings_asset.user_id, False)

    return bank_history


@router.delete("/{history_id}")
def delete_bank_history(
    history_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a bank history record"""
    record = db.query(BankHistory).filter(
        BankHistory.id == history_id,
        BankHistory.user_id == user.id
    ).first()

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Bank history record not found"
        )

    db.delete(record)
    db.commit()

    return {"message": "Bank history record deleted successfully"}
