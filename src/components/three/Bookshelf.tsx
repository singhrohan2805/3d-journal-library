'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

interface BookshelfProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  shelves?: number;
  width?: number;
  height?: number;
  depth?: number;
  onClick?: (e: any) => void;
}

export default function Bookshelf({
  position,
  rotation = [0, 0, 0],
  shelves = 4,
  width = 2.4,
  height = 4.5,
  depth = 0.45,
  onClick,
}: BookshelfProps) {
  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#8b6b50'),
        roughness: 0.7,
        metalness: 0.08,
      }),
    []
  );

  const backMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#5d4037'),
        roughness: 0.9,
        metalness: 0,
      }),
    []
  );

  const sideThickness = 0.06;
  const shelfThickness = 0.04;
  const shelfSpacing = (height - shelfThickness) / shelves;

  return (
    <group position={position} rotation={rotation} onClick={onClick}>
      {/* Back panel */}
      <mesh position={[0, height / 2, -depth / 2 + 0.01]} material={backMat}>
        <boxGeometry args={[width, height, 0.02]} />
      </mesh>

      {/* Left side */}
      <mesh
        position={[-width / 2 + sideThickness / 2, height / 2, 0]}
        material={frameMat}
        castShadow
      >
        <boxGeometry args={[sideThickness, height, depth]} />
      </mesh>

      {/* Right side */}
      <mesh
        position={[width / 2 - sideThickness / 2, height / 2, 0]}
        material={frameMat}
        castShadow
      >
        <boxGeometry args={[sideThickness, height, depth]} />
      </mesh>

      {/* Top */}
      <mesh
        position={[0, height - shelfThickness / 2, 0]}
        material={frameMat}
        castShadow
      >
        <boxGeometry args={[width, shelfThickness, depth]} />
      </mesh>

      {/* Shelves */}
      {Array.from({ length: shelves }).map((_, i) => {
        const y = i * shelfSpacing + shelfThickness / 2;
        return (
          <mesh
            key={i}
            position={[0, y, 0]}
            material={frameMat}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[width - sideThickness * 2, shelfThickness, depth]} />
          </mesh>
        );
      })}

      {/* Crown molding (top decorative trim) */}
      <mesh position={[0, height + 0.05, depth / 4]} material={frameMat} castShadow>
        <boxGeometry args={[width + 0.1, 0.1, depth / 2 + 0.1]} />
      </mesh>
    </group>
  );
}
