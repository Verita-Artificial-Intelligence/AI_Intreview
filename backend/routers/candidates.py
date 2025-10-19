from fastapi import APIRouter
from typing import List, Optional
from models import Candidate, CandidateCreate
from services import CandidateService

router = APIRouter(prefix="/candidates", tags=["Candidates"])


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
