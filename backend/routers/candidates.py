from fastapi import APIRouter, Body, HTTPException
from typing import List, Optional
from models import Candidate, CandidateCreate, CandidateUpdate
from services import CandidateService
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


@router.patch("/{candidate_id}", response_model=Candidate)
async def update_candidate(candidate_id: str, update_data: CandidateUpdate):
    """
    Update candidate fields.
    Supports partial updates - only provided fields will be updated.
    """
    try:
        return await CandidateService.update_candidate(
            candidate_id, update_data.model_dump(exclude_unset=True)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating candidate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{candidate_id}/education")
async def update_candidate_education(candidate_id: str, data: dict = Body(...)):
    """Update candidate's education information"""
    try:
        education = data.get("education", "")
        result = await CandidateService.update_education(candidate_id, education)
        logger.info(f"Updated candidate {candidate_id} with education info")
        return result
    except Exception as e:
        logger.error(f"Error updating education: {e}")
        return {"success": False, "error": str(e)}


@router.delete("/{candidate_id}")
async def delete_candidate(candidate_id: str):
    """Delete a candidate and all their interviews"""
    try:
        return await CandidateService.delete_candidate(candidate_id)
    except Exception as e:
        logger.error(f"Error deleting candidate: {e}")
        return {"success": False, "error": str(e)}
