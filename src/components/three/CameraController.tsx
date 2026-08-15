'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { useStore } from '../../store/useStore';
import type { MonthGroup } from '../../lib/journal';

interface CameraControllerProps {
  months: MonthGroup[];
}

export default function CameraController({ months }: CameraControllerProps) {
  const phase = useStore((s) => s.phase);
  const selectedMonth = useStore((s) => s.selectedMonth);
  const setPhase = useStore((s) => s.setPhase);
  const layout = useStore((s) => s.layout);
  const entries = useStore((s) => s.entries);
  const { camera } = useThree();
  const tweenRef = useRef<gsap.core.Tween[]>([]);

  useEffect(() => {
    if (phase !== 'transitioning' || !selectedMonth || !layout) return;

    // Find the first shelf that contains an entry matching this month
    const targetShelf = layout.shelves.find(shelf => 
      shelf.entrySlugs.some(slug => {
        const entry = entries.find(e => e.slug === slug);
        return entry?.month === selectedMonth || slug.startsWith(selectedMonth);
      })
    );

    if (!targetShelf) {
      setPhase('exploring');
      return;
    }

    // Calculate camera position to stand in front of the shelf
    const pos = targetShelf.position;
    const rot = targetShelf.rotation;
    
    // The shelf faces the direction defined by its Y-rotation
    const distance = 5.0; // Distance to stand away from the shelf
    const camX = pos[0] + Math.sin(rot[1]) * distance;
    const camZ = pos[2] + Math.cos(rot[1]) * distance;
    const camY = 1.5; // Eye level

    // Look slightly up or at the center of the shelf
    const lookX = pos[0];
    const lookY = pos[1] + 1.5;
    const lookZ = pos[2];

    // Kill any existing tweens
    tweenRef.current.forEach((t) => t.kill());
    tweenRef.current = [];

    // We'll animate a proxy object and use lookAt to handle rotation
    // This avoids gimbal lock issues with animating euler angles directly
    const proxy = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      lookX: 0,
      lookY: 3,
      lookZ: 0,
    };

    const finalLook = {
      x: lookX,
      y: lookY,
      z: lookZ,
    };

    // Single smooth tween for position
    const posTween = gsap.to(proxy, {
      x: camX,
      y: camY,
      z: camZ,
      lookX: finalLook.x,
      lookY: finalLook.y,
      lookZ: finalLook.z,
      duration: 2.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.position.set(proxy.x, proxy.y, proxy.z);
        camera.lookAt(proxy.lookX, proxy.lookY, proxy.lookZ);
      },
      onComplete: () => {
        camera.position.set(camX, camY, camZ);
        camera.lookAt(new THREE.Vector3(lookX, lookY, lookZ));
        setPhase('exploring');
      },
    });

    tweenRef.current.push(posTween);

    return () => {
      tweenRef.current.forEach((t) => t.kill());
      tweenRef.current = [];
    };
  }, [phase, selectedMonth, camera, months, setPhase]);

  return null;
}
