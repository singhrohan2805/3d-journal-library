'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import type { MonthGroup } from '../../lib/journal';
import gsap from 'gsap';

const MONTH_NAMES: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
};

export default function TimelineOverlay() {
  const phase = useStore((s) => s.phase);
  const selectMonth = useStore((s) => s.selectMonth);
  const setPhase = useStore((s) => s.setPhase);
  const loadingProgress = useStore((s) => s.loadingProgress);
  const layout = useStore((s) => s.layout);

  // Keep the overlay mounted during exit animation
  const [visible, setVisible] = useState(true);
  const [animatingOut, setAnimatingOut] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<(HTMLDivElement | null)[]>([]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  // Entrance animation
  useEffect(() => {
    if (phase !== 'timeline' || animatingOut) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(
      titleRef.current,
      { opacity: 0, y: -30 },
      { opacity: 1, y: 0, duration: 1 }
    );

    tl.fromTo(
      subtitleRef.current,
      { opacity: 0, y: -15 },
      { opacity: 0.7, y: 0, duration: 0.8 },
      '-=0.5'
    );

    nodesRef.current.forEach((node) => {
      if (!node) return;
      tl.fromTo(
        node,
        { opacity: 0, y: 30, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6 },
        `-=${0.4}`
      );
    });

    return () => {
      tl.kill();
    };
  }, [phase, animatingOut]);

  // Hide after phase changes away from timeline (and animation is done)
  useEffect(() => {
    if (phase !== 'timeline' && !animatingOut) {
      setVisible(false);
    }
    if (phase === 'timeline') {
      setVisible(true);
    }
  }, [phase, animatingOut]);

  const handleMonthClick = (month: string) => {
    if (animatingOut) return;
    setAnimatingOut(true);
    selectMonth(month);

    // Exit animation
    const tl = gsap.timeline({
      defaults: { ease: 'power2.in' },
      onComplete: () => {
        setPhase('transitioning');
        setAnimatingOut(false);
        setVisible(false);
      },
    });

    // Stagger out nodes
    const validNodes = nodesRef.current.filter(Boolean);
    if (validNodes.length > 0) {
      tl.to(validNodes, {
        opacity: 0,
        y: -20,
        scale: 0.9,
        stagger: 0.05,
        duration: 0.4,
      });
    }

    tl.to(
      [subtitleRef.current, titleRef.current].filter(Boolean),
      { opacity: 0, y: -20, duration: 0.4, stagger: 0.1 },
      '-=0.2'
    );

    tl.to(overlayRef.current, { opacity: 0, duration: 0.5 }, '-=0.2');
  };

  if (!visible) return null;

  const sceneReady = loadingProgress >= 100;

  return (
    <div ref={overlayRef} className="timeline-overlay">
      <h1 ref={titleRef} className="timeline-title" style={{ opacity: 0 }}>
        Dust & Bindings
      </h1>
      <p
        ref={subtitleRef}
        className="timeline-subtitle"
        style={{ opacity: 0 }}
      >
        Select a month to enter the library
      </p>

      <div className="timeline-track">
        {layout?.shelves.length === 0 ? (
          <div
            className="timeline-node"
            onClick={() => sceneReady && handleMonthClick('new')}
            style={{
              opacity: 0,
              cursor: sceneReady ? 'pointer' : 'wait',
            }}
            ref={(el) => {
              nodesRef.current[0] = el;
            }}
          >
            <div className="timeline-dot" />
            <span className="timeline-month">Start Fresh</span>
            <span className="timeline-year"></span>
            <span className="timeline-entry-count">Library is empty. Click to enter.</span>
          </div>
        ) : (
          layout?.shelves.map((shelf, i) => {
            // Attempt to extract year/month from the first entry slug (e.g., "2024-01-foo")
            // If not available, we use the shelf's name directly as a fallback.
            const firstSlug = shelf.entrySlugs[0] || '';
            let year = '';
            let monthName = shelf.name;

            if (firstSlug) {
              const parts = firstSlug.split('-');
              if (parts.length >= 2) {
                year = parts[0];
                const monthNum = parts[1];
                monthName = MONTH_NAMES[monthNum] || monthNum;
              }
            }

            // If the shelf name is custom, just display the custom name instead of parsing.
            // Let's just use shelf.name since it's customizable by the user now!
            monthName = shelf.name;
            year = ''; // We can omit the year if the user named the plaque specifically

            return (
              <div
                key={shelf.id}
                ref={(el) => {
                  nodesRef.current[i] = el;
                }}
                className="timeline-node"
                onClick={() => sceneReady && handleMonthClick(shelf.id)}
                style={{
                  opacity: 0,
                  cursor: sceneReady ? 'pointer' : 'wait',
                }}
              >
                <div className="timeline-dot" />
                <span className="timeline-month">{monthName}</span>
                <span className="timeline-year">{year}</span>
                <span className="timeline-entry-count">
                  {shelf.entrySlugs.length}{' '}
                  {shelf.entrySlugs.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
            );
          })
        )}
      </div>

      {!sceneReady && (
        <div className="loading-bar-container">
          <div className="loading-bar-track">
            <div
              className="loading-bar-fill"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <span className="loading-bar-text">
            Preparing the library…
          </span>
        </div>
      )}
    </div>
  );
}
