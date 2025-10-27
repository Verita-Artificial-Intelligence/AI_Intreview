from fastapi import HTTPException
from typing import List, Dict, Any
from models import Assignment, AssignmentCreate, BulkAssignmentCreate
from repositories import (
    AssignmentRepository,
    InterviewRepository,
    ProjectRepository,
)
from utils import prepare_for_mongo
from datetime import datetime, timezone
import logging
import asyncio

logger = logging.getLogger(__name__)


class AssignmentService:
    @staticmethod
    async def create_assignment(assignment_data: AssignmentCreate) -> Assignment:
        """
        Create a single assignment.

        Args:
            assignment_data: Assignment creation data

        Returns:
            Created assignment
        """
        # Validate project exists
        project_doc = await ProjectRepository.find_by_id(assignment_data.project_id)
        if not project_doc:
            raise HTTPException(status_code=404, detail="Project not found")

        # Check if candidate already assigned
        existing = await AssignmentRepository.find_by_project_and_candidate(
            assignment_data.project_id, assignment_data.candidate_id
        )
        if existing:
            raise HTTPException(
                status_code=400, detail="Candidate already assigned to this project"
            )

        # Get interview for candidate (find accepted interview)
        interviews = await InterviewRepository.find_many(
            candidate_id=assignment_data.candidate_id
        )
        accepted_interview = next(
            (i for i in interviews if i.get("acceptance_status") == "accepted"),
            None,
        )

        if not accepted_interview:
            raise HTTPException(
                status_code=400, detail="No accepted interview found for candidate"
            )

        # Create assignment
        assignment = Assignment(
            project_id=assignment_data.project_id,
            candidate_id=assignment_data.candidate_id,
            interview_id=accepted_interview["id"],
            role=assignment_data.role,
        )

        assignment_doc = prepare_for_mongo(assignment.model_dump())
        success = await AssignmentRepository.create(assignment_doc)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to create assignment")

        # Update interview with project_id
        await InterviewRepository.update_fields(
            accepted_interview["id"], {"project_id": assignment_data.project_id}
        )

        # Trigger email asynchronously
        asyncio.create_task(AssignmentService._trigger_assignment_email(assignment))

        return assignment

    @staticmethod
    async def create_bulk_assignments_direct(
        assignments: List[AssignmentCreate],
    ) -> Dict[str, Any]:
        """
        Create multiple assignments directly (without project validation).

        Args:
            assignments: List of assignment creation data

        Returns:
            Success info with created assignment IDs
        """
        created_assignments = []
        errors = []

        for assignment_data in assignments:
            try:
                # Check if candidate already assigned to this project
                existing = await AssignmentRepository.find_by_project_and_candidate(
                    assignment_data.project_id, assignment_data.candidate_id
                )
                if existing:
                    errors.append(
                        {
                            "candidate_id": assignment_data.candidate_id,
                            "error": "Candidate already assigned to this project",
                        }
                    )
                    continue

                # Get interview for candidate (find accepted interview)
                interviews = await InterviewRepository.find_many(
                    candidate_id=assignment_data.candidate_id
                )
                accepted_interview = next(
                    (i for i in interviews if i.get("acceptance_status") == "accepted"),
                    None,
                )

                if not accepted_interview:
                    errors.append(
                        {
                            "candidate_id": assignment_data.candidate_id,
                            "error": "No accepted interview found for candidate",
                        }
                    )
                    continue

                # Create assignment
                assignment = Assignment(
                    project_id=assignment_data.project_id,
                    candidate_id=assignment_data.candidate_id,
                    interview_id=accepted_interview["id"],
                    role=assignment_data.role,
                )

                assignment_doc = prepare_for_mongo(assignment.model_dump())
                success = await AssignmentRepository.create(assignment_doc)

                if success:
                    created_assignments.append(assignment)

                    # Update interview with project_id
                    await InterviewRepository.update_fields(
                        accepted_interview["id"],
                        {"project_id": assignment_data.project_id},
                    )
                else:
                    errors.append(
                        {
                            "candidate_id": assignment_data.candidate_id,
                            "error": "Failed to create assignment record",
                        }
                    )

            except Exception as e:
                logger.error(
                    f"Error creating assignment for candidate {assignment_data.candidate_id}: {e}"
                )
                errors.append(
                    {
                        "candidate_id": assignment_data.candidate_id,
                        "error": str(e),
                    }
                )

        # Trigger emails asynchronously for successful assignments
        for assignment in created_assignments:
            asyncio.create_task(AssignmentService._trigger_assignment_email(assignment))

        return {
            "success": len(created_assignments) > 0,
            "created": len(created_assignments),
            "errors": errors,
            "assignment_ids": [a.id for a in created_assignments],
        }

    @staticmethod
    async def create_bulk_assignments(
        project_id: str, bulk_data: BulkAssignmentCreate
    ) -> Dict[str, Any]:
        """
        Create multiple assignments at once.

        Args:
            project_id: The project ID
            bulk_data: Bulk assignment data with list of assignments

        Returns:
            Success info with created assignment IDs
        """
        # Validate project exists
        project_doc = await ProjectRepository.find_by_id(project_id)
        if not project_doc:
            raise HTTPException(status_code=404, detail="Project not found")

        # Check capacity
        add_count = len(bulk_data.assignments)
        current_count = await AssignmentRepository.count_by_project(
            project_id, "active"
        )
        capacity = project_doc.get("capacity", 0)

        if (current_count + add_count) > capacity:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot assign {add_count} candidates. Project capacity: {capacity}, current: {current_count}",
            )

        # Process each assignment
        created_assignments = []
        errors = []

        for assignment_data in bulk_data.assignments:
            try:
                # Check if candidate already assigned
                existing = await AssignmentRepository.find_by_project_and_candidate(
                    project_id, assignment_data.candidate_id
                )
                if existing:
                    errors.append(
                        {
                            "candidate_id": assignment_data.candidate_id,
                            "error": "Candidate already assigned to this project",
                        }
                    )
                    continue

                # Get interview for candidate (find accepted interview)
                interviews = await InterviewRepository.find_many(
                    candidate_id=assignment_data.candidate_id
                )
                accepted_interview = next(
                    (i for i in interviews if i.get("acceptance_status") == "accepted"),
                    None,
                )

                if not accepted_interview:
                    errors.append(
                        {
                            "candidate_id": assignment_data.candidate_id,
                            "error": "No accepted interview found for candidate",
                        }
                    )
                    continue

                # Create assignment
                assignment = Assignment(
                    project_id=project_id,
                    candidate_id=assignment_data.candidate_id,
                    interview_id=accepted_interview["id"],
                    role=assignment_data.role,
                )

                assignment_doc = prepare_for_mongo(assignment.model_dump())
                success = await AssignmentRepository.create(assignment_doc)

                if success:
                    created_assignments.append(assignment)

                    # Update interview with project_id
                    await InterviewRepository.update_fields(
                        accepted_interview["id"], {"project_id": project_id}
                    )
                else:
                    errors.append(
                        {
                            "candidate_id": assignment_data.candidate_id,
                            "error": "Failed to create assignment record",
                        }
                    )

            except Exception as e:
                logger.error(
                    f"Error creating assignment for candidate {assignment_data.candidate_id}: {e}"
                )
                errors.append(
                    {
                        "candidate_id": assignment_data.candidate_id,
                        "error": str(e),
                    }
                )

        # Trigger emails asynchronously for successful assignments
        for assignment in created_assignments:
            asyncio.create_task(AssignmentService._trigger_assignment_email(assignment))

        return {
            "success": len(created_assignments) > 0,
            "created": len(created_assignments),
            "errors": errors,
            "assignment_ids": [a.id for a in created_assignments],
        }

    @staticmethod
    async def unassign_candidate(project_id: str, assignment_id: str) -> Dict[str, Any]:
        """
        Remove a candidate from a project.

        Args:
            project_id: The project ID
            assignment_id: The assignment ID

        Returns:
            Success message
        """
        # Find assignment
        assignment = await AssignmentRepository.find_by_id(assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

        # Verify it belongs to project
        if assignment["project_id"] != project_id:
            raise HTTPException(
                status_code=400, detail="Assignment does not belong to this project"
            )

        # Update status to "removed"
        update_fields = {
            "status": "removed",
            "updated_at": datetime.now(timezone.utc),
        }

        modified_count = await AssignmentRepository.update_fields(
            assignment_id, update_fields
        )

        if modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to unassign candidate")

        # Clear project_id from interview
        await InterviewRepository.update_fields(
            assignment["interview_id"], {"project_id": None}
        )

        return {"success": True, "message": "Candidate unassigned successfully"}

    @staticmethod
    async def _trigger_assignment_email(assignment: Assignment):
        """
        Trigger assignment email (async, non-blocking).

        Args:
            assignment: The assignment object
        """
        # Import here to avoid circular dependency
        try:
            from services.email_service import EmailService

            await EmailService.send_assignment_email(assignment)
        except Exception as e:
            logger.error(f"Failed to send assignment email for {assignment.id}: {e}")
