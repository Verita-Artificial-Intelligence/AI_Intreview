/**
 * Interview controls component - Video call style controls.
 */

import React from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { useInterviewStore } from '../../store/interviewStore.ts';

interface InterviewControlsProps {
  onEndInterview: () => void;
  onInterrupt: () => void;
  onToggleMic: () => void;
}

export const InterviewControls: React.FC<InterviewControlsProps> = ({
  onEndInterview,
  onToggleMic,
}) => {
  const status = useInterviewStore((state) => state.status);
  const isMicActive = useInterviewStore((state) => state.isMicActive);

  return (
    <div className="flex items-center justify-center gap-8 px-6 py-5 bg-white/80 backdrop-blur-md border-t border-gray-200">
      {/* Microphone Toggle */}
      <button
        onClick={onToggleMic}
        className={`
          flex items-center justify-center
          w-14 h-14 rounded-full
          transition-all duration-300 ease-out
          shadow-lg hover:shadow-xl
          ${
            isMicActive
              ? 'bg-white hover:bg-gray-50 text-gray-700'
              : 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white'
          }
        `}
        title={isMicActive ? 'Mute' : 'Unmute'}
        aria-label={isMicActive ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isMicActive ? (
          <Mic className="w-6 h-6" />
        ) : (
          <MicOff className="w-6 h-6" />
        )}
      </button>

      {/* End Call - Destructive action */}
      <button
        onClick={onEndInterview}
        className="
          flex items-center justify-center
          w-14 h-14 rounded-full
          bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600
          text-white
          transition-all duration-300 ease-out
          shadow-lg hover:shadow-xl
        "
        title="End Interview"
        aria-label="End interview"
      >
        <PhoneOff className="w-6 h-6" />
      </button>

      {/* Status Text */}
      {status === 'connecting' && (
        <div className="absolute left-6 text-gray-600 text-sm font-medium animate-pulse">
          Connecting...
        </div>
      )}
    </div>
  );
};

/**
 * Status indicator component - Centered beneath AI presence.
 * Provides real-time feedback on interview state with smooth transitions.
 */
export const StatusIndicator: React.FC = () => {
  const status = useInterviewStore((state) => state.status);
  const isMicActive = useInterviewStore((state) => state.isMicActive);
  const isAIPlaying = useInterviewStore((state) => state.isAIPlaying);

  const getStatusInfo = () => {
    if (status === 'listening' && isMicActive) {
      return {
        label: 'Listening',
        color: 'bg-emerald-500',
        pulse: true,
      };
    }

    if (status === 'processing') {
      return {
        label: 'Thinking',
        color: 'bg-amber-500',
        pulse: true,
      };
    }

    if (status === 'speaking' || isAIPlaying) {
      return {
        label: 'Speaking',
        color: 'bg-orange-500',
        pulse: true,
      };
    }

    if (status === 'error') {
      return {
        label: 'Error',
        color: 'bg-red-500',
        pulse: false,
      };
    }

    return null;
  };

  const statusInfo = getStatusInfo();

  if (!statusInfo) return null;

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/60 backdrop-blur-md rounded-full border border-gray-300/50 shadow-lg transition-all duration-300 ease-out">
      <div
        className={`w-2.5 h-2.5 rounded-full ${statusInfo.color} ${
          statusInfo.pulse ? 'animate-pulse' : ''
        } transition-colors duration-300`}
      />
      <span className="text-xs font-medium text-gray-700 tracking-wide">{statusInfo.label}</span>
    </div>
  );
};
