from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional
from models import (
    Project,
    ProjectCreate,
    ProjectUpdate,
    BulkAssignmentCreate,
    BulkAssignmentPreview,
)
from services.project_service import ProjectService
from services.assignment_service import AssignmentService
from services.email_service import EmailService
from repositories import EmailSendRepository, AssignmentRepository
from dependencies import require_admin_user
import logging

router = APIRouter(dependencies=[Depends(require_admin_user)])
logger = logging.getLogger(__name__)


@router.get("")
async def get_projects(
    query: Optional[str] = Query(None, description="Search by name or description"),
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Items per page"),
):
    """
    Get paginated list of projects with filters.

    Query params:
    - query: Text search on name/description
    - status: Filter by project status (active/completed/archived)
    - page: Page number (1-indexed)
    - page_size: Items per page (1-100)

    Returns:
    - items: List of projects with assigned counts
    - total: Total count
    - page: Current page
    - pageSize: Page size
    - totalPages: Total pages
    """
    return await ProjectService.get_projects(
        query=query, status=status, page=page, page_size=page_size
    )


@router.post("", response_model=Project)
async def create_project(project_data: ProjectCreate):
    """
    Create a new project.

    Body:
    - name: Project name (required)
    - description: Project description
    - capacity: Total number of candidates needed (required, > 0)
    - roles: Optional list of role definitions
    """
    return await ProjectService.create_project(project_data)


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get a single project by ID"""
    return await ProjectService.get_project(project_id)


@router.patch("/{project_id}", response_model=Project)
async def update_project(project_id: str, project_data: ProjectUpdate):
    """
    Update a project.

    Partial updates are supported - only provide fields you want to change.

    Body:
    - name: New project name
    - description: New description
    - status: New status (active/completed/archived)
    - capacity: New capacity (must be > 0)
    - roles: New role definitions
    """
    return await ProjectService.update_project(project_id, project_data)


@router.get("/{project_id}/candidate-pool")
async def get_candidate_pool(
    project_id: str,
    sort: str = Query(
        "score_desc",
        description="Sort order: score_desc, score_asc, date_desc",
    ),
    filter: str = Query("all", description="Filter: all or pass_only"),
):
    """
    Get available candidates for assignment to this project.

    Candidates are filtered to:
    - Have accepted interview status
    - Not already assigned to this project
    - Meet the filter criteria (all or pass_only for score >= 70)

    Query params:
    - sort: Sort order (score_desc, score_asc, date_desc)
    - filter: Filter by pass status (all, pass_only)

    Returns:
    - List of candidates with scores and interview info
    """
    filter_pass = filter == "pass_only"
    return await ProjectService.get_candidate_pool(
        project_id, sort=sort, filter_pass=filter_pass
    )


@router.get("/{project_id}/assignments")
async def get_assignments(project_id: str):
    """
    Get all active assignments for a project.

    Returns:
    - List of assignments with candidate details
    """
    return await ProjectService.get_assignments(project_id)


@router.post("/{project_id}/assignments/preview")
async def preview_assignment_emails(project_id: str, bulk_data: BulkAssignmentPreview):
    """
    Preview assignment notification emails before sending.

    Returns recipient list and email content without creating assignments.

    Body:
    - assignments: List of {candidate_id, role (optional)}

    Returns:
    - project_name: Name of the project
    - recipients: List of {name, email, role} for each candidate
    - email_subject: Subject line of the email
    - email_body: Plain text email content (sample using first candidate)
    """
    from repositories import CandidateRepository, InterviewRepository
    from services.email_templates import get_assignment_email_text
    from config import settings

    # Verify project exists
    project = await ProjectService.get_project(project_id)

    recipients = []
    first_candidate_name = None
    first_role = None

    for assignment_data in bulk_data.assignments:
        candidate_id = assignment_data.candidate_id
        role = assignment_data.role

        # Fetch candidate details
        candidate_doc = await CandidateRepository.find_by_id(candidate_id)
        if not candidate_doc:
            continue

        candidate_name = candidate_doc.get("name", "Candidate")
        candidate_email = candidate_doc.get("email", "")

        recipients.append(
            {
                "name": candidate_name,
                "email": candidate_email,
                "role": role,
            }
        )

        # Store first candidate's info
        if first_candidate_name is None:
            first_candidate_name = candidate_name
            first_role = role

    # Generate email body
    # If multiple recipients, use template placeholder; if single, use actual name
    if len(recipients) > 1:
        display_name = "[Candidate Name]"
        display_role = first_role  # Use first role as example, or generic if mixed
    else:
        display_name = first_candidate_name or "Candidate"
        display_role = first_role

    sample_email_body = get_assignment_email_text(
        candidate_name=display_name,
        project_name=project.name,
        role=display_role,
        company_name=settings.COMPANY_NAME,
        support_email=settings.SUPPORT_EMAIL,
    )

    email_subject = f"You've been assigned to {project.name}"

    return {
        "project_name": project.name,
        "recipients": recipients,
        "email_subject": email_subject,
        "email_body": sample_email_body,
    }


@router.post("/{project_id}/assignments/bulk")
async def bulk_assign_candidates(project_id: str, bulk_data: BulkAssignmentCreate):
    """
    Bulk assign candidates to a project.

    Checks capacity before assigning and sends notification emails.

    Body:
    - assignments: List of {candidate_id, role (optional)}

    Returns:
    - success: Whether any assignments were created
    - created: Number of successful assignments
    - errors: List of errors for failed assignments
    - assignment_ids: IDs of created assignments
    """
    return await AssignmentService.create_bulk_assignments(project_id, bulk_data)


@router.delete("/{project_id}/assignments/{assignment_id}")
async def unassign_candidate(project_id: str, assignment_id: str):
    """
    Remove a candidate from a project.

    Args:
    - project_id: The project ID
    - assignment_id: The assignment ID to remove

    Returns:
    - success: True if unassigned successfully
    - message: Success message
    """
    return await AssignmentService.unassign_candidate(project_id, assignment_id)


@router.post("/{project_id}/assignments/{assignment_id}/send-email")
async def resend_assignment_email(project_id: str, assignment_id: str):
    """
    Manually resend assignment notification email.

    Useful for failed email sends or when candidate needs reminder.

    Args:
    - project_id: The project ID
    - assignment_id: The assignment ID

    Returns:
    - success: Whether email was sent
    - message: Status message
    - email_send: Email send record
    """
    # Verify assignment belongs to project
    assignment_doc = await AssignmentRepository.find_by_id(assignment_id)
    if not assignment_doc:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment_doc["project_id"] != project_id:
        raise HTTPException(
            status_code=400, detail="Assignment does not belong to this project"
        )

    # Convert to Assignment model
    from models import Assignment

    assignment = Assignment(**assignment_doc)

    # Send email
    try:
        email_send = await EmailService.send_assignment_email(assignment)

        return {
            "success": email_send.status == "sent",
            "message": (
                "Email sent successfully"
                if email_send.status == "sent"
                else f"Email failed: {email_send.error}"
            ),
            "email_send": email_send.model_dump(),
        }
    except Exception as e:
        logger.error(f"Error sending email: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.get("/{project_id}/activity")
async def get_project_activity(project_id: str):
    """
    Get recent activity for a project (assignments and email sends).

    Returns last 50 events including:
    - Assignment creations
    - Email sends (success/failure)
    - Assignment removals

    Args:
    - project_id: The project ID

    Returns:
    - List of activity events with timestamps
    """
    # Verify project exists
    await ProjectService.get_project(project_id)

    # Get email sends for this project
    email_sends = await EmailSendRepository.find_by_project(project_id, limit=50)

    # Get assignments for this project
    from repositories import CandidateRepository

    assignments = await AssignmentRepository.find_by_project(
        project_id, status=None  # Get all statuses
    )

    # Combine into activity log
    activities = []

    # Add email events
    for email_send in email_sends:
        assignment_id = email_send.get("assignment_id")
        # Find the assignment in our list
        assignment = next((a for a in assignments if a["id"] == assignment_id), None)

        if assignment:
            candidate = await CandidateRepository.find_by_id(assignment["candidate_id"])
            candidate_name = (
                candidate.get("name", "Unknown") if candidate else "Unknown"
            )

            event_type = (
                "email_sent" if email_send["status"] == "sent" else "email_failed"
            )

            activities.append(
                {
                    "id": email_send["id"],
                    "type": event_type,
                    "timestamp": email_send["created_at"],
                    "candidateName": candidate_name,
                    "candidateEmail": email_send["recipient"],
                    "assignmentId": assignment_id,
                    "details": {
                        "status": email_send["status"],
                        "error": email_send.get("error"),
                        "message_id": email_send.get("provider_message_id"),
                    },
                }
            )

    # Add assignment events
    for assignment in assignments:
        candidate = await CandidateRepository.find_by_id(assignment["candidate_id"])
        candidate_name = candidate.get("name", "Unknown") if candidate else "Unknown"
        candidate_email = candidate.get("email", "") if candidate else ""

        if assignment["status"] == "active":
            event_type = "assigned"
        elif assignment["status"] == "removed":
            event_type = "unassigned"
        else:
            event_type = "assignment_updated"

        activities.append(
            {
                "id": assignment["id"],
                "type": event_type,
                "timestamp": assignment["created_at"],
                "candidateName": candidate_name,
                "candidateEmail": candidate_email,
                "assignmentId": assignment["id"],
                "details": {
                    "role": assignment.get("role"),
                    "status": assignment["status"],
                },
            }
        )

    # Sort by timestamp descending
    activities.sort(key=lambda x: x["timestamp"], reverse=True)

    # Limit to 50 most recent
    return activities[:50]
