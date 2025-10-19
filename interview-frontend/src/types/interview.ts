/**
 * TypeScript type definitions for realtime interview system.
 */

// ===== WebSocket Message Types =====

export interface AlignmentUnit {
  t: number; // Start time in seconds
  d: number; // Duration in seconds
  unit: 'char' | 'word' | 'phoneme';
  val: string; // Character, word, or phoneme value
}

// Client ’ Server Messages

export interface StartSessionMessage {
  event: 'start';
  session_id: string;
  interview_id?: string;
  candidate_id?: string;
}

export interface MicChunkMessage {
  event: 'mic_chunk';
  seq: number;
  audio_b64: string;
  timestamp?: number;
}

export interface UserTurnEndMessage {
  event: 'user_turn_end';
  timestamp?: number;
}

export interface BargeInMessage {
  event: 'barge_in';
  timestamp?: number;
}

export interface EndSessionMessage {
  event: 'end';
  reason?: string;
}

export type ClientMessage =
  | StartSessionMessage
  | MicChunkMessage
  | UserTurnEndMessage
  | BargeInMessage
  | EndSessionMessage;

// Server ’ Client Messages

export interface SessionReadyMessage {
  event: 'session_ready';
  session_id: string;
  avatar_url?: string;
}

export interface TranscriptMessage {
  event: 'transcript';
  text: string;
  final: boolean;
  speaker: 'user' | 'ai';
  timestamp?: number;
}

export interface TTSChunkMessage {
  event: 'tts_chunk';
  seq: number;
  audio_b64: string;
  align?: AlignmentUnit[];
  is_final: boolean;
}

export interface AnswerEndMessage {
  event: 'answer_end';
  timestamp?: number;
}

export interface NoticeMessage {
  event: 'notice';
  msg: string;
  level?: 'info' | 'warning';
}

export interface ErrorMessage {
  event: 'error';
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface MetricsMessage {
  event: 'metrics';
  latency: {
    speech_to_transcript?: number | null;
    transcript_to_tts?: number | null;
    tts_to_playback?: number | null;
    total_turn_time?: number | null;
  };
  timestamp?: number;
}

export type ServerMessage =
  | SessionReadyMessage
  | TranscriptMessage
  | TTSChunkMessage
  | AnswerEndMessage
  | NoticeMessage
  | ErrorMessage
  | MetricsMessage;

// ===== Interview State Types =====

export type InterviewStatus =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'completed'
  | 'error';

export interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface LatencyMetrics {
  speech_to_transcript?: number;
  transcript_to_tts?: number;
  tts_to_playback?: number;
  total_turn_time?: number;
}

// ===== Audio Types =====

export interface AudioChunk {
  seq: number;
  data: Uint8Array;
  timestamp: number;
}

export interface VisemeEvent {
  viseme: string;
  startTime: number;
  endTime: number;
  character: string;
}

// ===== Avatar Types =====

export type VisemeName =
  | 'sil' // Silence
  | 'PP' // Labials: M, B, P
  | 'FF' // F, V
  | 'TH' // TH
  | 'DD' // D, T, L, N
  | 'kk' // K, G
  | 'CH' // CH, J, SH
  | 'SS' // S, Z
  | 'nn' // N
  | 'RR' // R
  | 'aa' // A
  | 'E' // E
  | 'I' // I (ih)
  | 'O' // O
  | 'U'; // U (oo)

export interface VisemeWeight {
  viseme: VisemeName;
  weight: number; // 0-1
}

export interface VisemeTimeline {
  time: number;
  viseme: VisemeName;
  duration: number;
}

// ===== Store State Types =====

export interface InterviewState {
  // Connection
  sessionId: string | null;
  status: InterviewStatus;
  error: string | null;

  // Conversation
  transcripts: TranscriptEntry[];
  currentUserText: string;
  currentAIText: string;

  // Audio
  isMicActive: boolean;
  isAIPlaying: boolean;

  // Avatar
  visemeTimeline: VisemeTimeline[];
  currentVisemes: VisemeWeight[];

  // Metrics
  latencyMetrics: LatencyMetrics | null;
}

// ===== Configuration Types =====

export interface RealtimeInterviewConfig {
  backendUrl: string;
  sessionId: string;
  interviewId?: string;
  candidateId?: string;
  avatarUrl?: string;
}
