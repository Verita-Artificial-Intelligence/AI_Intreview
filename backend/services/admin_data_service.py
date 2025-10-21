from __future__ import annotations

import asyncio
import csv
import io
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Dict, List, Optional, Sequence, Tuple

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorCursor
from pymongo import ASCENDING, DESCENDING

from database import (
    get_annotation_data_collection,
    get_annotations_collection,
)
from models import AdminDataPage, AdminDataRecord


def _iso_or_none(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


def _parse_datetime(value: Optional[Any]) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            cleaned = value.strip()
            if not cleaned:
                return None
            if cleaned.endswith("Z"):
                cleaned = cleaned[:-1] + "+00:00"
            return datetime.fromisoformat(cleaned)
        except ValueError:
            return None
    return None


@dataclass
class AdminDataFilters:
    job_id: Optional[str] = None
    annotator_id: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    statuses: List[str] = field(default_factory=list)
    search: Optional[str] = None
    rating_min: Optional[float] = None
    rating_max: Optional[float] = None
    created_from: Optional[str] = None
    created_to: Optional[str] = None
    completed_from: Optional[str] = None
    completed_to: Optional[str] = None
    assigned_from: Optional[str] = None
    assigned_to: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {}
        if self.job_id:
            payload["job_id"] = self.job_id
        if self.annotator_id:
            payload["annotator_id"] = self.annotator_id
        if self.tags:
            payload["tags"] = self.tags
        if self.statuses:
            payload["statuses"] = self.statuses
        if self.search:
            payload["search"] = self.search
        if self.rating_min is not None:
            payload["rating_min"] = self.rating_min
        if self.rating_max is not None:
            payload["rating_max"] = self.rating_max
        if self.created_from:
            payload["created_from"] = self.created_from
        if self.created_to:
            payload["created_to"] = self.created_to
        if self.completed_from:
            payload["completed_from"] = self.completed_from
        if self.completed_to:
            payload["completed_to"] = self.completed_to
        if self.assigned_from:
            payload["assigned_from"] = self.assigned_from
        if self.assigned_to:
            payload["assigned_to"] = self.assigned_to
        return payload


class AdminDataExplorerService:
    """Compose admin data explorer responses across multiple collections."""

    SORT_FIELD_MAP: Dict[str, str] = {
        "created_at": "created_at_dt",
        "completed_at": "completed_at_dt",
        "assigned_at": "assigned_at_dt",
        "started_at": "started_at_dt",
        "quality_rating": "quality_rating",
        "job_title": "job_title",
        "annotator_name": "annotator_name",
        "dataset_title": "dataset_title",
        "status": "status",
        "task_name": "task_name",
    }
    EXPORT_COLUMNS: Sequence[str] = (
        "id",
        "task_name",
        "status",
        "quality_rating",
        "job_id",
        "job_title",
        "job_status",
        "annotator_id",
        "annotator_name",
        "annotator_email",
        "dataset_id",
        "dataset_title",
        "dataset_description",
        "dataset_type",
        "dataset_tags",
        "created_at",
        "assigned_at",
        "started_at",
        "completed_at",
        "last_activity_at",
        "feedback_notes",
    )

    _indexes_created: bool = False
    _index_lock: asyncio.Lock = asyncio.Lock()

    @classmethod
    async def ensure_indexes(cls) -> None:
        """Create indexes needed for efficient filtering."""
        if cls._indexes_created:
            return

        async with cls._index_lock:
            if cls._indexes_created:
                return

            annotation_tasks = get_annotations_collection()
            annotation_data = get_annotation_data_collection()

            await annotation_tasks.create_index([("job_id", ASCENDING)])
            await annotation_tasks.create_index([("annotator_id", ASCENDING)])
            await annotation_tasks.create_index([("status", ASCENDING)])
            await annotation_tasks.create_index([("quality_rating", DESCENDING)])
            await annotation_tasks.create_index([("created_at", DESCENDING)])
            await annotation_tasks.create_index([("completed_at", DESCENDING)])
            await annotation_tasks.create_index([("assigned_at", DESCENDING)])
            await annotation_tasks.create_index([("data_to_annotate.annotation_data_id", ASCENDING)])

            await annotation_data.create_index([("metadata.tags", ASCENDING)])
            await annotation_data.create_index([("job_id", ASCENDING)])

            cls._indexes_created = True

    @classmethod
    def _clean_list(cls, values: Optional[Sequence[str]]) -> List[str]:
        if not values:
            return []
        cleaned = []
        for value in values:
            if value is None:
                continue
            text = str(value).strip()
            if text:
                cleaned.append(text)
        return cleaned

    @classmethod
    def _iso_from_datetime(cls, value: Optional[Any]) -> Optional[str]:
        parsed = _parse_datetime(value)
        return _iso_or_none(parsed)

    @classmethod
    def _latest_timestamp(cls, *values: Optional[str]) -> Optional[str]:
        timestamps = [
            _parse_datetime(value)
            for value in values
            if value is not None
        ]
        timestamps = [ts for ts in timestamps if ts is not None]
        if not timestamps:
            return None
        return _iso_or_none(max(timestamps))

    @classmethod
    def _to_date_expr(cls, field_path: str) -> Dict[str, Any]:
        return {
            "$let": {
                "vars": {"value": field_path},
                "in": {
                    "$cond": [
                        {
                            "$or": [
                                {"$eq": ["$$value", None]},
                                {"$eq": ["$$value", ""]},
                            ]
                        },
                        None,
                        {
                            "$dateFromString": {
                                "dateString": "$$value",
                                "onError": None,
                                "onNull": None,
                            }
                        },
                    ]
                },
            }
        }

    @classmethod
    def _resolve_sort(cls, sort_by: Optional[str], sort_dir: Optional[str]) -> Tuple[str, int]:
        field = cls.SORT_FIELD_MAP.get(sort_by or "created_at", "created_at_dt")
        direction = DESCENDING if (sort_dir or "desc").lower() == "desc" else ASCENDING
        return field, direction

    @classmethod
    def _build_common_pipeline(cls, filters: AdminDataFilters) -> List[Dict[str, Any]]:
        pipeline: List[Dict[str, Any]] = []
        match_stage: Dict[str, Any] = {}

        if filters.job_id:
            match_stage["job_id"] = filters.job_id
        if filters.annotator_id:
            match_stage["annotator_id"] = filters.annotator_id
        if filters.statuses:
            match_stage["status"] = {"$in": cls._clean_list(filters.statuses)}

        rating_filter: Dict[str, Any] = {}
        if filters.rating_min is not None:
            rating_filter["$gte"] = filters.rating_min
        if filters.rating_max is not None:
            rating_filter["$lte"] = filters.rating_max
        if rating_filter:
            match_stage["quality_rating"] = rating_filter

        def apply_date_range(field: str, start: Optional[str], end: Optional[str]) -> None:
            range_filter: Dict[str, Any] = {}
            if start:
                range_filter["$gte"] = start
            if end:
                range_filter["$lte"] = end
            if range_filter:
                match_stage[field] = range_filter

        apply_date_range("created_at", filters.created_from, filters.created_to)
        apply_date_range("completed_at", filters.completed_from, filters.completed_to)
        apply_date_range("assigned_at", filters.assigned_from, filters.assigned_to)

        if match_stage:
            pipeline.append({"$match": match_stage})

        pipeline.extend([
            {
                "$lookup": {
                    "from": "annotation_data",
                    "let": {"annotation_data_id": "$data_to_annotate.annotation_data_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$eq": ["$id", "$$annotation_data_id"]
                                }
                            }
                        },
                        {
                            "$project": {
                                "_id": 0,
                                "id": 1,
                                "job_id": 1,
                                "title": 1,
                                "description": 1,
                                "data_type": 1,
                                "metadata": 1,
                                "created_at": 1,
                            }
                        },
                    ],
                    "as": "dataset_doc",
                }
            },
            {
                "$lookup": {
                    "from": "jobs",
                    "localField": "job_id",
                    "foreignField": "id",
                    "as": "job_doc",
                }
            },
            {
                "$lookup": {
                    "from": "candidates",
                    "localField": "annotator_id",
                    "foreignField": "id",
                    "as": "candidate_doc",
                }
            },
            {
                "$lookup": {
                    "from": "interviews",
                    "let": {"annotator_id": "$annotator_id", "job_id": "$job_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$candidate_id", "$$annotator_id"]},
                                        {"$eq": ["$job_id", "$$job_id"]},
                                    ]
                                }
                            }
                        },
                        {
                            "$project": {
                                "_id": 0,
                                "candidate_name": 1,
                                "candidate_id": 1,
                                "id": 1,
                            }
                        },
                    ],
                    "as": "interview_doc",
                }
            },
            {
                "$addFields": {
                    "dataset_doc": {"$arrayElemAt": ["$dataset_doc", 0]},
                    "job_doc": {"$arrayElemAt": ["$job_doc", 0]},
                    "candidate_doc": {"$arrayElemAt": ["$candidate_doc", 0]},
                    "interview_doc": {"$arrayElemAt": ["$interview_doc", 0]},
                }
            },
            {
                "$addFields": {
                    "dataset_tags": {
                        "$let": {
                            "vars": {"tags": "$dataset_doc.metadata.tags"},
                            "in": {
                                "$cond": [
                                    {"$eq": [{"$type": "$$tags"}, "array"]},
                                    "$$tags",
                                    {
                                        "$cond": [
                                            {"$or": [
                                                {"$eq": ["$$tags", None]},
                                                {"$eq": ["$$tags", ""]},
                                            ]},
                                            [],
                                            ["$$tags"],
                                        ]
                                    },
                                ]
                            },
                        }
                    },
                    "dataset_id": {
                        "$ifNull": [
                            "$dataset_doc.id",
                            "$data_to_annotate.annotation_data_id",
                        ]
                    },
                    "dataset_title": {
                        "$ifNull": [
                            "$dataset_doc.title",
                            "$task_name",
                        ]
                    },
                    "dataset_description": {
                        "$ifNull": [
                            "$dataset_doc.description",
                            "$task_description",
                        ]
                    },
                    "dataset_type": {
                        "$ifNull": [
                            "$dataset_doc.data_type",
                            "$data_to_annotate.data_type",
                        ]
                    },
                    "job_title": "$job_doc.title",
                    "job_status": "$job_doc.status",
                    "annotator_name": {
                        "$ifNull": [
                            "$candidate_doc.name",
                            "$interview_doc.candidate_name",
                        ]
                    },
                    "annotator_email": "$candidate_doc.email",
                }
            },
        ])

        cleaned_tags = cls._clean_list(filters.tags)
        if cleaned_tags:
            pipeline.append({
                "$match": {
                    "$expr": {
                        "$setIsSubset": [
                            cleaned_tags,
                            {"$ifNull": ["$dataset_tags", []]},
                        ]
                    }
                }
            })

        if filters.search:
            regex = {"$regex": filters.search, "$options": "i"}
            pipeline.append({
                "$match": {
                    "$or": [
                        {"job_title": regex},
                        {"dataset_title": regex},
                        {"dataset_description": regex},
                        {"annotator_name": regex},
                        {"task_name": regex},
                    ]
                }
            })

        pipeline.append({
            "$addFields": {
                "created_at_dt": cls._to_date_expr("$created_at"),
                "completed_at_dt": cls._to_date_expr("$completed_at"),
                "assigned_at_dt": cls._to_date_expr("$assigned_at"),
                "started_at_dt": cls._to_date_expr("$started_at"),
            }
        })

        return pipeline

    @classmethod
    def _project_stage(cls) -> Dict[str, Any]:
        return {
            "$project": {
                "_id": 0,
                "id": "$id",
                "task_name": "$task_name",
                "status": "$status",
                "quality_rating": "$quality_rating",
                "feedback_notes": "$feedback_notes",
                "job_id": "$job_id",
                "job_title": "$job_title",
                "job_status": "$job_status",
                "annotator_id": "$annotator_id",
                "annotator_name": "$annotator_name",
                "annotator_email": "$annotator_email",
                "dataset_id": "$dataset_id",
                "dataset_title": "$dataset_title",
                "dataset_description": "$dataset_description",
                "dataset_type": "$dataset_type",
                "dataset_tags": "$dataset_tags",
                "created_at": "$created_at",
                "assigned_at": "$assigned_at",
                "started_at": "$started_at",
                "completed_at": "$completed_at",
            }
        }

    @classmethod
    def _pagination_meta(cls, total: int, page: int, page_size: int) -> Dict[str, Any]:
        total_pages = max((total + page_size - 1) // page_size, 1) if page_size else 1
        return {
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        }

    @classmethod
    def _normalize_record(cls, raw: Dict[str, Any]) -> AdminDataRecord:
        record_payload = dict(raw)
        record_payload["dataset_tags"] = cls._clean_list(record_payload.get("dataset_tags"))

        for field in ("created_at", "assigned_at", "started_at", "completed_at"):
            record_payload[field] = cls._iso_from_datetime(record_payload.get(field))

        record_payload["last_activity_at"] = cls._latest_timestamp(
            record_payload.get("completed_at"),
            record_payload.get("started_at"),
            record_payload.get("assigned_at"),
            record_payload.get("created_at"),
        )

        return AdminDataRecord(**record_payload)

    @classmethod
    async def get_paginated_records(
        cls,
        filters: AdminDataFilters,
        page: int = 1,
        page_size: int = 50,
        sort_by: Optional[str] = None,
        sort_dir: Optional[str] = None,
    ) -> AdminDataPage:
        await cls.ensure_indexes()

        page = max(page, 1)
        page_size = min(max(page_size, 1), 500)

        base_pipeline = cls._build_common_pipeline(filters)
        sort_field, sort_direction = cls._resolve_sort(sort_by, sort_dir)
        sort_stage = {"$sort": {sort_field: sort_direction, "id": sort_direction}}
        skip = (page - 1) * page_size

        items_pipeline = [
            *base_pipeline,
            sort_stage,
            {"$skip": skip},
            {"$limit": page_size},
            cls._project_stage(),
        ]

        count_pipeline = [*base_pipeline, {"$count": "count"}]

        collection = get_annotations_collection()

        items_cursor = collection.aggregate(items_pipeline, allowDiskUse=True)
        items_raw = await items_cursor.to_list(length=None)

        count_cursor = collection.aggregate(count_pipeline, allowDiskUse=True)
        count_result = await count_cursor.to_list(length=1)
        total = count_result[0]["count"] if count_result else 0

        records = [cls._normalize_record(doc) for doc in items_raw]
        pagination = cls._pagination_meta(total, page, page_size)

        return AdminDataPage(
            items=records,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=pagination["total_pages"],
            has_next=pagination["has_next"],
            has_previous=pagination["has_previous"],
            sort_by=sort_by or "created_at",
            sort_dir=(sort_dir or "desc").lower(),
            applied_filters=filters.to_dict(),
        )

    @classmethod
    async def build_export_cursor(
        cls,
        filters: AdminDataFilters,
        sort_by: Optional[str],
        sort_dir: Optional[str],
    ) -> AsyncIOMotorCursor:
        await cls.ensure_indexes()
        base_pipeline = cls._build_common_pipeline(filters)
        sort_field, sort_direction = cls._resolve_sort(sort_by, sort_dir)
        sort_stage = {"$sort": {sort_field: sort_direction, "id": sort_direction}}
        export_pipeline = [*base_pipeline, sort_stage, cls._project_stage()]
        collection = get_annotations_collection()
        return collection.aggregate(export_pipeline, allowDiskUse=True)

    @classmethod
    async def stream_export(
        cls,
        filters: AdminDataFilters,
        sort_by: Optional[str],
        sort_dir: Optional[str],
        export_format: str,
    ) -> Tuple[AsyncIterator[bytes], str, str]:
        export_format = (export_format or "csv").lower()
        if export_format not in {"csv", "json"}:
            raise HTTPException(status_code=400, detail="Unsupported export format")

        cursor = await cls.build_export_cursor(filters, sort_by, sort_dir)

        if export_format == "json":
            return cls._stream_json(cursor), "application/json", "admin-data-export.json"
        return cls._stream_csv(cursor), "text/csv", "admin-data-export.csv"

    @classmethod
    async def _iter_records(cls, cursor: AsyncIOMotorCursor) -> AsyncIterator[Dict[str, Any]]:
        async for doc in cursor:
            record = cls._normalize_record(doc)
            yield record.model_dump()

    @classmethod
    def _record_to_csv_row(cls, record: Dict[str, Any]) -> Dict[str, Any]:
        row = {}
        for column in cls.EXPORT_COLUMNS:
            value = record.get(column)
            if column == "dataset_tags":
                value = ", ".join(value) if isinstance(value, list) else ""
            elif isinstance(value, (list, dict)):
                value = json.dumps(value, default=str)
            row[column] = value if value is not None else ""
        return row

    @classmethod
    def _stream_json(cls, cursor: AsyncIOMotorCursor) -> AsyncIterator[bytes]:
        async def generator() -> AsyncIterator[bytes]:
            first = True
            yield b"["
            async for record in cls._iter_records(cursor):
                chunk = json.dumps(record, default=str).encode("utf-8")
                if first:
                    yield chunk
                    first = False
                else:
                    yield b"," + chunk
            yield b"]"

        return generator()

    @classmethod
    def _stream_csv(cls, cursor: AsyncIOMotorCursor) -> AsyncIterator[bytes]:
        async def generator() -> AsyncIterator[bytes]:
            buffer = io.StringIO()
            writer = csv.DictWriter(buffer, fieldnames=cls.EXPORT_COLUMNS)
            writer.writeheader()
            yield buffer.getvalue().encode("utf-8")
            buffer.seek(0)
            buffer.truncate(0)

            async for record in cls._iter_records(cursor):
                writer.writerow(cls._record_to_csv_row(record))
                yield buffer.getvalue().encode("utf-8")
                buffer.seek(0)
                buffer.truncate(0)

        return generator()
