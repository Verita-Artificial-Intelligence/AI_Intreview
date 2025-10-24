"""
Centralized interview type definitions - SINGLE SOURCE OF TRUTH

This file defines all valid interview types with their metadata.
Frontend files should match these definitions exactly:
- dashboard-frontend/src/components/JobForm.jsx (lines 34-63)
- dashboard-frontend/src/components/InterviewCreationModal.jsx (lines 17-42)
- dashboard-frontend/src/pages/Jobs.jsx (getInterviewTypeLabel function)
- interview-frontend/src/pages/Marketplace.jsx (getInterviewTypeLabel function)
"""

from typing import TypedDict


class InterviewTypeMetadata(TypedDict):
    """Metadata for an interview type"""
    id: str
    title: str
    description: str


# OFFICIAL INTERVIEW TYPE DEFINITIONS
# These 4 types are the only valid interview types in the system
INTERVIEW_TYPE_DEFINITIONS: list[InterviewTypeMetadata] = [
    {
        "id": "standard",
        "title": "Standard interview",
        "description": "This is a conversational interview to assess for any role (UX designer, filmmaker, art director, copywriter, and more)",
    },
    {
        "id": "human_data",
        "title": "Design critique & feedback exercise",
        "description": "This is a conversational interview and a design feedback/critique exercise to assess creative direction and feedback skills",
    },
    {
        "id": "custom_questions",
        "title": "Custom questions only",
        "description": "In this interview, you get to add/edit up to 20 custom questions tailored to your role",
    },
    {
        "id": "custom_exercise",
        "title": "Custom Creative Exercise",
        "description": "Add a custom creative brief and get audio responses—AI evaluates creative thinking and problem-solving.",
    },
]

# Valid interview type IDs (for type validation)
VALID_INTERVIEW_TYPE_IDS = [t["id"] for t in INTERVIEW_TYPE_DEFINITIONS]

# Deprecated interview types (for migration purposes)
DEPRECATED_INTERVIEW_TYPES = {
    "resume_based": "standard",
    "software_engineer": "standard",
    "coding_exercise": "standard",
}


def get_interview_type_metadata(interview_type_id: str) -> InterviewTypeMetadata | None:
    """Get metadata for a specific interview type"""
    for type_def in INTERVIEW_TYPE_DEFINITIONS:
        if type_def["id"] == interview_type_id:
            return type_def
    return None


def get_interview_type_title(interview_type_id: str) -> str:
    """Get display title for an interview type"""
    metadata = get_interview_type_metadata(interview_type_id)
    if metadata:
        return metadata["title"]
    # Fallback for deprecated types
    if interview_type_id in DEPRECATED_INTERVIEW_TYPES:
        return get_interview_type_title(DEPRECATED_INTERVIEW_TYPES[interview_type_id])
    return interview_type_id
