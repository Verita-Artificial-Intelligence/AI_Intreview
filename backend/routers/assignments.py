from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from dependencies import require_admin_user
from services.assignment_service import AssignmentService
from models.assignment import AssignmentCreate, Assignment
import logging

router = APIRouter(dependencies=[Depends(require_admin_user)])
logger = logging.getLogger(__name__)


@router.post("", response_model=Assignment)
async def create_assignment(assignment_data: AssignmentCreate):
    """Create a new assignment"""
    try:
        return await AssignmentService.create_assignment(assignment_data)
    except Exception as e:
        logger.error(f"Error creating assignment: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk")
async def create_bulk_assignments(assignments: List[AssignmentCreate]):
    """Create multiple assignments at once"""
    try:
        return await AssignmentService.create_bulk_assignments_direct(assignments)
    except Exception as e:
        logger.error(f"Error creating bulk assignments: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/candidate/{candidate_id}")
async def get_candidate_assignments(candidate_id: str):
    """Get all assignments for a specific candidate"""
    try:
        from repositories.assignment_repository import AssignmentRepository

        assignments = await AssignmentRepository.find_by_candidate(candidate_id)
        return {"assignments": assignments}
    except Exception as e:
        logger.error(f"Error fetching candidate assignments: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{assignment_id}")
async def delete_assignment(assignment_id: str):
    """Delete an assignment"""
    try:
        from repositories.assignment_repository import AssignmentRepository

        result = await AssignmentRepository.delete(assignment_id)
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting assignment: {e}")
        raise HTTPException(status_code=400, detail=str(e))
