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
            ? 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, rgba(236, 72, 153, 0) 70%)'
            : 'radial-gradient(circle, rgba(236, 72, 153, 0.05) 0%, rgba(236, 72, 153, 0) 70%)',
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
          background: 'linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%)',
          boxShadow: isAIPlaying
            ? '0 0 80px rgba(236, 72, 153, 0.8), 0 0 150px rgba(190, 24, 93, 0.5)'
            : '0 8px 32px rgba(236, 72, 153, 0.25)',
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
