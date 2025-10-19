/**
 * Avatar Canvas component - Sets up Three.js scene with React Three Fiber.
 */

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { ReadyPlayerAvatar } from './ReadyPlayerAvatar';

interface AvatarCanvasProps {
  avatarUrl: string;
  className?: string;
}

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({ avatarUrl, className }) => {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 50 }}
        style={{ background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />

        {/* Environment */}
        <Environment preset="city" />

        {/* Avatar */}
        <Suspense fallback={<LoadingPlaceholder />}>
          <ReadyPlayerAvatar avatarUrl={avatarUrl} />
        </Suspense>

        {/* Ground shadow */}
        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
          far={4}
        />

        {/* Camera controls (optional - can disable for static view) */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
};

/**
 * Loading placeholder while avatar loads.
 */
const LoadingPlaceholder: React.FC = () => {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#4a5568" wireframe />
    </mesh>
  );
};
