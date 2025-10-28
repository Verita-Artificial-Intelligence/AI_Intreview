"""
Status Workflow Management System (Backend)

Defines valid status transitions, validation rules, and cascade logic
for all entity types in the system.
"""

from typing import Dict, List, Optional, Any, Tuple
from enum import Enum


class WorkflowType(str, Enum):
    INTERVIEW = "interview"
    ACCEPTANCE = "acceptance"
    JOB = "job"
    PROJECT = "project"
    ASSIGNMENT = "assignment"
    ANNOTATION_TASK = "annotationTask"


# Interview Status Workflow
INTERVIEW_STATUS_WORKFLOW = {
    "not_started": {
        "label": "Not Started",
        "next": ["in_progress"],
        "description": "Interview has not been started yet",
    },
    "in_progress": {
        "label": "In Progress",
        "next": ["completed"],
        "description": "Interview is currently in progress",
    },
    "completed": {
        "label": "Completed",
        "next": ["under_review"],
        "description": "Interview has been completed",
    },
    "under_review": {
        "label": "Under Review",
        "next": ["approved", "rejected"],
        "description": "Interview is being reviewed",
    },
    "approved": {
        "label": "Approved",
        "next": [],
        "description": "Interview has been approved",
        "terminal": True,
    },
    "rejected": {
        "label": "Rejected",
        "next": [],
        "description": "Interview has been rejected",
        "terminal": True,
    },
}

# Acceptance Status Workflow
ACCEPTANCE_STATUS_WORKFLOW = {
    "pending": {
        "label": "Pending",
        "next": ["accepted", "rejected"],
        "description": "Awaiting acceptance decision",
    },
    "accepted": {
        "label": "Accepted",
        "next": [],
        "description": "Candidate has been accepted",
        "terminal": True,
        "cascade": ["assignment"],
    },
    "rejected": {
        "label": "Rejected",
        "next": [],
        "description": "Candidate has been rejected",
        "terminal": True,
        "cascade": ["assignment"],
    },
}

# Job Status Workflow
JOB_STATUS_WORKFLOW = {
    "pending": {
        "label": "Pending",
        "next": ["in_progress"],
        "description": "Job posting is pending",
    },
    "in_progress": {
        "label": "In Progress",
        "next": ["completed", "archived"],
        "description": "Job is actively accepting applications",
    },
    "completed": {
        "label": "Completed",
        "next": ["archived"],
        "description": "Job has been filled",
    },
    "archived": {
        "label": "Archived",
        "next": [],
        "description": "Job has been archived",
        "terminal": True,
    },
}

# Project Status Workflow
PROJECT_STATUS_WORKFLOW = {
    "active": {
        "label": "Active",
        "next": ["completed", "archived"],
        "description": "Project is currently active",
    },
    "completed": {
        "label": "Completed",
        "next": ["archived"],
        "description": "Project has been completed",
        "cascade": ["assignment"],
    },
    "archived": {
        "label": "Archived",
        "next": [],
        "description": "Project has been archived",
        "terminal": True,
    },
}

# Assignment Status Workflow
ASSIGNMENT_STATUS_WORKFLOW = {
    "active": {
        "label": "Active",
        "next": ["completed", "removed"],
        "description": "Assignment is currently active",
    },
    "completed": {
        "label": "Completed",
        "next": [],
        "description": "Assignment has been completed",
        "terminal": True,
    },
    "removed": {
        "label": "Removed",
        "next": [],
        "description": "Assignment has been removed",
        "terminal": True,
    },
}

# Workflow Registry
WORKFLOWS = {
    WorkflowType.INTERVIEW: INTERVIEW_STATUS_WORKFLOW,
    WorkflowType.ACCEPTANCE: ACCEPTANCE_STATUS_WORKFLOW,
    WorkflowType.JOB: JOB_STATUS_WORKFLOW,
    WorkflowType.PROJECT: PROJECT_STATUS_WORKFLOW,
    WorkflowType.ASSIGNMENT: ASSIGNMENT_STATUS_WORKFLOW,
}


