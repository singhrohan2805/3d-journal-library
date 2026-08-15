'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import type { JournalEntry } from '../../lib/journal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import gsap from 'gsap';

export default function ReadingOverlay() {
  const phase = useStore((s) => s.phase);
  const selectedEntry = useStore((s) => s.selectedEntry);
  const setPhase = useStore((s) => s.setPhase);
  const selectEntry = useStore((s) => s.selectEntry);

  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (phase !== 'reading' || !selectedEntry) return;

    // Release the pointer lock so the user can use the mouse
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    useStore.getState().setPointerLocked(false); // Force state sync so returning to library doesn't get stuck

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });

    tl.fromTo(
      panelRef.current,
      { opacity: 0, y: 40, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6 },
      '-=0.2'
    );

    return () => {
      tl.kill();
    };
  }, [phase, selectedEntry]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'reading') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase]);

  const handleClose = () => {
    const tl = gsap.timeline({
      defaults: { ease: 'power2.in' },
      onComplete: () => {
        setPhase('exploring');
        selectEntry(null);
      },
    });

    tl.to(panelRef.current, { opacity: 0, y: 30, scale: 0.95, duration: 0.3 });
    tl.to(overlayRef.current, { opacity: 0, duration: 0.3 }, '-=0.1');
  };

  if (phase !== 'reading' || !selectedEntry) return null;

  return (
    <div ref={overlayRef} className="reading-overlay" style={{ opacity: 0 }}>
      <button
        ref={closeRef}
        className="reading-close"
        onClick={handleClose}
        title="Close (ESC)"
      >
        ✕
      </button>

      <div ref={panelRef} className="reading-panel" style={{ opacity: 0 }}>
        {selectedEntry.content.trim().startsWith('<') || /<[a-z][\s\S]*>/i.test(selectedEntry.content) ? (
          <div 
            className="reading-html-content prose prose-invert max-w-none overflow-x-hidden break-words whitespace-pre-wrap [&_*]:!max-w-full [&_*]:!break-words [&_*]:!whitespace-pre-wrap [&_p]:mb-4 [&_h1]:text-2xl [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#c9a84c] [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: selectedEntry.content }} 
          />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {selectedEntry.content}
          </ReactMarkdown>
        )}

        <div className="reading-actions">
          <button className="reading-back-button" onClick={handleClose}>
            Go Back to Library
          </button>
        </div>
      </div>
    </div>
  );
}
