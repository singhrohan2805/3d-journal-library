'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Floating dust particles
function DustParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 300;

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = Math.random() * 5.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 22;
      vel[i * 3] = (Math.random() - 0.5) * 0.003;
      vel[i * 3 + 1] = Math.random() * 0.002 + 0.001;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
    }
    return [pos, vel];
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posArray = pointsRef.current.geometry.attributes.position
      .array as Float32Array;

    for (let i = 0; i < count; i++) {
      posArray[i * 3] += velocities[i * 3];
      posArray[i * 3 + 1] += velocities[i * 3 + 1];
      posArray[i * 3 + 2] += velocities[i * 3 + 2];

      if (posArray[i * 3 + 1] > 5.5) {
        posArray[i * 3 + 1] = 0;
        posArray[i * 3] = (Math.random() - 0.5) * 18;
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 22;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#c9a84c"
        size={0.04}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// Desk lamp (simple geometric lamp)
function DeskLamp({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      {/* Lamp base */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 0.05, 16]} />
        <meshStandardMaterial color="#8b6914" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Lamp arm */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
        <meshStandardMaterial color="#8b6914" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Lamp shade */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <coneGeometry args={[0.15, 0.15, 16, 1, true]} />
        <meshStandardMaterial
          color="#4a3520"
          side={THREE.DoubleSide}
          roughness={0.9}
        />
      </mesh>
      {/* Light bulb glow */}
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ffe4b5" />
      </mesh>
      {/* Point light from lamp — no decay so it reliably illuminates */}
      <pointLight
        position={[0, 0.35, 0]}
        intensity={2}
        color="#ffe4b5"
        distance={10}
        decay={1}
      />
    </group>
  );
}

export default function Atmosphere() {
  return (
    <group name="atmosphere">
      {/* Strong ambient fill — the room should be comfortably visible */}
      <ambientLight intensity={0.5} color="#ffe4b5" />

      {/* Hemisphere light — warm sky, earthy ground */}
      <hemisphereLight
        color="#ffe4b5"
        groundColor="#3e2723"
        intensity={0.6}
      />

      {/* Main overhead chandelier light */}
      <pointLight
        position={[0, 5.5, 0]}
        intensity={8}
        color="#ffe4b5"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        distance={30}
        decay={1}
      />

      {/* Additional overhead lights for even coverage */}
      <pointLight position={[-6, 5, -6]} intensity={3} color="#ffe4b5" distance={20} decay={1} />
      <pointLight position={[6, 5, -6]} intensity={3} color="#ffe4b5" distance={20} decay={1} />
      <pointLight position={[-6, 5, 6]} intensity={3} color="#ffe4b5" distance={20} decay={1} />
      <pointLight position={[6, 5, 6]} intensity={3} color="#ffe4b5" distance={20} decay={1} />

      {/* Desk lamps */}
      <DeskLamp position={[-0.8, 0.89, 2]} />
      <DeskLamp position={[0.8, 0.89, 2]} />

      {/* Wall sconces — increased intensity, lower decay */}
      <pointLight position={[-9, 3, -9]} intensity={3} color="#ffe4b5" distance={12} decay={1} />
      <pointLight position={[9, 3, -9]} intensity={3} color="#ffe4b5" distance={12} decay={1} />
      <pointLight position={[-9, 3, -4]} intensity={3} color="#ffe4b5" distance={12} decay={1} />
      <pointLight position={[9, 3, -4]} intensity={3} color="#ffe4b5" distance={12} decay={1} />
      <pointLight position={[-9, 3, 1]} intensity={2} color="#ffe4b5" distance={12} decay={1} />
      <pointLight position={[9, 3, 1]} intensity={2} color="#ffe4b5" distance={12} decay={1} />
      <pointLight position={[-9, 3, 6]} intensity={2} color="#ffe4b5" distance={12} decay={1} />
      <pointLight position={[9, 3, 6]} intensity={2} color="#ffe4b5" distance={12} decay={1} />

      {/* Dust particles */}
      <DustParticles />
    </group>
  );
}
