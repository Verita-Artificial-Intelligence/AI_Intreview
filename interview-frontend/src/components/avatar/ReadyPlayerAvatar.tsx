/**
 * Ready Player Me avatar component with lip sync animation.
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useCurrentVisemes } from '../../store/interviewStore';
import { visemeToMorphTarget, getAllVisemeMorphTargets, lerp } from './visemeMap';

interface ReadyPlayerAvatarProps {
  avatarUrl: string;
}

export const ReadyPlayerAvatar: React.FC<ReadyPlayerAvatarProps> = ({ avatarUrl }) => {
  const { scene } = useGLTF(avatarUrl);
  const currentVisemes = useCurrentVisemes();

  // Refs for morph target influences
  const headMeshRef = useRef<THREE.SkinnedMesh | null>(null);
  const teethMeshRef = useRef<THREE.SkinnedMesh | null>(null);

  // Idle animation state
  const idleTimeRef = useRef(0);

  // Find meshes with morph targets on mount
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && child.morphTargetDictionary) {
        const hasVisemes = getAllVisemeMorphTargets().some(
          (target) => child.morphTargetDictionary![target] !== undefined
        );

        if (hasVisemes) {
          if (child.name.toLowerCase().includes('teeth')) {
            teethMeshRef.current = child;
          } else {
            headMeshRef.current = child;
          }
        }
      }
    });

    console.log('Avatar loaded:', {
      headMesh: !!headMeshRef.current,
      teethMesh: !!teethMeshRef.current,
    });
  }, [scene]);

  // Current viseme weights (for smooth interpolation)
  const currentWeightsRef = useRef<Map<string, number>>(new Map());

  // Update morph targets every frame
  useFrame((state, delta) => {
    idleTimeRef.current += delta;

    // Update lip sync
    updateMorphTargets(headMeshRef.current, currentVisemes, currentWeightsRef.current, delta);
    updateMorphTargets(teethMeshRef.current, currentVisemes, currentWeightsRef.current, delta);

    // Subtle idle animation (slight head movement)
    if (scene) {
      const time = idleTimeRef.current;
      scene.rotation.y = Math.sin(time * 0.3) * 0.05; // Slow side-to-side
      scene.position.y = Math.sin(time * 0.5) * 0.02; // Slight bobbing
    }
  });

  return <primitive object={scene} position={[0, -1.5, 0]} scale={1.5} />;
};

/**
 * Update morph target influences for a mesh.
 */
function updateMorphTargets(
  mesh: THREE.SkinnedMesh | null,
  targetVisemes: { viseme: string; weight: number }[],
  currentWeights: Map<string, number>,
  delta: number
): void {
  if (!mesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) {
    return;
  }

  const LERP_SPEED = 10; // Higher = faster transitions

  // Get target weights
  const targetWeights = new Map<string, number>();
  for (const { viseme, weight } of targetVisemes) {
    const morphTarget = visemeToMorphTarget(viseme as any);
    targetWeights.set(morphTarget, weight);
  }

  // Update all viseme morph targets
  for (const morphTarget of getAllVisemeMorphTargets()) {
    const index = mesh.morphTargetDictionary[morphTarget];

    if (index !== undefined) {
      const targetWeight = targetWeights.get(morphTarget) || 0;
      const currentWeight = currentWeights.get(morphTarget) || 0;

      // Smooth interpolation
      const newWeight = lerp(currentWeight, targetWeight, delta * LERP_SPEED);

      mesh.morphTargetInfluences[index] = newWeight;
      currentWeights.set(morphTarget, newWeight);
    }
  }
}

// Preload avatar
export function preloadAvatar(url: string): void {
  useGLTF.preload(url);
}
