/**
 * Animated AI presence indicator - soft, organic motion and responsive to state.
 * Subtle idle breathing when inactive, dynamic pulsing when speaking.
 */

import React from 'react';
import { useIsAIPlaying } from '../../store/interviewStore.ts';

interface AvatarCanvasProps {
  className?: string;
}

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({ className }) => {
  const isAIPlaying = useIsAIPlaying();

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Ambient glow layers for depth */}
      <div
        style={{
          position: 'absolute',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: isAIPlaying
            ? 'radial-gradient(circle, rgba(232, 92, 36, 0.15) 0%, rgba(232, 92, 36, 0) 70%)'
            : 'radial-gradient(circle, rgba(232, 92, 36, 0.05) 0%, rgba(232, 92, 36, 0) 70%)',
          filter: 'blur(40px)',
          transition: 'all 0.6s ease-in-out',
        }}
      />

      {/* Main AI presence indicator */}
      <div
        style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #e85c24 0%, #d94817 50%, #c93d0f 100%)',
          boxShadow: isAIPlaying
            ? '0 0 80px rgba(232, 92, 36, 0.8), 0 0 150px rgba(201, 61, 15, 0.5)'
            : '0 8px 32px rgba(232, 92, 36, 0.25)',
          animation: isAIPlaying ? 'speakingPulse 1.2s ease-in-out infinite' : 'none',
        }}
      />

      <style>{`
        @keyframes speakingPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
};
