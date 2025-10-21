# Lightweight Screen Capture & Click Telemetry Plan

## Context & Goals
- Provide annotators a browser-native tool that captures their screen (window or monitor) with cursor overlay and optional microphone audio.
- Persist recordings and click telemetry so reviewers can replay an annotator’s session and audit interactions for white-collar task workflows.
- Leverage existing MediaRecorder + upload infrastructure to minimize new backend surface area.

## Scope
- **In scope:** dashboard annotator UI, reusable recording/click services, uploads to FastAPI, storing session metadata alongside annotation tasks, playback surface for reviewers, basic QA instrumentation.
- **Out of scope:** desktop agents, long-term media storage policy, advanced analytics beyond raw click logs.

## Architecture Overview
- **Frontend (dashboard)**
  - Create `dashboard-frontend/src/services/screenRecorder.ts` modeled on `interview-frontend/src/services/videoRecorder.ts:1`, swapping `getDisplayMedia` with `{ video: { cursor: 'always' }, audio: false }`.
  - Merge microphone audio when available: call `navigator.mediaDevices.getUserMedia({ audio: true })` and mix tracks into a single `MediaStream`.
  - Stream chunks via `MediaRecorder` and reuse the chunk upload queueing logic already proven in the interview app.
  - Implement `clickTracker.ts` to attach pointer listeners, record `{ ts: performance.now(), x, y, button, modifiers, targetSelector }`, and expose `start() / stop() / serialize()`.
- **Backend (FastAPI)**
  - Extend `/api/interviews/upload/video` in `backend/routers/uploads.py:15` to accept a `recording_type` enum so the same handler can persist screen captures (or introduce `/api/annotation-sessions/upload` if separation is clearer).
  - Store resulting paths + click JSON on the relevant annotation task (`backend/models/annotation.py`) via a new repository helper in `services/annotation_service.py`.
- **Data & Storage**
  - Write videos under `uploads/videos/` (reuse existing FFmpeg-ready structure) and click logs under `uploads/click-logs/`.
  - Update task payload (`AnnotationTask`) to include `session_recording_url` and `click_log_url` so the dashboard surfaces can display links.
- **Reviewer Experience**
  - Enhance `dashboard-frontend/src/pages/ReviewAnnotation.jsx:1` (or dedicated viewer) with an embedded HTML5 `<video>` element, playback controls, and a map overlay using click timeline data.

## Implementation Steps
1. **Design Review**
   - Confirm whether recordings should be scoped per annotation submission or per job.
   - Decide on retention policy and whether to gate behind a feature flag.
2. **Backend Enhancements**
   - Update upload endpoint (or add new one) to store screen recordings and return asset URLs.
   - Add persistence for click logs; update `AnnotationTask` schema & migrations (Mongo update path).
   - Extend task DTOs so the dashboard receives new fields.
3. **Frontend Services**
   - Build `screenRecorder.ts` service with `start`, `stop`, `waitForUpload`, mirroring the existing `VideoRecorder`.
   - Implement `clickTracker.ts` abstraction; ensure passive listeners are removed on stop.
   - Add integration tests (React Testing Library) for basic start/stop flow via mock MediaRecorder.
4. **Annotator UI**
   - Add recording controls (start/pause/stop indicator) to the primary annotation workspace (likely `AnnotationData.jsx` or task-specific workspace).
   - Handle edge cases: permission denial, accidental tab closure, long-running sessions.
5. **Reviewer UI**
   - Surface links in `ReviewAnnotation.jsx` to download/play the session.
   - Optional: visualize click heatmap or sequential markers overlay during playback.
6. **QA & Ops**
   - Manual test across Chrome + Edge (desktop) ensuring cursor overlay is visible.
   - Document setup in `SETUP.md` (browser permissions, HTTPS requirements for getDisplayMedia).
   - Add monitoring hooks (log start/stop events server-side, flag failed uploads).

## Risks & Mitigations
- **Permission friction:** `getDisplayMedia` prompts every time; mitigate with inline helper text and fallback instructions.
- **Large uploads:** long recordings can grow quickly; set sensible `MediaRecorder` bitrate and warn after N minutes.
- **Browser support:** Safari has limited screen capture support—document minimum browser versions and detect unsupported cases client-side.
- **Security:** ensure only authenticated annotators can upload; validate task ownership before attaching assets.

## Open Questions
- Should recordings auto-start when an annotator begins a task, or remain manual?
- Do we need to redact any sensitive data before storage (PII in screen capture)?
- What retention/cleanup strategy should run against `uploads/videos` and click logs?

## Definition of Done
- Annotator can record a screen session with optional audio, stop, and see a success state.
- Click telemetry uploads with recording and appears in task metadata.
- Reviewers can play back the recording and inspect sequential click data.
- Documentation updated (`SETUP.md`, `docs/` changelog) and smoke tests executed on target browsers.
