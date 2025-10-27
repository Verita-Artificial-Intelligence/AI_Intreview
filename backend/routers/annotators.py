from fastapi import APIRouter, Query, Depends
from typing import Optional
from dependencies import require_admin_user
from database import db
from datetime import datetime
import math
import logging

router = APIRouter(dependencies=[Depends(require_admin_user)])
logger = logging.getLogger(__name__)


@router.get("/accepted")
async def get_accepted_annotators(
    query: Optional[str] = Query(None, description="Search by name or email"),
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    job_id: Optional[str] = Query(None, description="Filter by job ID"),
    status: Optional[str] = Query(
        None, description="Filter by pass/fail status (pass or fail)"
    ),
    sort: str = Query(
        "accepted_date_desc",
        description="Sort order: score_desc, score_asc, accepted_date_desc, accepted_date_asc",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Items per page"),
):
    """
    Get paginated list of accepted candidates with AI interview scores.

    IMPORTANT: This endpoint ONLY returns candidates who have been explicitly
    accepted as annotators (acceptance_status: "accepted"). Regular candidates
    who have not been accepted as annotators will NOT appear in this list.

    Query params:
    - query: Text search on name/email
    - project_id: Filter by project assignment
    - job_id: Filter by job posting
    - status: Filter by pass/fail (pass >= 70, fail < 70)
    - sort: Sort order (score_desc, score_asc, accepted_date_desc, accepted_date_asc)
    - page: Page number (1-indexed)
    - page_size: Items per page (1-100)

    Returns:
    - items: List of candidates with scores
    - total: Total count
    - page: Current page
    - pageSize: Page size
    - totalPages: Total pages
    """
    # Build aggregation pipeline
    pipeline = [
        # CRITICAL: Only show candidates who have been explicitly accepted as annotators
        # This filters out all candidates who are not in the accepted pool
        {"$match": {"acceptance_status": "accepted"}},
        # Lookup candidate info
        {
            "$lookup": {
                "from": "users",
                "localField": "candidate_id",
                "foreignField": "id",
                "as": "candidate",
            }
        },
        {"$unwind": "$candidate"},
        # Additional validation: Ensure candidate exists and has required fields
        {
            "$match": {
                "candidate.name": {"$exists": True, "$ne": None},
                "candidate.email": {"$exists": True, "$ne": None},
            }
        },
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
        # Lookup assignments (for project info)
        {
            "$lookup": {
                "from": "assignments",
                "let": {"candidate_id": "$candidate_id"},
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": ["$candidate_id", "$$candidate_id"]},
                                    {"$eq": ["$status", "active"]},
                                ]
                            }
                        }
                    },
                    {"$limit": 1},
                ],
                "as": "assignment",
            }
        },
    ]

    # Apply filters
    match_stage = {}

    # Text search on name/email
    if query:
        match_stage["$or"] = [
            {"candidate.name": {"$regex": query, "$options": "i"}},
            {"candidate.email": {"$regex": query, "$options": "i"}},
        ]

    # Job filter
    if job_id:
        match_stage["job_id"] = job_id

    # Project filter
    if project_id:
        if project_id == "unassigned":
            # Show only candidates not assigned to any project
            match_stage["assignment"] = {"$size": 0}
        else:
            # Show only candidates assigned to specific project
            match_stage["assignment.project_id"] = project_id

    if match_stage:
        pipeline.append({"$match": match_stage})

    # Add computed fields
    pipeline.append(
        {
            "$addFields": {
                "score": {
                    "$cond": {
                        "if": {"$isNumber": "$analysis_result.overall_score"},
                        "then": "$analysis_result.overall_score",
                        "else": None,
                    }
                },
                "scoreStatus": {
                    "$cond": {
                        "if": {"$isNumber": "$analysis_result.overall_score"},
                        "then": "scored",
                        "else": {
                            "$cond": {
                                "if": {"$eq": ["$analysis_status", "failed"]},
                                "then": "error",
                                "else": "pending",
                            }
                        },
                    }
                },
                "passStatus": {
                    "$cond": {
                        "if": {"$isNumber": "$analysis_result.overall_score"},
                        "then": {
                            "$cond": {
                                "if": {"$gte": ["$analysis_result.overall_score", 70]},
                                "then": "pass",
                                "else": "fail",
                            }
                        },
                        "else": None,
                    }
                },
            }
        }
    )

    # Apply pass/fail filter
    if status:
        if status == "pass":
            pipeline.append({"$match": {"passStatus": "pass"}})
        elif status == "fail":
            pipeline.append({"$match": {"passStatus": "fail"}})

    # Count total before pagination
    count_pipeline = pipeline.copy()
    count_pipeline.append({"$count": "total"})
    count_result = await db.interviews.aggregate(count_pipeline).to_list(1)
    total = count_result[0]["total"] if count_result else 0

    # Apply sorting
    sort_field = "accepted_at"
    sort_direction = -1  # descending

    if sort == "score_desc":
        sort_field = "score"
        sort_direction = -1
    elif sort == "score_asc":
        sort_field = "score"
        sort_direction = 1
    elif sort == "accepted_date_asc":
        sort_field = "accepted_at"
        sort_direction = 1

    # Handle null scores (put at end for descending, at start for ascending)
    if sort_field == "score":
        pipeline.append(
            {
                "$addFields": {
                    "sortScore": {
                        "$cond": {
                            "if": {"$eq": ["$score", None]},
                            "then": -999 if sort_direction == -1 else 999,
                            "else": "$score",
                        }
                    }
                }
            }
        )
        pipeline.append({"$sort": {"sortScore": sort_direction}})
    else:
        pipeline.append({"$sort": {sort_field: sort_direction}})

    # Apply pagination
    skip = (page - 1) * page_size
    pipeline.append({"$skip": skip})
    pipeline.append({"$limit": page_size})

    # Project final shape
    pipeline.append(
        {
            "$project": {
                "_id": 0,
                "candidateId": "$candidate_id",
                "candidateName": "$candidate.name",
                "candidateEmail": "$candidate.email",
                "interviewId": "$id",
                "jobId": "$job_id",
                "jobTitle": "$job.job_title",
                "projectCount": {"$size": "$assignment"},
                "projectIds": {
                    "$map": {
                        "input": "$assignment",
                        "as": "assign",
                        "in": "$$assign.project_id",
                    }
                },
                "score": "$score",
                "scoreStatus": "$scoreStatus",
                "passStatus": "$passStatus",
                "acceptedDate": "$accepted_at",
                "lastActivity": {"$ifNull": ["$updated_at", "$completed_at"]},
                "analysisStatus": "$analysis_status",
            }
        }
    )

    # Execute pipeline
    items = await db.interviews.aggregate(pipeline).to_list(page_size)

    # No need to enrich with project names since we're showing count

    # Calculate total pages
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
    }
