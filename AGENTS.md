# Repository Guidelines

## Project Structure & Module Organization
- `backend/` hosts the FastAPI service with `routers/` for HTTP handlers, `services/` for business logic, and `models/` for persistence. Backend tests live next to the code as `test_*.py`.
- `dashboard-frontend/` and `interview-frontend/` are CRA React apps. Store feature code in `src/`, shared UI in `src/components/`, and API helpers in `src/api/`.
- `scripts/` contains automation helpers; keep new assets inside the project that owns them.

## Build, Test, and Development Commands
- Backend dev server: `cd backend && uvicorn server:app --reload --host 0.0.0.0 --port 8000`
- Backend quality gates: `python -m pytest` for unit tests, `flake8 .` for lint, `black .` and `isort .` for formatting, `mypy .` for type checks.
- Dashboard app: `cd dashboard-frontend && yarn start` (default port 3001), `yarn build`, `yarn test`.
- Interview app: `cd interview-frontend && yarn start` (port 3000), `yarn build`, `yarn test`.
- Run `yarn format` or `format:check` in each frontend before committing UI changes.

## Coding Style & Naming Conventions
- Python: 4-space indentation, snake_case modules and functions, PascalCase Pydantic models. Format with `black` and `isort`; lint with `flake8`.
- React: Components use PascalCase, hooks camelCase; co-locate Tailwind classes with components and reuse primitives from `src/components/ui/`.
- Environment variables belong in `.env` copied from examples. Never commit secrets; note new keys in `SETUP.md`.

## Testing Guidelines
- Cover services, routers, and utilities with `pytest`; name files `test_<module>.py` and mirror fixtures from existing tests.
- Frontend behavior tests should sit next to the component (`Component.test.tsx`) and run with `yarn test`; mock network calls to avoid flaky suites.
- Pair backend changes with a light frontend smoke test when an API contract shifts.

## Commit & Pull Request Guidelines
- Follow the existing short, imperative style (`area: change`, e.g., `audio: tighten error handling`). Keep each commit scoped and reference related tasks when possible.
- Pull requests should summarize the change, note affected services, call out config updates, and attach UI evidence for frontend work. Log major architecture shifts in `REALTIME_INTERVIEW_README.md` or a decision note.

## Security & Configuration Tips
- The platform needs MongoDB and an OpenAI key; ensure `.env` files declare `MONGO_URL`, `DB_NAME`, `OPENAI_API_KEY`, and frontend `REACT_APP_BACKEND_URL`.
- FFmpeg must be installed and available on `PATH` for the backend to mux mixed audio into MP4 exports (`uploads/videos`). Without it, only raw WebM files will appear.
- Exclude generated media, logs, and secrets via `.gitignore`. Run `pip-audit` and `yarn audit` when introducing new dependencies.
