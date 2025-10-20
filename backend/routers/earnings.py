from fastapi import APIRouter
from typing import List
from models import Earning, EarningsSummary
from services.earnings_service import EarningsService

router = APIRouter()


@router.get("/user/{user_id}", response_model=List[Earning])
async def get_user_earnings(user_id: str):
    """Get all earnings for a user"""
    return await EarningsService.get_user_earnings(user_id)


@router.get("/user/{user_id}/summary", response_model=EarningsSummary)
async def get_earnings_summary(user_id: str):
    """Get earnings summary for a user"""
    return await EarningsService.get_earnings_summary(user_id)


@router.get("/user/{user_id}/transactions")
async def get_earnings_transactions(user_id: str):
    """Get earnings with transaction details for display"""
    return await EarningsService.get_earnings_with_details(user_id)
