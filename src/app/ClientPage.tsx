'use client';

import dynamic from 'next/dynamic';
import type { MonthGroup } from '../lib/journal';

const Experience = dynamic(() => import('../components/Experience'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0806',
        color: '#c9a84c',
        fontFamily: 'Georgia, serif',
        fontSize: '1.25rem',
        letterSpacing: '0.1em',
      }}
    >
      Loading…
    </div>
  ),
});

import { useEffect } from 'react';
import type { JournalEntry, LibraryLayout } from '../lib/journal';
import { useStore } from '../store/useStore';

interface ClientPageProps {
  initialLayout: LibraryLayout;
  initialEntries: JournalEntry[];
}

export default function ClientPage({ initialLayout, initialEntries }: ClientPageProps) {
  const setLibraryData = useStore((state) => state.setLibraryData);

  useEffect(() => {
    setLibraryData(initialLayout, initialEntries);
  }, [initialLayout, initialEntries, setLibraryData]);

  return <Experience />;
}
