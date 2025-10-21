import pytest

from backend.services.admin_data_service import (
    AdminDataExplorerService,
    AdminDataFilters,
)


def test_build_pipeline_applies_filters():
    filters = AdminDataFilters(
        job_id="job-1",
        annotator_id="annotator-42",
        rating_min=3,
        rating_max=5,
        tags=["creative", "priority"],
        statuses=["completed", "reviewed"],
    )

    pipeline = AdminDataExplorerService._build_common_pipeline(filters)
    assert pipeline, "Expected pipeline stages to be generated"

    match_stage = pipeline[0]["$match"]
    assert match_stage["job_id"] == "job-1"
    assert match_stage["annotator_id"] == "annotator-42"
    assert match_stage["status"]["$in"] == ["completed", "reviewed"]
    assert match_stage["quality_rating"] == {"$gte": 3, "$lte": 5}

    tag_stage = next(stage for stage in pipeline if "$match" in stage and "$expr" in stage["$match"])
    assert "$setIsSubset" in tag_stage["$match"]["$expr"]


@pytest.mark.parametrize(
    "sort_by,sort_dir,expected_field,expected_direction",
    [
        ("created_at", "desc", "created_at_dt", -1),
        ("job_title", "asc", "job_title", 1),
        ("unknown", "asc", "created_at_dt", 1),
        (None, None, "created_at_dt", -1),
    ],
)
def test_resolve_sort(sort_by, sort_dir, expected_field, expected_direction):
    field, direction = AdminDataExplorerService._resolve_sort(sort_by, sort_dir)
    assert field == expected_field
    assert direction == expected_direction


def test_pagination_meta_handles_edges():
    meta = AdminDataExplorerService._pagination_meta(total=120, page=2, page_size=25)
    assert meta["total_pages"] == 5
    assert meta["has_next"] is True
    assert meta["has_previous"] is True

    first_page_meta = AdminDataExplorerService._pagination_meta(total=5, page=1, page_size=25)
    assert first_page_meta["total_pages"] == 1
    assert first_page_meta["has_next"] is False
    assert first_page_meta["has_previous"] is False


def test_normalize_record_sets_last_activity():
    raw = {
        "id": "task-1",
        "dataset_tags": [" design ", "", None, "ux"],
        "created_at": "2024-01-01T10:00:00+00:00",
        "assigned_at": "2024-01-02T10:00:00+00:00",
        "started_at": "2024-01-03T10:00:00+00:00",
        "completed_at": None,
    }

    record = AdminDataExplorerService._normalize_record(raw)
    assert record.dataset_tags == ["design", "ux"]
    assert record.last_activity_at == "2024-01-03T10:00:00+00:00"


def test_record_to_csv_row_serializes_tags_and_lists():
    record = {
        "id": "task-1",
        "task_name": "QA Review",
        "status": "completed",
        "quality_rating": 4,
        "job_id": "job-1",
        "job_title": "QA Project",
        "job_status": "in_progress",
        "annotator_id": "annotator-1",
        "annotator_name": "Alex Doe",
        "annotator_email": "alex@example.com",
        "dataset_id": "data-1",
        "dataset_title": "Creative Brief",
        "dataset_description": "Detailed overview",
        "dataset_type": "document",
        "dataset_tags": ["design", "ux"],
        "created_at": "2024-01-01T10:00:00+00:00",
        "assigned_at": None,
        "started_at": None,
        "completed_at": "2024-01-02T10:00:00+00:00",
        "last_activity_at": "2024-01-02T10:00:00+00:00",
        "feedback_notes": "Great work",
    }

    row = AdminDataExplorerService._record_to_csv_row(record)
    assert row["dataset_tags"] == "design, ux"
    assert row["feedback_notes"] == "Great work"
    assert row["task_name"] == "QA Review"
