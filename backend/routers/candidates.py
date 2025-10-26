from fastapi import APIRouter, Body
from typing import List, Optional
from models import Candidate, CandidateCreate
from services import CandidateService
from database import db, get_candidates_collection
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=Candidate)
async def create_candidate(candidate_data: CandidateCreate):
    """Create a new candidate"""
    return await CandidateService.create_candidate(candidate_data)


@router.get("", response_model=List[Candidate])
async def get_candidates(search: Optional[str] = None):
    """Get all candidates with optional search filter"""
    return await CandidateService.get_candidates(search)


@router.get("/{candidate_id}", response_model=Candidate)
async def get_candidate(candidate_id: str):
    """Get a specific candidate by ID"""
    return await CandidateService.get_candidate(candidate_id)


@router.patch("/{candidate_id}/education")
async def update_candidate_education(candidate_id: str, data: dict = Body(...)):
    """Update candidate's education information"""
    try:
        education = data.get("education", "")

        candidates_collection = get_candidates_collection()
        result = await candidates_collection.update_one(
            {"id": candidate_id}, {"$set": {"education": education}}
        )

        if result.modified_count == 0:
            candidate = await candidates_collection.find_one({"id": candidate_id})
            if not candidate:
                return {"success": False, "error": "Candidate not found"}

        logger.info(f"Updated candidate {candidate_id} with education info")
        return {"success": True, "message": "Education updated successfully"}
    except Exception as e:
        logger.error(f"Error updating education: {e}")
        return {"success": False, "error": str(e)}


@router.delete("/{candidate_id}")
async def delete_candidate(candidate_id: str):
    """Delete a candidate and all their interviews"""
    try:
        # Delete all interviews for this candidate
        await db.interviews.delete_many({"candidate_id": candidate_id})

        # Delete the candidate
        await db.candidates.delete_one({"id": candidate_id})

        return {
            "success": True,
            "message": "Candidate and associated interviews deleted successfully",
        }
    except Exception as e:
        logger.error(f"Error deleting candidate: {e}")
        return {"success": False, "error": str(e)}
