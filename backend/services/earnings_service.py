from fastapi import HTTPException
from typing import List
from models import Earning, EarningsSummary
from utils import prepare_for_mongo
from database import (
    get_earnings_collection,
    get_annotations_collection,
    get_jobs_collection,
)
from datetime import datetime, timezone


class EarningsService:
    # Default hourly rate estimate per task (assumes 0.5 hour per task)
    DEFAULT_TASK_HOURS = 0.5

    @staticmethod
    async def calculate_task_payment(job_id: str) -> float:
        """Calculate payment for a task based on job's hourly rate"""
        jobs_collection = get_jobs_collection()

        job = await jobs_collection.find_one({"id": job_id}, {"_id": 0})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        pay_per_hour = job.get("pay_per_hour", 0)
        if not pay_per_hour:
            return 0

        # Calculate payment assuming DEFAULT_TASK_HOURS per task
        return pay_per_hour * EarningsService.DEFAULT_TASK_HOURS

    @staticmethod
    async def create_earning_record(user_id: str, task_id: str, job_id: str) -> Earning:
        """Create an earning record when a task is completed"""
        earnings_collection = get_earnings_collection()

        # Calculate payment amount
        amount = await EarningsService.calculate_task_payment(job_id)

        # Create earning record
        earning = Earning(
            user_id=user_id,
            task_id=task_id,
            job_id=job_id,
            amount=amount,
            status="pending",
        )

        doc = prepare_for_mongo(earning.model_dump())
        await earnings_collection.insert_one(doc)
        return earning

    @staticmethod
    async def get_user_earnings(user_id: str) -> List[Earning]:
        """Get all earnings for a user"""
        earnings_collection = get_earnings_collection()

        earnings_docs = (
            await earnings_collection.find({"user_id": user_id}, {"_id": 0})
            .sort("created_at", -1)
            .to_list(1000)
        )

        return [Earning(**doc) for doc in earnings_docs]

    @staticmethod
    async def get_earnings_summary(user_id: str) -> EarningsSummary:
        """Get earnings summary for a user"""
        earnings = await EarningsService.get_user_earnings(user_id)
        annotations_collection = get_annotations_collection()

        # Calculate totals
        total_earnings = sum(e.amount for e in earnings)
        pending_payout = sum(e.amount for e in earnings if e.status == "pending")
        available_balance = sum(e.amount for e in earnings if e.status == "paid")

        # Get completed tasks count
        completed_tasks_count = await annotations_collection.count_documents(
            {"annotator_id": user_id, "status": "completed"}
        )

        # Calculate earnings this month
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        earnings_this_month = sum(
            e.amount for e in earnings if e.created_at >= month_start
        )

        return EarningsSummary(
            total_earnings=total_earnings,
            pending_payout=pending_payout,
            available_balance=available_balance,
            completed_tasks_count=completed_tasks_count,
            earnings_this_month=earnings_this_month,
        )

    @staticmethod
    async def get_earnings_with_details(user_id: str):
        """Get earnings with job details for display"""
        earnings = await EarningsService.get_user_earnings(user_id)
        annotations_collection = get_annotations_collection()
        jobs_collection = get_jobs_collection()

        # Enrich earnings with task and job details
        enriched_earnings = []
        for earning in earnings:
            # Get task details
            task = await annotations_collection.find_one(
                {"id": earning.task_id}, {"_id": 0}
            )

            # Get job details
            job = await jobs_collection.find_one({"id": earning.job_id}, {"_id": 0})

            enriched_earnings.append(
                {
                    "id": earning.id,
                    "amount": earning.amount,
                    "status": earning.status,
                    "created_at": earning.created_at,
                    "paid_at": earning.paid_at,
                    "task_name": (
                        task.get("task_name", "Annotation Task")
                        if task
                        else "Unknown Task"
                    ),
                    "job_title": (
                        job.get("title", "Unknown Job") if job else "Unknown Job"
                    ),
                }
            )

        return enriched_earnings
