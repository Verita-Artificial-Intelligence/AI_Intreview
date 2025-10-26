/**
 * Interview controls component - Video call style controls.
 */

import React from 'react'
import { Mic, MicOff, PhoneOff } from 'lucide-react'
import { useInterviewStore } from '../../store/interviewStore.ts'

interface InterviewControlsProps {
  onEndInterview: () => void
  onInterrupt: () => void
  onToggleMic: () => void
  onEndTurn?: () => void
}

export const InterviewControls: React.FC<InterviewControlsProps> = ({
  onEndInterview,
  onToggleMic,
  onEndTurn,
}) => {
  const status = useInterviewStore((state) => state.status)
  const isMicActive = useInterviewStore((state) => state.isMicActive)
  const isAIPlaying = useInterviewStore((state) => state.isAIPlaying)
  const userAudioLevel = useInterviewStore((state) => state.userAudioLevel)

  // User is speaking when mic is active, audio level exceeds threshold, AND AI is not speaking
  // AI has precedence - we don't show user activity when AI is speaking (system isn't listening)
  const isUserSpeaking = isMicActive && userAudioLevel > 0.02 && !isAIPlaying

  return (
    <>
      <style>{`
        @keyframes micPulseOuter {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        @keyframes micPulseInner {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.2;
          }
        }
      `}</style>

      <div className="flex items-center justify-center gap-8 px-6 py-5 bg-white/80 backdrop-blur-md border-t border-gray-200">
        {/* Microphone Toggle with Voice Activity Indicator */}
        <div className="relative flex items-center justify-center">
          {/* Voice activity pulse rings - Meet/Skype style */}
          {isUserSpeaking && (
            <>
              <div
                className="absolute inset-0 w-14 h-14 rounded-full bg-sky-400/40"
                style={{
                  animation: 'micPulseOuter 0.8s ease-out infinite',
                }}
              />
              <div
                className="absolute inset-0 w-14 h-14 rounded-full bg-sky-400/30"
                style={{
                  animation: 'micPulseInner 0.8s ease-out infinite 0.1s',
                }}
              />
            </>
          )}

          <button
            onClick={onToggleMic}
            disabled={status === 'ended'}
            className={`
            relative z-10
            flex items-center justify-center
            w-14 h-14 rounded-full
            transition-all duration-300 ease-out
            shadow-lg hover:shadow-xl
            ${
              status === 'ended'
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : isMicActive
                  ? 'bg-white hover:bg-gray-50 text-gray-700'
                  : 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white'
            }
          `}
            title={isMicActive ? 'Mute' : 'Unmute'}
            aria-label={isMicActive ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isMicActive && status !== 'ended' ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </button>
        </div>

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
        {status === 'ended' && (
          <div className="absolute left-6 text-gray-600 text-sm font-medium">
            Ended
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Status indicator component - Centered beneath AI presence.
 * Provides real-time feedback on interview state with smooth transitions.
 */
export const StatusIndicator: React.FC = () => {
  const status = useInterviewStore((state) => state.status)
  const isMicActive = useInterviewStore((state) => state.isMicActive)
  const isAIPlaying = useInterviewStore((state) => state.isAIPlaying)

  const getStatusInfo = () => {
    if (status === 'listening' && isMicActive) {
      return {
        label: 'Listening',
        color: 'bg-emerald-500',
        pulse: true,
      }
    }

    if (status === 'processing') {
      return {
        label: 'Thinking',
        color: 'bg-amber-500',
        pulse: true,
      }
    }

    if (status === 'speaking' || isAIPlaying) {
      return {
        label: 'Speaking',
        color: 'bg-pink-500',
        pulse: true,
      }
    }

    if (status === 'error') {
      return {
        label: 'Error',
        color: 'bg-red-500',
        pulse: false,
      }
    }

    return null
  }

  const statusInfo = getStatusInfo()

  if (!statusInfo) return null

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/60 backdrop-blur-md rounded-full border border-gray-300/50 shadow-lg transition-all duration-300 ease-out">
      <div
        className={`w-2.5 h-2.5 rounded-full ${statusInfo.color} ${
          statusInfo.pulse ? 'animate-pulse' : ''
        } transition-colors duration-300`}
      />
      <span className="text-xs font-medium text-gray-700 tracking-wide">
        {statusInfo.label}
      </span>
    </div>
  )
}
