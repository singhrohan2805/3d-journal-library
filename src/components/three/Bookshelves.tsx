'use client';

import { useMemo } from 'react';
import { Text, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import Bookshelf from './Bookshelf';
import Book from './Book';
import { useStore } from '../../store/useStore';

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
      {layout.shelves.map((shelf, shelfIdx) => {
        // Find entries for this shelf
        const shelfEntries = shelf.entrySlugs
          .map((slug) => entries.find((e) => e.slug === slug))
          .filter(Boolean) as typeof entries;

        const shelfPos = new THREE.Vector3(...(shelf.position as [number, number, number]));
        const shelfRot = new THREE.Euler(...(shelf.rotation as [number, number, number]));
        const isSelected = phase === 'editing' && selectedShelfId === shelf.id;

        const ShelfContent = (
          <group
            position={isSelected ? [0, 0, 0] : shelfPos}
            rotation={isSelected ? [0, 0, 0] : shelfRot}
            onClick={(e) => {
              if (phase === 'editing') {
                e.stopPropagation();
                selectShelf(shelf.id);
              }
            }}
          >
            <Bookshelf position={[0, 0, 0]} rotation={[0, 0, 0]} />

            {/* Plaque showing the month above the bookshelf */}
            <mesh position={[0, 5.0, 0]} castShadow>
              <boxGeometry args={[1.8, 0.35, 0.05]} />
              <meshStandardMaterial color={isSelected ? "#5a3a2a" : "#3e2723"} roughness={0.8} />
              <Text
                position={[0, 0, 0.026]}
                fontSize={0.16}
                color="#c9a84c"
                anchorX="center"
                anchorY="middle"
              >
                {shelf.name}
              </Text>
            </mesh>

            {/* Books */}
            {shelfEntries.map((entry, entryIdx) => {
              if (!entry) return null;
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

              const BookContent = (
                <Book
                  key={entry.slug}
                  entry={entry}
                  position={isSelectedBook ? [0,0,0] : bPos}
                  rotation={isSelectedBook ? [0,0,0] : bRot}
                  index={shelfIdx * 10 + entryIdx}
                />
              );

              if (isSelectedBook) {
                return (
                  <TransformControls
                    key={`tc-${entry.slug}`}
                    position={new THREE.Vector3(...bPos)}
                    rotation={new THREE.Euler(...bRot)}
                    mode={transformMode}
                    onMouseUp={(e) => {
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
                    {BookContent}
                  </TransformControls>
                );
              }

              return BookContent;
            })}
          </group>
        );

        if (isSelected) {
          return (
            <TransformControls
              key={shelf.id}
              position={shelfPos}
              rotation={shelfRot}
              mode={transformMode}
              onMouseUp={(e) => {
                if (e?.target?.object) {
                  const pos = e.target.object.position;
                  const rot = e.target.object.rotation;
                  useStore.getState().updateShelfTransform(
                    shelf.id,
                    [pos.x, pos.y, pos.z],
                    [rot.x, rot.y, rot.z]
                  );
                }
              }}
            >
              {ShelfContent}
            </TransformControls>
          );
        }

        return <group key={shelf.id}>{ShelfContent}</group>;
      })}
    </group>
  );
}
