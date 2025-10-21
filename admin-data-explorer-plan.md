# Admin Data Explorer Implementation Plan

## Implementation Plan

- **Discovery & Alignment**
  - Audit existing admin pages and data flows in `dashboard-frontend/src/pages` (e.g., `AnnotationData.jsx:1`, `AdminInterviewReview.jsx:1`) and current APIs in `backend/routers` to confirm what is already exposed versus what must be added.
  - Document field availability and gaps (e.g., confirm where dataset tags live, or plan to extend `AnnotationData` metadata in `backend/models/annotation_data.py:1` and the upload workflow in `backend/services/annotation_data_service.py:1`).

- **Backend: Aggregated Data Endpoint**
  - Add a dedicated admin router handler (e.g., `backend/routers/admin.py:1`) that returns a paginated, filterable payload combining projects (`jobs`), datasets (`annotation_data`), annotation tasks, and ratings.
  - Implement a service layer helper (new module or extend `backend/services/annotation_service.py:1`) that composes Mongo aggregation across `jobs`, `annotation_data`, and `annotation_tasks`, projecting fields needed for the table (project/job info, dataset metadata/tags, annotator info, timestamps, rating metrics).
  - Support query params for project/job ID, annotator ID, tag list, created/completed date ranges, rating thresholds, status, and generic search; accept `sort_by` and `sort_dir`, and include pagination controls.
  - Index frequently filtered fields (e.g., `job_id`, `annotator_id`, `quality_rating`, timestamps, tags) using `db.annotation_tasks.create_index(...)` in a migration or startup hook to keep the view performant.
  - Ensure responses are normalized (e.g., map annotator IDs to names via interview records in `backend/services/interview_service.py:1`) and strip sensitive data.

- **Backend: Export Support**
  - Add `/admin/data/export` endpoints that reuse the aggregation logic but stream results as CSV or JSON; honor the same filters so exports match the on-screen slice.
  - For CSV generation, use incremental writers (e.g., `aiofiles` or `csv` with `StreamingResponse`) to avoid memory spikes; document export schema.
  - Add unit tests in `backend/tests` (mirror existing `test_*` pattern) validating filtering, sorting, pagination, and export serialization.

- **Frontend: Admin Data View**
  - Create a new page (e.g., `dashboard-frontend/src/pages/AdminDataExplorer.jsx`) registered in routing (`dashboard-frontend/src/App.js:1`) and surfaced in the admin sidebar (`dashboard-frontend/src/components/AdminSidebar.jsx:1`).
  - Build a responsive data table using existing UI primitives (`dashboard-frontend/src/components/ui/table.jsx:1`, `select.jsx:1`, `input.jsx:1`, `badge.jsx:1`) with column sorting indicators and sticky headers.
  - Provide filter controls: project/job dropdown (populated via `/api/jobs`), annotator selector (typeahead), multi-select tags, date-range picker (`calendar.jsx:1`), rating slider (`slider.jsx:1`), free-text search, and quick status toggles.
  - Manage state with React hooks (or introduce Zustand/context if complexity warrants), trigger debounced API calls, show loading/error/skeleton states, and support pagination controls (`pagination.jsx:1`).
  - Add “Export CSV” / “Export JSON” buttons that call the new backend endpoints, handle download feedback, and guard against empty selections.

- **Validation & Quality**
  - Backend: add pytest coverage for new service helpers (filter combinations, sorting, export formatting) and route tests validating HTTP responses and headers.
  - Frontend: add React Testing Library tests (e.g., `AdminDataExplorer.test.jsx`) covering filter interactions, sort toggles, and export button wiring (mock HTTP calls).
  - Run existing lint/format suites (`black`, `isort`, `flake8`, `yarn format`, `yarn test`) and ensure any new fields are reflected in type definitions or shared utilities.

- **Documentation & Rollout**
  - Update admin usage docs or readme sections (`REALTIME_INTERVIEW_README.md:1` or new handbook page) describing the data view, filters, and export behavior.
  - Note schema/index additions in migration notes and environment setup (`SETUP.md:1`), including any new env vars (e.g., export size limits).
  - Plan staged rollout: seed staging with realistic data, gather admin feedback, tweak filters prior to production deployment.

## Best Practices for Outstanding Topics

- **Dataset tags**
  - Reuse `metadata` in `backend/models/annotation_data.py:14` before inventing a new field; codify a `tags` array inside that payload and start validating it in `AnnotationDataCreate`/upload flows so it stays consistent with existing storage.
  - Surface the same structure in `dashboard-frontend/src/pages/AnnotationData.jsx:1` and any new admin table so the UI and API speak the same schema.
  - Choose a default multi-tag behavior (admin teams usually expect AND for narrow searches) and document it in the request contract; if both modes are needed later, expose an explicit toggle rather than overloading the first release.

- **Export volume & retention**
  - Estimate record counts via targeted aggregation (e.g., prototype in a script using `backend/services/annotation_service.py:27` helpers) before building streaming logic.
  - Implement server-side streaming (`StreamingResponse`) once you cross a few thousand rows to avoid buffering everything like current JSON endpoints; cap requests and return a clear error when limits are exceeded.
  - Keep exports transient: generate them on demand, immediately stream to the caller, and avoid persisting snapshots in the database or filesystem (aligns with existing pattern—no exported artifacts are stored today). If compliance requires logging, persist metadata only (who exported, filters used).

- **Inline detail views**
  - Start with table-only inspection in the first iteration to stay consistent with current admin pages (e.g., `AnnotationData.jsx` lists resources without inline modals).
  - If detail drilling is high priority, plan a second pass that reuses existing detail components—`AdminInterviewReview.jsx:1` already fetches per-interview assets, and similar modals could be refactored for dataset/annotation detail.
  - Capture the requirement in docs (`REALTIME_INTERVIEW_README.md`) so the team can prioritize it; for now, ensure each row links to existing deep pages rather than reinventing detail UIs immediately.
