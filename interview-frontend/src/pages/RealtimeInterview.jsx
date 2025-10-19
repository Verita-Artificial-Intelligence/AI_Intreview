/**
 * Realtime Interview Page - Main page for conducting AI interviews with avatar lip sync.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AvatarCanvas } from '../components/avatar/AvatarCanvas.tsx';
import { InterviewControls, StatusIndicator } from '../components/interview/InterviewControls.tsx';
import { useInterviewStore } from '../store/interviewStore.ts';
import { WebSocketClient } from '../services/wsClient.ts';
import { AudioCapture } from '../services/audioCapture.ts';
import { AudioPlayer } from '../services/audioPlayer.ts';
import { LipSyncController } from '../components/avatar/lipSync.ts';
import { v4 as uuidv4 } from 'uuid';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const WS_URL = BACKEND_URL.replace('http', 'ws');

export default function RealtimeInterview() {
  const navigate = useNavigate();
  const { interviewId } = useParams();

  // Store
  const {
    status,
    setStatus,
    setSessionId,
    setError,
    addTranscript,
    setMicActive,
    setAIPlaying,
    setCurrentVisemes,
    setLatencyMetrics,
    reset,
  } = useInterviewStore();

  // Services
  const wsClientRef = useRef(null);
  const audioCaptureRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const lipSyncRef = useRef(new LipSyncController());

  // State
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize services on mount
  useEffect(() => {
    initializeServices();

    return () => {
      cleanup();
    };
  }, []);

  /**
   * Initialize all services.
   */
  const initializeServices = async () => {
    try {
      // Initialize audio services
      audioCaptureRef.current = new AudioCapture();
      await audioCaptureRef.current.initialize();

      audioPlayerRef.current = new AudioPlayer();
      await audioPlayerRef.current.initialize();

      // Set up audio player callbacks
      audioPlayerRef.current.onPlaybackStart(() => {
        setAIPlaying(true);
        setStatus('speaking');
      });

      audioPlayerRef.current.onPlaybackEnd(() => {
        setAIPlaying(false);
        setStatus('listening');
      });

      setIsInitialized(true);
      console.log('Services initialized');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      setError('Failed to initialize audio services. Please check permissions.');
    }
  };

  /**
   * Start interview session.
   */
  const handleStartInterview = async () => {
    try {
      setStatus('connecting');
      reset();

      const sessionId = uuidv4();
      setSessionId(sessionId);

      // Connect to WebSocket
      const wsClient = new WebSocketClient(`${WS_URL}/ws/session`);
      wsClientRef.current = wsClient;

      // Set up WebSocket event handlers
      setupWebSocketHandlers(wsClient);

      // Connect
      await wsClient.connect();

      // Send start message
      wsClient.send({
        event: 'start',
        session_id: sessionId,
        interview_id: interviewId,
      });

      console.log('Interview started:', sessionId);
    } catch (error) {
      console.error('Failed to start interview:', error);
      setError('Failed to connect to server');
      setStatus('error');
    }
  };

  /**
   * Set up WebSocket event handlers.
   */
  const setupWebSocketHandlers = (wsClient) => {
    wsClient.on('session_ready', (message) => {
      console.log('Session ready:', message);
      setStatus('ready');

      if (message.avatar_url) {
        setAvatarUrl(message.avatar_url);
      }

      // Start capturing audio
      startMicrophone();
    });

    wsClient.on('transcript', (message) => {
      console.log('Transcript:', message);

      addTranscript({
        id: uuidv4(),
        speaker: message.speaker,
        text: message.text,
        timestamp: Date.now(),
      });

      if (message.speaker === 'user' && message.final) {
        setStatus('processing');
      }
    });

    wsClient.on('tts_chunk', async (message) => {
      if (!audioPlayerRef.current) return;

      // Play audio chunk
      if (message.audio_b64) {
        await audioPlayerRef.current.playChunk(message.audio_b64);
      }

      // Add viseme alignment data
      if (message.align && message.align.length > 0) {
        const baseTime = audioPlayerRef.current.getCurrentPlaybackTime();
        lipSyncRef.current.addAlignmentData(message.align, baseTime);
      }
    });

    wsClient.on('answer_end', () => {
      console.log('Answer ended');
    });

    wsClient.on('notice', (message) => {
      console.log('Notice:', message.msg);
    });

    wsClient.on('error_message', (message) => {
      console.error('Server error:', message);
      setError(message.message);
    });

    wsClient.on('metrics', (message) => {
      console.log('Latency metrics:', message.latency);
      setLatencyMetrics(message.latency);
    });

    wsClient.on('disconnected', () => {
      console.log('WebSocket disconnected');
      setStatus('error');
      setError('Connection lost');
    });
  };

  /**
   * Start microphone capture.
   */
  const startMicrophone = () => {
    if (!audioCaptureRef.current || !wsClientRef.current) return;

    setMicActive(true);
    setStatus('listening');

    audioCaptureRef.current.start((seq, audioB64) => {
      // Send audio chunk to server
      if (wsClientRef.current && wsClientRef.current.isConnected()) {
        wsClientRef.current.send({
          event: 'mic_chunk',
          seq,
          audio_b64: audioB64,
        });
      }
    });

    console.log('Microphone started');
  };

  /**
   * Stop microphone capture.
   */
  const stopMicrophone = () => {
    if (!audioCaptureRef.current) return;

    audioCaptureRef.current.stop();
    setMicActive(false);

    console.log('Microphone stopped');
  };

  /**
   * Toggle microphone on/off.
   */
  const handleToggleMic = () => {
    if (audioCaptureRef.current?.isActive()) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  };

  /**
   * Send user turn end signal.
   */
  const handleUserTurnEnd = () => {
    if (wsClientRef.current && wsClientRef.current.isConnected()) {
      wsClientRef.current.send({
        event: 'user_turn_end',
      });
    }
  };

  /**
   * Interrupt AI response.
   */
  const handleInterrupt = () => {
    if (wsClientRef.current && wsClientRef.current.isConnected()) {
      wsClientRef.current.send({
        event: 'barge_in',
      });
    }

    // Stop audio playback
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
    }

    // Clear lip sync timeline
    lipSyncRef.current.clear();
  };

  /**
   * End interview session.
   */
  const handleEndInterview = () => {
    if (wsClientRef.current && wsClientRef.current.isConnected()) {
      wsClientRef.current.send({
        event: 'end',
        reason: 'user_ended',
      });
    }

    cleanup();
    navigate('/status');
  };

  /**
   * Clean up all resources.
   */
  const cleanup = () => {
    if (audioCaptureRef.current) {
      audioCaptureRef.current.dispose();
      audioCaptureRef.current = null;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.dispose();
      audioPlayerRef.current = null;
    }

    if (wsClientRef.current) {
      wsClientRef.current.close();
      wsClientRef.current = null;
    }

    lipSyncRef.current.clear();
  };

  // Update viseme weights every frame
  useEffect(() => {
    if (!audioPlayerRef.current) return;

    const interval = setInterval(() => {
      if (audioPlayerRef.current?.isCurrentlyPlaying()) {
        const currentTime = audioPlayerRef.current.getCurrentPlaybackTime();
        const visemes = lipSyncRef.current.getCurrentVisemes(currentTime);
        setCurrentVisemes(visemes);
      } else {
        setCurrentVisemes([{ viseme: 'sil', weight: 1.0 }]);
      }
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(interval);
  }, [setCurrentVisemes]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">AI Interview</h1>
        <StatusIndicator />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Avatar Section */}
        <div className="w-1/2 bg-gray-900">
          {avatarUrl ? (
            <AvatarCanvas avatarUrl={avatarUrl} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">=d</div>
                <div>Avatar Loading...</div>
              </div>
            </div>
          )}
        </div>

        {/* Transcript Section */}
        <div className="w-1/2 flex flex-col">
          <TranscriptView />
        </div>
      </div>

      {/* Controls */}
      <InterviewControls
        onStartInterview={handleStartInterview}
        onEndInterview={handleEndInterview}
        onInterrupt={handleInterrupt}
        onToggleMic={handleToggleMic}
      />
    </div>
  );
}

/**
 * Transcript view component.
 */
function TranscriptView() {
  const transcripts = useInterviewStore((state) => state.transcripts);
  const transcriptRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Conversation</h2>
      </div>
      <div
        ref={transcriptRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {transcripts.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            No messages yet. Start the interview to begin.
          </div>
        ) : (
          transcripts.map((transcript) => (
            <div
              key={transcript.id}
              className={`flex ${
                transcript.speaker === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  transcript.speaker === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <div className="text-xs font-semibold mb-1">
                  {transcript.speaker === 'user' ? 'You' : 'AI Interviewer'}
                </div>
                <div>{transcript.text}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
