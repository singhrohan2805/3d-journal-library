'use client';

import { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import type { JournalEntry } from '../../lib/journal';

// Curated leather-tone book cover colors
const BOOK_COLORS = [
  '#8b1a1a', // dark red
  '#1a3a5c', // navy blue
  '#2d4a22', // forest green
  '#5c3a1a', // saddle brown
  '#4a1a4a', // plum
  '#1a4a4a', // teal
  '#6b4226', // sienna
  '#3b3b3b', // charcoal
  '#8b6914', // dark gold
  '#4a2545', // dark purple
];

// Seeded random for consistent book appearance
function seededRandom(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface BookProps {
  entry: JournalEntry;
  position: [number, number, number];
  rotation?: [number, number, number];
  index: number;
}

export default function Book({ entry, position, rotation = [0, 0, 0], index }: BookProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const phase = useStore((s) => s.phase);
  const setPhase = useStore((s) => s.setPhase);
  const selectEntry = useStore((s) => s.selectEntry);

  // Deterministic dimensions from index
  const bookHeight = 0.7 + seededRandom(index * 3) * 0.35;
  const bookWidth = 0.08 + seededRandom(index * 7) * 0.06;
  const bookDepth = 0.35 + seededRandom(index * 11) * 0.08;
  const colorIndex = Math.floor(seededRandom(index * 13) * BOOK_COLORS.length);
  const bookColor = BOOK_COLORS[colorIndex];

  // Hover animation
  useFrame(() => {
    if (!meshRef.current) return;
    const target = hovered && phase === 'exploring' ? 0.1 : 0;
    meshRef.current.position.z = THREE.MathUtils.lerp(
      meshRef.current.position.z,
      position[2] + target,
      0.1
    );
  });

  const selectBook = useStore((s) => s.selectBook);

  const handleClick = useCallback(
    (e: THREE.Event) => {
      if (phase === 'editing') {
        (e as unknown as { stopPropagation: () => void }).stopPropagation();
        selectBook(entry.slug);
        return;
      }
      
      if (phase !== 'exploring') return;
      (e as unknown as { stopPropagation: () => void }).stopPropagation();
      selectEntry(entry);
      setPhase('reading');
    },
    [phase, entry, selectEntry, setPhase, selectBook]
  );

  const handlePointerOver = useCallback(
    (e: THREE.Event) => {
      if (phase !== 'exploring' && phase !== 'editing') return;
      (e as unknown as { stopPropagation: () => void }).stopPropagation();
      setHovered(true);
      document.body.style.cursor = 'pointer';
    },
    [phase]
  );

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'default';
  }, []);

  // Use date for spine text
  const spineText = entry.date;

  return (
    <group position={position} rotation={rotation}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[bookWidth, bookHeight, bookDepth]} />
        <meshStandardMaterial
          color={bookColor}
          roughness={0.8}
          metalness={0.05}
          emissive={hovered ? bookColor : '#000000'}
          emissiveIntensity={hovered ? 0.15 : 0}
        />
      </mesh>

      {/* Spine text */}
      <Text
        position={[0, 0, bookDepth / 2 + 0.001]}
        rotation={[0, 0, -Math.PI / 2]}
        fontSize={0.045}
        maxWidth={bookHeight * 0.8}
        color="#c9a84c"
        anchorX="center"
        anchorY="middle"
      >
        {entry.title.length > 30 ? entry.title.slice(0, 27) + '...' : entry.title}
      </Text>

      {/* Spine gold line decoration */}
      <mesh position={[0, bookHeight / 2 - 0.05, bookDepth / 2 + 0.001]}>
        <planeGeometry args={[bookWidth * 0.7, 0.005]} />
        <meshBasicMaterial color="#c9a84c" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, -bookHeight / 2 + 0.05, bookDepth / 2 + 0.001]}>
        <planeGeometry args={[bookWidth * 0.7, 0.005]} />
        <meshBasicMaterial color="#c9a84c" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
