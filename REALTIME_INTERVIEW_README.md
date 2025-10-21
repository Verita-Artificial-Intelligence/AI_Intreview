# Realtime Interview Architecture & Operations

This guide explains how the realtime interview flow works end-to-end, how audio/video synchronization is preserved, and what to monitor when something goes wrong. It complements the high-level project overview in `README.md` and the environment checklist in `SETUP.md`.

---

## System Overview

The realtime experience involves four continuously running pieces:

1. **Browser interview client (`interview-frontend`)**
   - Captures microphone + camera, streams audio chunks to the backend.
   - Plays OpenAI Realtime responses via the Web Audio API and reports the scheduled playback time for every chunk.
   - Records a WebM video containing the user’s microphone audio and uploads it at the end of the session.
2. **Backend websocket proxy (`backend/routers/websocket.py`)**
   - Maintains two WebSocket connections: one to the browser, one to OpenAI Realtime.
   - Buffers microphone and AI audio streams via `AudioBuffer`.
   - Persists transcripts, orchestrates conversation turns, and triggers server-side audio mixing.
3. **Audio pipeline (`backend/services/audio_buffer.py`, `backend/services/audio_mixer.py`)**
   - Collects timestamped chunks into structured timelines.
   - Mixes microphone and AI audio into separate WAVs plus a combined track.
4. **Media export (`backend/routers/interviews.py`)**
   - Waits for the mixed audio to appear, then muxes it with the uploaded WebM using FFmpeg.
   - Stores the final MP4 in `backend/uploads/videos` and updates the interview record.

Key properties:

- Audio is downsampled to 24 kHz mono PCM16 for low-latency transport and mixing.
- Microphone timestamps are measured on the client at capture time.
- AI playback timestamps are measured on the client at schedule time, not generation time.
- The backend rewrites chunk timestamps using client telemetry so mixing occurs on the user’s timeline, eliminating drift.

---

## Detailed Flow

### 1. Session Bootstrapping

1. The browser connects to `/ws/session` and sends a `start` event containing `session_id`, `interview_id`, and user/job identifiers.
2. The backend fetches interview context, opens an OpenAI Realtime connection (`RealtimeService`), and seeds the conversation.
3. The client receives `session_ready` and begins streaming microphone chunks (`mic_chunk` events) and recording video locally.

### 2. Streaming Microphone Audio

- `AudioCapture` (Web Audio API) downsamples microphone data to 24 kHz PCM16, slices it into 100 ms chunks, and attaches a capture timestamp derived from the number of emitted samples.
- Each chunk is sent over the websocket as:

  ```json
  {
    "event": "mic_chunk",
    "seq": 123,
    "audio_b64": "<base64 PCM16>",
    "timestamp": 4.8
  }
  ```

- The backend stores it through `AudioBuffer.add_mic_chunk`, which keeps the original client timestamp whenever available.

### 3. Streaming AI Audio

- OpenAI Realtime emits `response.output_audio.delta` events.
- The backend increments a sequence counter (`ai_seq`), buffers the chunk via `AudioBuffer.add_ai_chunk`, and forwards it to the client as a `tts_chunk` payload containing the same `seq`.
- `AudioPlayer.playChunk` schedules playback with a small Web Audio lookahead, then calls the `onScheduled` callback.
- The browser emits an `ai_chunk_played` message so the backend can replace the provisional server timestamp with the actual playback start:

  ```json
  {
    "event": "ai_chunk_played",
    "seq": 58,
    "timestamp": 6.25
  }
  ```

- `AudioBuffer.update_ai_timestamp` rewrites the timeline entry ensuring the mixed audio represents what the user heard, not when the server received the chunks.

### 4. Recording & Upload

- `VideoRecorder` uses `MediaRecorder` to record the combined camera and microphone stream directly in the browser.
- When the session ends (`event: "end"` or websocket closure), the recorder stops and uploads the WebM to `/api/interviews/upload/video`.
- The backend queues audio mixing (if not already done) and waits up to 10 seconds for the mixed WAV path to appear.

### 5. Mixing & Export

- `save_mixed_audio` writes three audio files under `backend/uploads/audio/`:
  - `*_mic.wav` (microphone only)
  - `*_ai.wav` (AI voice only)
  - `*_mixed.wav` (combined, timestamp-aligned track)
- `combine_video_and_audio` invokes FFmpeg to mux the mixed WAV with the WebM video, producing an MP4 stored in `backend/uploads/videos/`.
- The interview document is updated with `video_url` and `audio_paths`.

---

## Operational Checklist

