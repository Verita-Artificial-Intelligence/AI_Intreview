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
import { VideoRecorder } from '../services/videoRecorder.ts';
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
    setLatencyMetrics,
    reset,
  } = useInterviewStore();

  // Services
  const wsClientRef = useRef(null);
  const audioCaptureRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldForwardAudio, setShouldForwardAudio] = useState(true);

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
      // Initialize audio services
      audioCaptureRef.current = new AudioCapture();
      await audioCaptureRef.current.initialize();

      audioPlayerRef.current = new AudioPlayer();
      await audioPlayerRef.current.initialize();

      // Set up audio player callbacks
      audioPlayerRef.current.onPlaybackStart(() => {
        setAIPlaying(true);
        setStatus('speaking');

        // Stop forwarding audio chunks while AI is speaking to avoid echo
        setShouldForwardAudio(false);
      });

      audioPlayerRef.current.onPlaybackEnd(() => {
        setAIPlaying(false);
        setStatus('listening');

        // Resume forwarding audio chunks after AI finishes speaking
        setShouldForwardAudio(true);
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
      // Send audio chunk to server only if we should forward audio
      if (wsClientRef.current && wsClientRef.current.isConnected() && shouldForwardAudio) {
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
          <UserVideoFeed sessionId={useInterviewStore((state) => state.sessionId)} interviewId={interviewId} />
        </div>
      </div>

      {/* Bottom Controls Bar - refined styling */}
      <InterviewControls
        onEndInterview={handleEndInterview}
        onInterrupt={handleInterrupt}
        onToggleMic={handleToggleMic}
      />
    </div>
  );
}

/**
 * User video feed component with recording.
 */
function UserVideoFeed({ sessionId, interviewId }) {
  const videoRef = useRef(null);
  const videoRecorderRef = useRef(new VideoRecorder());
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    let videoStream = null;

    const startCamera = async () => {
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
        }

        setStream(videoStream);
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };

    startCamera();

    return () => {
      // Stop camera when component unmounts
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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
  }, [stream, sessionId, interviewId]);

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
