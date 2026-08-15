'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

const MOVE_SPEED = 4; // units per second
const ROOM_BOUNDS = {
  minX: -9,
  maxX: 9,
  minZ: -11,
  maxZ: 11,
};

export default function FPSControls() {
  const phase = useStore((s) => s.phase);
  const setPointerLocked = useStore((s) => s.setPointerLocked);
  const controlsRef = useRef<any>(null);

  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  const { camera } = useThree();

  // Key handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = true;
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = false;
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Movement loop
  useFrame((_, delta) => {
    if (phase !== 'exploring') return;
    if (!controlsRef.current?.isLocked) return;

    const { forward, backward, left, right } = keys.current;
    if (!forward && !backward && !left && !right) return;

    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(0, 0, Number(backward) - Number(forward));
    const sideVector = new THREE.Vector3(Number(left) - Number(right), 0, 0);

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(MOVE_SPEED * delta)
      .applyEuler(camera.rotation);

    // Zero out Y movement (stay on ground)
    direction.y = 0;

    const newPos = camera.position.clone().add(direction);

    // Clamp to room bounds
    newPos.x = THREE.MathUtils.clamp(newPos.x, ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX);
    newPos.z = THREE.MathUtils.clamp(newPos.z, ROOM_BOUNDS.minZ, ROOM_BOUNDS.maxZ);

    camera.position.copy(newPos);
  });

  const handleLock = useCallback(() => {
    setPointerLocked(true);
  }, [setPointerLocked]);

  const handleUnlock = useCallback(() => {
    setPointerLocked(false);
    // Reset all keys when unlocked to prevent stuck movement
    keys.current = { forward: false, backward: false, left: false, right: false };
  }, [setPointerLocked]);

  if (phase !== 'exploring') return null;

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={handleLock}
      onUnlock={handleUnlock}
    />
  );
}