| Concern | What to Monitor | Remediation |
|--------|-----------------|-------------|
| Missing mixed audio | Backend logs for `Audio mixing failed` | Verify `ai_chunk_played` messages arrive; check disk permissions on `backend/uploads/audio`; confirm FFmpeg availability. |
| Audio/Video drift | Listen for AI speech leading/lagging candidate | Ensure frontend build includes telemetry changes (`ai_chunk_played`). Check backend log for `Updated AI chunk timestamp`. |
| Distorted AI voice | Echo of AI in microphone track | Encourage headphone use; the mixer intentionally leaves mic bleed-in to keep context but should be quiet when using headphones. |
| Long export delays | Logs repeating “Waiting for mixed audio…” | Mixing may be slow if audio buffers are empty; confirm session ended gracefully and audio buffer flushed. |
| Realtime disconnects | Websocket closed events, missing `tts_chunk` | Inspect network stability; ensure OpenAI Realtime credentials and model names are valid. The client auto-reconnects (limited attempts). |

---

## Developer Tips

- **Latency instrumentation:** Toggle the `latency` logs in `websocket.py` to trace the time between microphone capture, AI response, and playback. Useful when validating optimizations.
- **Local testing:** For deterministic runs, record short practice interviews and reuse the generated assets under `backend/uploads/audio` to debug mixing without hitting the OpenAI API repeatedly.
- **Storage hygiene:** `uploads/` is not auto-pruned. Add a cron or manual cleanup for stale assets in development environments.
- **FFmpeg upgrades:** Use a modern FFmpeg build (≥ 5.x) to ensure AAC encoding works with the options defined in `combine_video_and_audio`.

---

## Admin Data Explorer

The admin dashboard now includes a **Data Explorer** page (`/admin/data-explorer`) that aggregates annotation tasks, project metadata, and dataset details. It surfaces the same information exposed by the new backend endpoints:

- `GET /api/admin/data` – filterable, paginated table response with task, project, annotator, and dataset fields.
- `GET /api/admin/data/export?format=csv|json` – streaming export that reuses the active filters and sort order.

### Available filters & interactions

- **Projects, annotators, tags** – populated automatically from the aggregated results; tag filtering uses AND semantics by default.
- **Search** – case-insensitive matching across project title, dataset title, annotator name, and task name.
- **Status toggles & rating range** – quick filtering for lifecycle stage and quality thresholds.
- **Created date range** – uses the dual-month calendar picker to scope work by submission window.
- **Sorting** – every sortable column sends `sort_by`/`sort_dir` to the backend so pagination stays consistent with the chosen order.

Exports stream the full filtered dataset without buffering in memory, so large result sets download reliably. The backend creates supporting MongoDB indexes at startup (`job_id`, `annotator_id`, `status`, `quality_rating`, timestamps, and dataset tags) to keep the explorer responsive.

## Troubleshooting Guide

1. **AI voice plays before candidate speaks in MP4**
   - Verify `ai_chunk_played` messages are visible in the browser devtools network inspector.
   - Check backend logs for `Updated AI chunk timestamp`. If missing, the new frontend was not deployed.
   - Confirm system clocks are reasonably in sync; wild clock drift can still cause subtle offsets.

2. **Video has no audio after export**
   - Ensure FFmpeg is installed and accessible (`ffmpeg -version`).
   - Confirm `*_mixed.wav` exists in `backend/uploads/audio`.
   - Look for FFmpeg errors in server logs; codec licensing issues on some Linux distros may require `libx264` packages.

3. **Realtime session stops mid-conversation**
   - Inspect websocket logs for rate-limit or authentication errors from OpenAI.
   - Check browser console for `WebSocket closed` messages and whether the reconnect loop kicked in.

4. **Transcript missing segments**
   - Confirm microphone chunks continue streaming (watch for `mic_chunk` logs).
   - The backend appends transcripts on `conversation.item.done` events; if they stop, the OpenAI session may have ended early.

---

## File Reference

- `backend/routers/websocket.py` — realtime session orchestration.
- `backend/services/audio_buffer.py` — buffering, timestamp management, telemetry updates.
- `backend/services/audio_mixer.py` — MoviePy-based mixing utilities.
- `backend/routers/interviews.py` — video upload endpoint and FFmpeg muxing.
- `interview-frontend/src/services/audioCapture.ts` — microphone capture/downsampling.
- `interview-frontend/src/services/audioPlayer.ts` — playback scheduling and telemetry.
- `interview-frontend/src/services/videoRecorder.ts` — MediaRecorder wrapper.
- `interview-frontend/src/pages/RealtimeInterview.jsx` — UI wiring that ties everything together.

Keep this document updated whenever the realtime protocol, telemetry fields, or media export process changes. A quick checklist for future edits:

- [ ] Do client messages or payloads change? Update the “Detailed Flow” section.
- [ ] Are new dependencies (e.g., different codecs) introduced? Update prerequisites here and in `SETUP.md`.
- [ ] Did log formats or troubleshooting steps evolve? Adjust the Operational Checklist.
