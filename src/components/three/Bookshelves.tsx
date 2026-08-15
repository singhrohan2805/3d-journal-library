'use client';

import { useMemo } from 'react';
import { Text, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import Bookshelf from './Bookshelf';
import Book from './Book';
import { useStore } from '../../store/useStore';

function EditableBook({ entry, shelf, entryIdx, shelfEntries, transformMode, phase, selectedBookId }: any) {
  const isSelectedBook = phase === 'editing' && selectedBookId === entry.slug;
  const transform = shelf.bookTransforms?.[entry.slug];

  const shelfY = 1.15; // height of 2nd shelf
  const startX = -(shelfEntries.length * 0.14) / 2;
  const localX = startX + entryIdx * 0.14;
  const bookHeight = 0.7 + (entryIdx % 3) * 0.1;

  const defaultPos: [number, number, number] = [
    localX,
    shelfY + bookHeight / 2 + 0.02,
    0,
  ];
  const defaultRot: [number, number, number] = [0, 0, 0];

  const bPos = transform ? transform.position : defaultPos;
  const bRot = transform ? transform.rotation : defaultRot;

  const innerGroup = (
    <group key={entry.slug} position={bPos} rotation={bRot}>
      <Book
        entry={entry}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        index={shelfEntries.length * 10 + entryIdx}
      />
    </group>
  );

  if (isSelectedBook) {
    return (
      <TransformControls
        mode={transformMode}
        onMouseDown={() => useStore.getState().setIsDraggingGizmo(true)}
        onMouseUp={(e: any) => {
          setTimeout(() => useStore.getState().setIsDraggingGizmo(false), 50);
          if (e?.target?.object) {
            const p = e.target.object.position;
            const r = e.target.object.rotation;
            useStore.getState().updateBookTransform(
              shelf.id,
              entry.slug,
              [p.x, p.y, p.z],
              [r.x, r.y, r.z]
            );
          }
        }}
      >
        {innerGroup}
      </TransformControls>
    );
  }

  return innerGroup;
}

function EditableShelf({ shelf, layout, entries, phase, selectedShelfId, selectedBookId, transformMode, selectShelf }: any) {
  const isSelected = phase === 'editing' && selectedShelfId === shelf.id;
  const shelfPos = new THREE.Vector3(...(shelf.position as [number, number, number]));
  const shelfRot = new THREE.Euler(...(shelf.rotation as [number, number, number]));

  const shelfEntries = useMemo(() => {
    return shelf.entrySlugs
      .map((slug: string) => entries.find((e: any) => e.slug === slug))
      .filter(Boolean);
  }, [shelf.entrySlugs, entries]);

  const innerGroup = (
    <group key={shelf.id} position={shelfPos} rotation={shelfRot}>
      <group
        onClick={(e) => {
          if (useStore.getState().isDraggingGizmo) return;
          if (phase === 'editing') {
            e.stopPropagation();
            selectShelf(shelf.id);
          }
        }}
      >
        <Bookshelf position={[0, 0, 0]} rotation={[0, 0, 0]} />

        <mesh position={[0, 5.0, 0]} castShadow>
          <boxGeometry args={[1.8, 0.35, 0.05]} />
          <meshStandardMaterial color={isSelected ? "#5a3a2a" : "#3e2723"} roughness={0.8} />
          <Text
            position={[0, 0, 0.035]}
            fontSize={0.16}
            maxWidth={1.6}
            color="#c9a84c"
            anchorX="center"
            anchorY="middle"
          >
            {shelf.name}
          </Text>
        </mesh>
      </group>

      {shelfEntries.map((entry: any, entryIdx: number) => (
        <EditableBook
          key={entry.slug}
          entry={entry}
          shelf={shelf}
          entryIdx={entryIdx}
          shelfEntries={shelfEntries}
          transformMode={transformMode}
          phase={phase}
          selectedBookId={selectedBookId}
        />
      ))}
    </group>
  );

  if (isSelected) {
    return (
      <TransformControls
        mode={transformMode}
        onMouseDown={() => useStore.getState().setIsDraggingGizmo(true)}
        onMouseUp={(e: any) => {
          setTimeout(() => useStore.getState().setIsDraggingGizmo(false), 50);
          if (e?.target?.object) {
            const p = e.target.object.position;
            const r = e.target.object.rotation;
            useStore.getState().updateShelfTransform(
              shelf.id,
              [p.x, p.y, p.z],
              [r.x, r.y, r.z]
            );
          }
        }}
      >
        {innerGroup}
      </TransformControls>
    );
  }

  return innerGroup;
}

export default function Bookshelves() {
  const layout = useStore((s) => s.layout);
  const entries = useStore((s) => s.entries);
  const phase = useStore((s) => s.phase);
  const selectedShelfId = useStore((s) => s.selectedShelfId);
  const selectedBookId = useStore((s) => s.selectedBookId);
  const selectShelf = useStore((s) => s.selectShelf);
  const transformMode = useStore((s) => s.transformMode);

  if (!layout) return null;

  return (
    <group name="bookshelves">
      {layout.shelves.map((shelf) => (
        <EditableShelf
          key={shelf.id}
          shelf={shelf}
          layout={layout}
          entries={entries}
          phase={phase}
          selectedShelfId={selectedShelfId}
          selectedBookId={selectedBookId}
          transformMode={transformMode}
          selectShelf={selectShelf}
        />
      ))}
    </group>
  );
}
