'use client';

import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import type { MonthGroup } from '../lib/journal';

// 3D Components
import LibraryRoom from './three/LibraryRoom';
import Bookshelves from './three/Bookshelves';
import Atmosphere from './three/Atmosphere';
import FPSControls from './three/FPSControls';
import CameraController from './three/CameraController';
import TimelineOverlay from './ui/TimelineOverlay';
import ReadingOverlay from './ui/ReadingOverlay';
import EditorOverlay from './ui/EditorOverlay';

// PointerLockPrompt overlay (click to resume)
function PointerLockPrompt() {
  const phase = useStore((s) => s.phase);
  const isPointerLocked = useStore((s) => s.isPointerLocked);
  const setPhase = useStore((s) => s.setPhase);

  if (phase !== 'exploring' || isPointerLocked) return null;

  return (
    <div
      className="pointer-lock-overlay flex flex-col justify-center items-center pointer-events-auto"
      onClick={() => {
        document.querySelector('canvas')?.requestPointerLock();
      }}
    >
      <div className="pointer-lock-prompt mb-4">Click to explore the library</div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setPhase('editing');
        }}
        className="text-[#c9a84c] border border-[#c9a84c] px-6 py-3 bg-black/80 hover:bg-[#c9a84c] hover:text-black transition-colors rounded text-lg font-serif"
      >
        Enter Edit Mode
      </button>
    </div>
  );
}

// Crosshair + controls help
function ExploringHUD() {
  const phase = useStore((s) => s.phase);
  const isPointerLocked = useStore((s) => s.isPointerLocked);

  if (phase !== 'exploring' || !isPointerLocked) return null;

  return (
    <>
      <div className="crosshair" />
      <div className="controls-help">
        <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move<br />
        <kbd>Mouse</kbd> Look around<br />
        <kbd>Click</kbd> Read a book<br />
        <kbd>ESC</kbd> Menu / Edit<br />
      </div>
    </>
  );
}

export default function Experience() {
  // Mark scene as ready OUTSIDE the Canvas reconciler
  // so Zustand updates propagate to the HTML overlay React tree
  const setProgress = useStore((s) => s.setProgress);
  const layout = useStore((s) => s.layout);
  const entries = useStore((s) => s.entries);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(100);
    }, 800);
    return () => clearTimeout(timer);
  }, [setProgress]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 3, 8], fov: 55, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: 1.8,
        }}
        style={{ position: 'absolute', inset: 0 }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color('#1a1210');
        }}
      >
        <Suspense fallback={null}>
          <LibraryRoom />
          <Bookshelves />
          <Atmosphere />
          <CameraController />
          <FPSControls />
        </Suspense>
      </Canvas>

      {/* HTML UI overlays */}
      <TimelineOverlay />
      <ReadingOverlay />
      <PointerLockPrompt />
      <ExploringHUD />
      <EditorOverlay />
    </div>
  );
}
