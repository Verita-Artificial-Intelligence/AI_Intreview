# Repository Guidelines

## Project Structure & Module Organization
The backend (`backend/`) hosts FastAPI routers, services, Pydantic models, and tests; runtime media lands in `backend/uploads/`. Recruiter tooling lives in `dashboard-frontend/`, while the candidate client runs from `interview-frontend/`; both are CRA apps that share the design tokens described in `docs/design-system.md`. Operational scripts sit in `scripts/`, with setup and realtime reference material in `SETUP.md` and `REALTIME_INTERVIEW_README.md`.

## Build, Test, and Development Commands
- `cd backend && uvicorn server:app --reload` — run the API locally (default port 8000).
- `cd backend && pytest` — execute backend tests; run `black . && isort . && flake8 . && mypy .` before pushing.
- `cd dashboard-frontend && yarn install && yarn start` — serve the interviewer dashboard on port 3001; gate UI changes with `yarn test` and `yarn format:check`.
- `cd interview-frontend && yarn install && yarn start` — serve the candidate client on port 3000; reuse the dashboard test and format commands.

## Coding Style & Naming Conventions
Prettier (2-space indent, 100-char width) formats both React apps; Black (88-char limit) and isort govern Python alongside Flake8. Keep ESLint error-free and fix `mypy` findings instead of suppressing them. Use `PascalCase` for components, `camelCase` for logic, `snake_case.py` for Python modules, and `test_*.py` / `*.test.tsx` for specs. Prefer named exports in TypeScript and declare `__all__` only when curating a module surface intentionally.

## Testing Guidelines
Backend specs live in `backend/tests/`; mock MongoDB and OpenAI integrations and follow the Arrange–Act–Assert pattern. Frontend tests run via `react-scripts test` with `*.test.tsx` files colocated near components. Target ≥70 % coverage on new backend code and keep smoke tests for session start, transcript review, and export flows. Document intentional gaps in `tests/README.md` or inline docstrings.

## Commit & Pull Request Guidelines
History favors short imperative subjects (e.g., `realtime: extend server VAD silence window`); keep that style under 72 characters and add scope prefixes when helpful. Reference the feature, bug, or spec in the body if extra context is needed. Pull requests must include a concise summary, test evidence (`pytest`, `yarn test`, screenshots for UI), any config or environment changes, and links to related doc updates.

## Environment & Security Notes
Copy each `.env.example` before running services, and never commit populated `.env` files. `USE_MOCK_SERVICES=true` keeps the backend runnable without OpenAI Realtime access. Ensure FFmpeg is on `PATH` and purge `backend/uploads/` routinely so sensitive recordings do not linger.
