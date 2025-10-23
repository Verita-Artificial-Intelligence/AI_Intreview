# Verita AI Interview Platform

The Verita platform delivers an end-to-end, AI-assisted interview flow powered by a FastAPI backend and dedicated interviewer and candidate React applications. It supports realtime conversations, human review workflows, analytics, and operational tooling that keep interview data organised.

## Architecture at a Glance

- **Backend API (`backend/`)** – FastAPI service for authentication, candidate and job management, realtime audio streaming, analysis, admin data aggregation, and media export with FFmpeg.
- **Interviewer Dashboard (`dashboard-frontend/`)** – CRA + Tailwind app for recruiters and admins to manage candidates, launch or review interviews, explore datasets, and curate annotation queues.
- **Candidate Experience (`interview-frontend/`)** – Voice-first interview client that guides candidates through prep flows, realtime AI sessions, and post-interview review.
- **Operational Scripts (`scripts/`)** – Python and shell helpers for seeding data, importing annotators, and validating the analysis pipeline.

## Highlighted Features

- OpenAI Realtime integration for bidirectional audio streaming, live transcription, and AI-generated prompts.
- Timestamp-aligned audio buffering and FFmpeg muxing that produce export-ready MP4 recordings for each interview.
- Admin Data Explorer with paginated filters, CSV/JSON export, and supporting MongoDB indexes created at startup.
- Annotation and analysis services that score interviews, manage reviewer workflows, and surface insights inside the dashboard.
- Shared design system and component primitives to keep the two React apps visually consistent.

## Tech Stack

- **Backend:** FastAPI, Motor (MongoDB), MoviePy/FFmpeg, OpenAI Python SDK, JWT auth, pytest.
- **Frontends:** React 19 with CRACO, Tailwind CSS, Radix UI primitives, Zustand store, React Hook Form.
- **Tooling:** Yarn 1, Prettier, ESLint, Black, isort, mypy, Flake8.

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB instance (local or Atlas)
- OpenAI API key with Realtime access
- FFmpeg available on `PATH`

## Environment Configuration

Create environment files based on the provided examples:

```bash
cp backend/.env.example backend/.env
cp interview-frontend/.env.example interview-frontend/.env
```

Key backend variables include `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_VOICE`, and toggles such as `USE_MOCK_SERVICES`. Frontend apps expect `REACT_APP_BACKEND_URL` pointing to the running API.

## Running the Platform Locally

1. **Backend API**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```
   The service auto-mounts `backend/uploads` for serving media assets and ensures required MongoDB indexes on startup.

2. **Interviewer Dashboard** (default port `3001` via `PORT=3001` in `package.json`)
   ```bash
   cd dashboard-frontend
   yarn install
   yarn start
   ```

3. **Candidate Interview Client** (default port `3000`)
   ```bash
   cd interview-frontend
   yarn install
   yarn start
   ```

Run the dashboard and interview client in parallel for a full multi-app workflow. Additional setup guidance lives in `SETUP.md`.

## Quality & Testing

- Backend: `cd backend && pytest`, `flake8 .`, `black .`, `isort .`, `mypy .`
- Frontends: `yarn test` inside each app, `yarn format:check` before committing UI changes.
- Scripts have individual usage docs in `scripts/README.md`; most rely on `backend/.env` and a running MongoDB instance.

## Project Structure

```
.
├── backend/                # FastAPI application, routers, services, uploads, tests
│   ├── app.py
│   ├── routers/
│   ├── services/
│   ├── models/
│   ├── prompts/
│   ├── uploads/
│   └── tests/
├── dashboard-frontend/     # Recruiter/admin React app (port 3001)
├── interview-frontend/     # Candidate React app (port 3000)
├── scripts/                # Data import + analysis helpers
├── docs/design-system.md   # Shared UI guidelines
├── REALTIME_INTERVIEW_README.md
├── SETUP.md
└── README.md
```

## Additional Documentation

- `SETUP.md` – step-by-step environment setup, troubleshooting tips, and realtime feature validation.
- `REALTIME_INTERVIEW_README.md` – deep dive into the websocket flow, audio pipeline, and export process.
- `docs/design-system.md` – shared design tokens and component usage notes for both frontends.
- `scripts/README.md` – instructions for seeding candidates, importing annotators, and running analysis sanity checks.

## Troubleshooting & Operational Notes

- MongoDB must be reachable at startup or the backend will fail to serve most endpoints.
- Ensure FFmpeg ≥ 5.x is installed to produce mixed MP4 exports; otherwise only raw WebM files will be available.
- For lower-cost development runs, enable `USE_MOCK_SERVICES=true` in `backend/.env` to bypass OpenAI Realtime usage.
- Uploaded audio/video assets live under `backend/uploads/`; prune regularly in long-running local environments.

## License

[Add license information here]
