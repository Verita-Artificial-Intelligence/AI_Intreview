/**
 * Interview controls component - UI for controlling the realtime interview.
 */

import React from 'react';
import { Mic, MicOff, Hand, XCircle } from 'lucide-react';
import { useInterviewStore } from '../../store/interviewStore';
import { Button } from '../ui/button';

interface InterviewControlsProps {
  onStartInterview: () => void;
  onEndInterview: () => void;
  onInterrupt: () => void;
  onToggleMic: () => void;
}

export const InterviewControls: React.FC<InterviewControlsProps> = ({
  onStartInterview,
  onEndInterview,
  onInterrupt,
  onToggleMic,
}) => {
  const status = useInterviewStore((state) => state.status);
  const isMicActive = useInterviewStore((state) => state.isMicActive);
  const isAIPlaying = useInterviewStore((state) => state.isAIPlaying);

  return (
    <div className="flex items-center justify-center gap-4 p-6 bg-white border-t">
      {/* Start/End Interview */}
      {status === 'idle' || status === 'error' ? (
        <Button
          onClick={onStartInterview}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
        >
          Start Interview
        </Button>
      ) : status === 'connecting' || status === 'ready' ? (
        <div className="text-gray-600">Connecting...</div>
      ) : (
        <>
          {/* Microphone Toggle */}
          <Button
            onClick={onToggleMic}
            variant={isMicActive ? 'default' : 'outline'}
            size="lg"
            className={isMicActive ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isMicActive ? (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Listening
              </>
            ) : (
              <>
                <MicOff className="w-5 h-5 mr-2" />
                Muted
              </>
            )}
          </Button>

          {/* Interrupt AI */}
          {isAIPlaying && (
            <Button onClick={onInterrupt} variant="outline" size="lg">
              <Hand className="w-5 h-5 mr-2" />
              Interrupt
            </Button>
          )}

          {/* End Interview */}
          <Button
            onClick={onEndInterview}
            variant="destructive"
            size="lg"
          >
            <XCircle className="w-5 h-5 mr-2" />
            End Interview
          </Button>
        </>
      )}
    </div>
  );
};

/**
 * Status indicator component.
 */
export const StatusIndicator: React.FC = () => {
  const status = useInterviewStore((state) => state.status);
  const isMicActive = useInterviewStore((state) => state.isMicActive);
  const isAIPlaying = useInterviewStore((state) => state.isAIPlaying);

  const getStatusInfo = () => {
    if (status === 'listening' && isMicActive) {
      return {
        label: 'Listening...',
        color: 'bg-green-500',
        pulse: true,
      };
    }

    if (status === 'processing') {
      return {
        label: 'Processing...',
        color: 'bg-yellow-500',
        pulse: true,
      };
    }

    if (status === 'speaking' || isAIPlaying) {
      return {
        label: 'AI Speaking...',
        color: 'bg-blue-500',
        pulse: true,
      };
    }

    if (status === 'ready') {
      return {
        label: 'Ready',
        color: 'bg-gray-400',
        pulse: false,
      };
    }

    if (status === 'error') {
      return {
        label: 'Error',
        color: 'bg-red-500',
        pulse: false,
      };
    }

    return {
      label: 'Idle',
      color: 'bg-gray-300',
      pulse: false,
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
      <div
        className={`w-3 h-3 rounded-full ${statusInfo.color} ${
          statusInfo.pulse ? 'animate-pulse' : ''
        }`}
      />
      <span className="text-sm font-medium text-gray-700">{statusInfo.label}</span>
    </div>
  );
};