class StatusValidationError(Exception):
    """Raised when a status transition is invalid"""

    pass


def validate_status_transition(
    workflow_type: str, current_status: str, new_status: str
) -> Tuple[bool, Optional[str]]:
    """
    Validates if a status transition is allowed

    Args:
        workflow_type: Type of workflow (e.g., 'interview', 'job')
        current_status: Current status
        new_status: Proposed new status

    Returns:
        Tuple of (valid: bool, error: Optional[str])
    """
    workflow = WORKFLOWS.get(workflow_type)

    if not workflow:
        return (False, f"Unknown workflow type: {workflow_type}")

    current_state = workflow.get(current_status)
    if not current_state:
        return (False, f"Invalid current status: {current_status}")

    new_state = workflow.get(new_status)
    if not new_state:
        return (False, f"Invalid new status: {new_status}")

    # Allow staying in the same status
    if current_status == new_status:
        return (True, None)

    # Check if transition is allowed
    if new_status not in current_state["next"]:
        return (
            False,
            f"Cannot transition from '{current_state['label']}' to '{new_state['label']}'",
        )

    return (True, None)


def get_cascade_entities(workflow_type: str, new_status: str) -> List[str]:
    """
    Gets entities that will be cascaded when a status changes

    Args:
        workflow_type: Type of workflow
        new_status: New status being set

    Returns:
        List of entity types that will be affected
    """
    workflow = WORKFLOWS.get(workflow_type)

    if not workflow or new_status not in workflow:
        return []

    return workflow[new_status].get("cascade", [])


def is_terminal_status(workflow_type: str, status: str) -> bool:
    """
    Checks if a status is terminal (no further transitions allowed)

    Args:
        workflow_type: Type of workflow
        status: Status value

    Returns:
        True if terminal
    """
    workflow = WORKFLOWS.get(workflow_type)

    if not workflow or status not in workflow:
        return False

    return workflow[status].get("terminal", False)


# Cascade Rules - defines what happens when a status changes
CASCADE_RULES = {
    WorkflowType.ACCEPTANCE: {
        "accepted": {"assignment": "create_or_activate", "project": "notify"},
        "rejected": {"assignment": "remove", "project": "notify"},
    },
    WorkflowType.PROJECT: {
        "completed": {"assignment": "complete_all"},
        "archived": {"assignment": "remove_all"},
    },
    WorkflowType.JOB: {"archived": {"interview": "notify"}},
}


def get_cascade_action(
    workflow_type: str, new_status: str, related_entity_type: str
) -> Optional[str]:
    """
    Gets the action to take on related entities when a status changes

    Args:
        workflow_type: Type of workflow
        new_status: New status
        related_entity_type: Type of related entity

    Returns:
        Action to take (e.g., 'create_or_activate', 'remove')
    """
    workflow_rules = CASCADE_RULES.get(workflow_type)
    if not workflow_rules:
        return None

    status_rules = workflow_rules.get(new_status)
    if not status_rules:
        return None

    return status_rules.get(related_entity_type)


def format_status_change_message(
    entity_type: str,
    workflow_type: str,
    old_status: str,
    new_status: str,
    cascaded_changes: Optional[List[Dict[str, str]]] = None,
) -> str:
    """
    Formats a status change notification message

    Args:
        entity_type: Type of entity (e.g., 'Interview')
        workflow_type: Type of workflow
        old_status: Previous status
        new_status: New status
        cascaded_changes: List of cascaded changes [{entityType, action}]

    Returns:
        Formatted message
    """
    workflow = WORKFLOWS.get(workflow_type, {})
    old_label = workflow.get(old_status, {}).get("label", old_status)
    new_label = workflow.get(new_status, {}).get("label", new_status)

    message = f"{entity_type} status updated from '{old_label}' to '{new_label}'"

    if cascaded_changes:
        cascade_descriptions = [
            f"{change['entityType']} {change['action']}" for change in cascaded_changes
        ]
        message += f". Also updated: {', '.join(cascade_descriptions)}"

    return message
