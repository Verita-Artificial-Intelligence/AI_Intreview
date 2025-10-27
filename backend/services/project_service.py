from fastapi import HTTPException
from typing import List, Optional, Dict, Any
from models import Project, ProjectCreate, ProjectUpdate
from repositories import (
    ProjectRepository,
    AssignmentRepository,
    InterviewRepository,
    CandidateRepository,
    JobRepository,
)
from utils import prepare_for_mongo, parse_from_mongo
from datetime import datetime, timezone
import math


class ProjectService:
    @staticmethod
    async def create_project(project_data: ProjectCreate) -> Project:
        """Create a new project"""
        # Validate capacity
        if project_data.capacity <= 0:
            raise HTTPException(
                status_code=400, detail="Capacity must be greater than 0"
            )

        # Create project document
        project = Project(**project_data.model_dump())
        project_doc = prepare_for_mongo(project.model_dump())

        # Save to database
        success = await ProjectRepository.create(project_doc)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create project")

        return project

    @staticmethod
    async def get_projects(
        query: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 25,
    ) -> Dict[str, Any]:
        """Get projects with pagination and filters"""
        # Calculate pagination
        skip = (page - 1) * page_size

        # Build filter for counting
        count_filter = {}
        if query:
            count_filter["$or"] = [
                {"name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
            ]
        if status:
            count_filter["status"] = status

        # Get total count
        total = await ProjectRepository.count_documents(count_filter)

        # Get projects
        projects = await ProjectRepository.find_many(
            query=query, status=status, limit=page_size, skip=skip
        )

        # Enrich with assignment counts
        enriched_projects = []
        for project_doc in projects:
            project_doc = parse_from_mongo(project_doc)
            project_id = project_doc["id"]

            # Get assigned count
            assigned_count = await AssignmentRepository.count_by_project(
                project_id, status="active"
            )

            enriched_projects.append(
                {
                    **project_doc,
                    "assigned_count": assigned_count,
                }
            )

        # Calculate pagination info
        total_pages = math.ceil(total / page_size) if total > 0 else 0

        return {
            "items": enriched_projects,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": total_pages,
        }

    @staticmethod
    async def get_project(project_id: str) -> Project:
        """Get a single project by ID"""
        project_doc = await ProjectRepository.find_by_id(project_id)
        if not project_doc:
            raise HTTPException(status_code=404, detail="Project not found")

        project_doc = parse_from_mongo(project_doc)
        return Project(**project_doc)

    @staticmethod
    async def update_project(project_id: str, project_data: ProjectUpdate) -> Project:
        """Update a project"""
        # Check if project exists
        existing = await ProjectRepository.find_by_id(project_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Project not found")

        # Build update fields
        update_fields = {}
        if project_data.name is not None:
            update_fields["name"] = project_data.name
        if project_data.description is not None:
            update_fields["description"] = project_data.description
        if project_data.status is not None:
            update_fields["status"] = project_data.status
        if project_data.capacity is not None:
            if project_data.capacity <= 0:
                raise HTTPException(
                    status_code=400, detail="Capacity must be greater than 0"
                )
            update_fields["capacity"] = project_data.capacity
        if project_data.roles is not None:
            # Convert RoleDefinition models to dicts
            update_fields["roles"] = [role.model_dump() for role in project_data.roles]

        # Set updated_at
        update_fields["updated_at"] = datetime.now(timezone.utc)

        # Update in database
        if update_fields:
            modified_count = await ProjectRepository.update_fields(
                project_id, update_fields
            )
            if modified_count == 0:
                raise HTTPException(status_code=500, detail="Failed to update project")

        # Fetch and return updated project
        return await ProjectService.get_project(project_id)

    @staticmethod
    async def get_candidate_pool(
        project_id: str, sort: str = "score_desc", filter_pass: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all accepted candidates available for assignment to this project.

        Args:
            project_id: The project ID
            sort: Sort order (score_desc, score_asc, date_desc)
            filter_pass: If True, only show candidates with score >= 70

        Returns:
            List of candidates with interview scores
        """
        # Verify project exists
        await ProjectService.get_project(project_id)

        # Get all active assignments for this project
        assignments = await AssignmentRepository.find_by_project(project_id, "active")
        assigned_candidate_ids = {a["candidate_id"] for a in assignments}

        # Query accepted interviews with analysis results
        from database import db

        pipeline = [
            # Match accepted interviews
            {"$match": {"acceptance_status": "accepted"}},
            # Lookup candidate info from users collection
            {
                "$lookup": {
                    "from": "users",
                    "localField": "candidate_id",
                    "foreignField": "id",
                    "as": "candidate",
                }
            },
            {"$unwind": "$candidate"},
            # Lookup job info
            {
                "$lookup": {
                    "from": "jobs",
                    "localField": "job_id",
                    "foreignField": "id",
                    "as": "job",
                }
            },
            {"$unwind": "$job"},
        ]

        # Execute aggregation
        cursor = db.interviews.aggregate(pipeline)
        interviews = await cursor.to_list(1000)

        # Process results
        pool = []
        for interview_doc in interviews:
            candidate_id = interview_doc["candidate_id"]

            # Skip if already assigned to this project
            if candidate_id in assigned_candidate_ids:
                continue

            candidate = interview_doc["candidate"]
            job = interview_doc["job"]
            analysis_result = interview_doc.get("analysis_result")

            # Extract score
            score = None
            score_status = "pending"
            pass_status = None

            if analysis_result:
                if isinstance(analysis_result, dict):
                    score = analysis_result.get("overall_score")
                    if score is not None:
                        score_status = "scored"
                        pass_status = "pass" if score >= 70 else "fail"
                    elif "error" in analysis_result:
                        score_status = "error"
                else:
                    score_status = "error"
            elif interview_doc.get("analysis_status") == "failed":
                score_status = "error"

            # Apply pass filter
            if filter_pass and (pass_status != "pass"):
                continue

            pool.append(
                {
                    "candidateId": candidate_id,
                    "candidateName": candidate.get("name", "Unknown"),
                    "candidateEmail": candidate.get("email", ""),
                    "interviewId": interview_doc["id"],
                    "jobId": interview_doc["job_id"],
                    "jobTitle": job.get("job_title", "Unknown Job"),
                    "score": score,
                    "scoreStatus": score_status,
                    "passStatus": pass_status,
                    "acceptedDate": interview_doc.get("accepted_at"),
                    "lastActivity": interview_doc.get("updated_at")
                    or interview_doc.get("completed_at"),
                }
            )

        # Sort results
        if sort == "score_desc":
            pool.sort(key=lambda x: x["score"] or -1, reverse=True)
        elif sort == "score_asc":
            pool.sort(key=lambda x: x["score"] or float("inf"))
        elif sort == "date_desc":
            pool.sort(
                key=lambda x: x["acceptedDate"]
                or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True,
            )

        return pool

    @staticmethod
    async def get_assignments(project_id: str) -> List[Dict[str, Any]]:
        """Get all active assignments for a project with candidate details"""
        # Verify project exists
        await ProjectService.get_project(project_id)

        # Get assignments
        assignments = await AssignmentRepository.find_by_project(project_id, "active")

        # Enrich with candidate info
        enriched = []
        for assignment in assignments:
            candidate_doc = await CandidateRepository.find_by_id(
                assignment["candidate_id"]
            )
            if candidate_doc:
                candidate_doc = parse_from_mongo(candidate_doc)
                enriched.append(
                    {
                        "assignmentId": assignment["id"],
                        "candidateId": assignment["candidate_id"],
                        "candidateName": candidate_doc.get("name", "Unknown"),
                        "candidateEmail": candidate_doc.get("email", ""),
                        "role": assignment.get("role"),
                        "status": assignment["status"],
                        "assignedDate": assignment["created_at"],
                    }
                )

        # Sort by assigned date descending
        enriched.sort(key=lambda x: x["assignedDate"], reverse=True)

        return enriched

    @staticmethod
    async def check_capacity(project_id: str, add_count: int) -> bool:
        """
        Check if project has capacity for additional assignments.

        Args:
            project_id: The project ID
            add_count: Number of assignments to add

        Returns:
            True if capacity allows, False otherwise
        """
        project = await ProjectService.get_project(project_id)
        current_count = await AssignmentRepository.count_by_project(
            project_id, "active"
        )

        return (current_count + add_count) <= project.capacity
