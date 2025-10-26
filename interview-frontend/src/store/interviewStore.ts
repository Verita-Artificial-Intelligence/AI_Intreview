/**
 * Zustand store for realtime interview state management.
 */

import { create } from 'zustand'
import {
  InterviewState,
  InterviewStatus,
  TranscriptEntry,
  LatencyMetrics,
} from '../types/interview.ts'

interface InterviewStore extends InterviewState {
  // Actions
  setStatus: (status: InterviewStatus) => void
  setSessionId: (sessionId: string) => void
  setError: (error: string | null) => void
  addTranscript: (transcript: TranscriptEntry) => void
  setCurrentUserText: (text: string) => void
  setCurrentAIText: (text: string) => void
  setMicActive: (active: boolean) => void
  setAIPlaying: (playing: boolean) => void
  setUserAudioLevel: (level: number) => void
  setLatencyMetrics: (metrics: LatencyMetrics) => void
  clearTranscripts: () => void
  reset: () => void
}

const initialState: InterviewState = {
  sessionId: null,
  status: 'idle',
  error: null,
  transcripts: [],
  currentUserText: '',
  currentAIText: '',
  isMicActive: false,
  isAIPlaying: false,
  userAudioLevel: 0,
  latencyMetrics: null,
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setSessionId: (sessionId) => set({ sessionId }),

  setError: (error) => set({ error, status: error ? 'error' : 'idle' }),

  addTranscript: (transcript) =>
    set((state) => ({
      transcripts: [...state.transcripts, transcript],
    })),

  setCurrentUserText: (text) => set({ currentUserText: text }),

  setCurrentAIText: (text) => set({ currentAIText: text }),

  setMicActive: (active) => set({ isMicActive: active }),

  setAIPlaying: (playing) => set({ isAIPlaying: playing }),

  setUserAudioLevel: (level) => set({ userAudioLevel: level }),

  setLatencyMetrics: (metrics) => set({ latencyMetrics: metrics }),

  clearTranscripts: () => set({ transcripts: [] }),

  reset: () => set(initialState),
}))

// Selectors for optimized re-renders
export const useInterviewStatus = () =>
  useInterviewStore((state) => state.status)

export const useTranscripts = () =>
  useInterviewStore((state) => state.transcripts)

export const useIsAIPlaying = () =>
  useInterviewStore((state) => state.isAIPlaying)

export const useIsMicActive = () =>
  useInterviewStore((state) => state.isMicActive)

export const useUserAudioLevel = () =>
  useInterviewStore((state) => state.userAudioLevel)
