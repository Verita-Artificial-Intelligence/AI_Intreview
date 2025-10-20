/**
 * Realtime Interview Page - Main page for conducting AI interviews with avatar lip sync.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AvatarCanvas } from '../components/avatar/AvatarCanvas.tsx';
import { InterviewControls } from '../components/interview/InterviewControls.tsx';
import { useInterviewStore } from '../store/interviewStore.ts';
import { WebSocketClient } from '../services/wsClient.ts';
import { AudioCapture } from '../services/audioCapture.ts';
import { AudioPlayer } from '../services/audioPlayer.ts';
import { VideoRecorder } from '../services/videoRecorder.ts';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const WS_URL = BACKEND_URL.replace('http', 'ws');

export default function RealtimeInterview() {
  const navigate = useNavigate();
  const { interviewId } = useParams();
  const { token } = useAuth();

  // Store
  const {
    status,
    setStatus,
    setSessionId,
    setError,
    addTranscript,
    setMicActive,
    setAIPlaying,
    setLatencyMetrics,
    reset,
  } = useInterviewStore();

  // Services
  const wsClientRef = useRef(null);
  const audioCaptureRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const mutedRef = useRef(false);

  // Initialize services on mount
  useEffect(() => {
    initializeServices();

    return () => {
      cleanup();
    };
  }, []);

  // Auto-start interview once services are initialized
  useEffect(() => {
    if (isInitialized && status === 'idle') {
      handleStartInterview();
    }
  }, [isInitialized]);

  /**
   * Initialize all services.
   */
  const initializeServices = async () => {
    try {
      // Get user media first
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });
      setMediaStream(stream);

      // Initialize audio services
      audioCaptureRef.current = new AudioCapture();
      await audioCaptureRef.current.initialize(stream);

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
    });

    wsClient.on('answer_end', () => {
      console.log('Answer ended');
      // When AI finishes an answer and we're not ended, go back to listening
      if (useInterviewStore.getState().status !== 'ended') {
        setStatus('listening');
      }
    });

    wsClient.on('conversation_ended', () => {
      console.log('Conversation ended by AI');
      // Stop mic & audio, set ended state
      stopMicrophone();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.stop();
      }
      setStatus('ended');
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
      // If we already ended gracefully, don't mark as error
      if (useInterviewStore.getState().status !== 'ended') {
        setStatus('error');
        setError('Connection lost');
      }
    });
  };

  /**
   * Start microphone capture.
   */
  const startMicrophone = () => {
    if (!audioCaptureRef.current || !wsClientRef.current) return;

    // Mic is considered active when we are sending (not muted)
    setMicActive(!mutedRef.current);
    setStatus('listening');

    audioCaptureRef.current.start((seq, audioB64) => {
      // Only send audio when not muted; OpenAI handles VAD
      if (
        !mutedRef.current &&
        wsClientRef.current &&
        wsClientRef.current.isConnected()
      ) {
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
    // Toggle mute without stopping capture; preserve VAD flow
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setIsMuted(nextMuted);
    setMicActive(!nextMuted);
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
  };

  /**
   * End interview session.
   */
  const handleEndInterview = async () => {
    if (wsClientRef.current && wsClientRef.current.isConnected()) {
      wsClientRef.current.send({
        event: 'end',
        reason: 'user_ended',
      });
    }

    cleanup();

    // Mark interview as completed via API
    if (interviewId && token) {
      try {
        await axios.post(
          `${BACKEND_URL}/api/interviews/${interviewId}/complete`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log('Interview marked as completed');
      } catch (error) {
        console.error('Failed to mark interview as completed:', error);
      }
    }

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

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-gradient-to-b from-neutral-50 via-white to-neutral-100">

      {/* Main Video Area */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* AI Avatar - Centered presentation zone */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AvatarCanvas />
        </div>

        {/* User Camera - Bottom Right, refined styling */}
        <div className="absolute bottom-8 right-8 w-64 h-48 rounded-xl overflow-hidden shadow-xl border border-gray-300/50 backdrop-blur-sm bg-white/20">
          <UserVideoFeed
            sessionId={useInterviewStore((state) => state.sessionId)}
            interviewId={interviewId}
            stream={mediaStream}
            status={status}
          />
        </div>
      </div>

      {/* Bottom Controls Bar - refined styling */}
      <InterviewControls
        onEndInterview={handleEndInterview}
        onInterrupt={handleInterrupt}
        onToggleMic={handleToggleMic}
        onEndTurn={handleUserTurnEnd}
      />
    </div>
  );
}

/**
 * User video feed component with recording.
 */
function UserVideoFeed({ sessionId, interviewId, stream, status }) {
  const videoRef = useRef(null);
  const videoRecorderRef = useRef(new VideoRecorder());
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    // No cleanup needed here for the stream, parent component handles it
  }, [stream]);

  // Start recording when session is ready
  useEffect(() => {
    if (stream && sessionId && !isRecording) {
      videoRecorderRef.current
        .startRecording(stream, sessionId, interviewId)
        .then(() => {
          setIsRecording(true);
        })
        .catch((error) => {
          console.error('Failed to start recording:', error);
        });
    }

    return () => {
      if (isRecording) {
        videoRecorderRef.current.stopRecording();
      }
    };
  }, [stream, sessionId, interviewId, isRecording]);

  // Stop recording when conversation ends
  useEffect(() => {
    if (status === 'ended' && isRecording) {
      videoRecorderRef.current.stopRecording();
      setIsRecording(false);
    }
  }, [status, isRecording]);

  return (
    <div className="relative w-full h-full bg-black/80">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      {isRecording && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-red-600/90 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span>Recording</span>
        </div>
      )}
    </div>
  );
}
