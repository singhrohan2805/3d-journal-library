'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

// Procedural wood-like material
function useWoodMaterial(color: string, roughness = 0.8, doubleSided = false) {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness,
        metalness: 0.05,
        side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      }),
    [color, roughness, doubleSided]
  );
}

export default function LibraryRoom() {
  const floorMat = useWoodMaterial('#4a3628', 0.9, true);
  const wallMat = useWoodMaterial('#6d4c3d', 0.85, true);
  const ceilingMat = useWoodMaterial('#2a1f17', 0.95, true);
  const trimMat = useWoodMaterial('#8b6b50', 0.7);
  const rugMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#8b3040'),
        roughness: 0.95,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    []
  );

  const ROOM_W = 20;
  const ROOM_D = 24;
  const ROOM_H = 6;

  return (
    <group name="library-room">
      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        material={floorMat}
      >
        <planeGeometry args={[ROOM_W, ROOM_D]} />
      </mesh>

      {/* Rug (center) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
        material={rugMat}
      >
        <planeGeometry args={[6, 10]} />
      </mesh>

      {/* Ceiling */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, ROOM_H, 0]}
        material={ceilingMat}
      >
        <planeGeometry args={[ROOM_W, ROOM_D]} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, ROOM_H / 2, -ROOM_D / 2]} receiveShadow material={wallMat}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
      </mesh>

      {/* Front wall */}
      <mesh
        position={[0, ROOM_H / 2, ROOM_D / 2]}
        rotation={[0, Math.PI, 0]}
        material={wallMat}
      >
        <planeGeometry args={[ROOM_W, ROOM_H]} />
      </mesh>

      {/* Left wall */}
      <mesh
        position={[-ROOM_W / 2, ROOM_H / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
        material={wallMat}
      >
        <planeGeometry args={[ROOM_D, ROOM_H]} />
      </mesh>

      {/* Right wall */}
      <mesh
        position={[ROOM_W / 2, ROOM_H / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
        material={wallMat}
      >
        <planeGeometry args={[ROOM_D, ROOM_H]} />
      </mesh>

      {/* Floor trim / baseboards */}
      {/* Back */}
      <mesh position={[0, 0.15, -ROOM_D / 2 + 0.05]} material={trimMat} castShadow>
        <boxGeometry args={[ROOM_W, 0.3, 0.1]} />
      </mesh>
      {/* Left */}
      <mesh
        position={[-ROOM_W / 2 + 0.05, 0.15, 0]}
        material={trimMat}
        castShadow
      >
        <boxGeometry args={[0.1, 0.3, ROOM_D]} />
      </mesh>
      {/* Right */}
      <mesh
        position={[ROOM_W / 2 - 0.05, 0.15, 0]}
        material={trimMat}
        castShadow
      >
        <boxGeometry args={[0.1, 0.3, ROOM_D]} />
      </mesh>

      {/* Reading Table (center) */}
      <group position={[0, 0, 2]}>
        {/* Table top */}
        <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.08, 1.2]} />
          <meshStandardMaterial color="#4e342e" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Legs */}
        {[
          [-1.05, 0.4, -0.5],
          [1.05, 0.4, -0.5],
          [-1.05, 0.4, 0.5],
          [1.05, 0.4, 0.5],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} castShadow>
            <boxGeometry args={[0.08, 0.8, 0.08]} />
            <meshStandardMaterial color="#3e2723" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
