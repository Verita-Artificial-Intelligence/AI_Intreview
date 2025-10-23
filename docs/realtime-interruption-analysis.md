# Realtime Interview Interruptions — Analysis

## Findings
- `backend/services/realtime_service.py:88-103` configures OpenAI Realtime with `turn_detection.type="server_vad"` and a fixed `silence_duration_ms=1200`. After roughly 1.2 s of low energy the model assumes the user finished speaking, no matter what audio the mic still sends.
- `backend/routers/websocket.py:424-478` streams raw `mic_chunk`s straight to OpenAI via `input_audio_buffer.append`, committing turns on `user_turn_end`. There is no backend-side noise gate or smoothing, so background sounds are treated as real speech/quiet cycles.
- When server VAD ends a turn, transcript events fire; if Whisper cannot extract text from the noisy slice the code still finalizes an empty user segment (`backend/routers/websocket.py:304-342`), letting the interviewer immediately continue—appearing to interrupt the candidate.
- Because the backend neither double-checks VAD decisions nor waits for sustained user speech after a noisy gap, environments with fluctuating ambient noise (cafés, traffic, fans) create false “silence” windows and premature AI follow-ups.

## Potential Remediations
1. Increase or adapt `silence_duration_ms` instead of leaving it at 1200 ms for all contexts.
2. Add noise suppression / energy thresholding before forwarding `mic_chunk` payloads to OpenAI.
3. Delay `input_audio_buffer.commit` until sufficient speech is observed or confirm speech has actually stopped before triggering the AI response.
