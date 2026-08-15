import { create } from 'zustand';
import type { JournalEntry, LibraryLayout } from '../lib/journal';

export type AppPhase = 'timeline' | 'transitioning' | 'exploring' | 'reading' | 'editing';

interface AppState {
  phase: AppPhase;
  selectedMonth: string | null;
  selectedEntry: JournalEntry | null;
  loadingProgress: number;
  isPointerLocked: boolean;

  // CMS Data
  layout: LibraryLayout | null;
  entries: JournalEntry[];
  
  // Edit Mode State
  selectedShelfId: string | null;
  selectedBookId: string | null;
  transformMode: 'translate' | 'rotate';

  // Actions
  setPhase: (phase: AppPhase) => void;
  selectMonth: (month: string | null) => void;
  selectEntry: (entry: JournalEntry | null) => void;
  setProgress: (progress: number) => void;
  setPointerLocked: (locked: boolean) => void;
  returnToTimeline: () => void;
  
  setLibraryData: (layout: LibraryLayout, entries: JournalEntry[]) => void;
  selectShelf: (id: string | null) => void;
  selectBook: (id: string | null) => void;
  setTransformMode: (mode: 'translate' | 'rotate') => void;
  updateShelfTransform: (id: string, position: [number, number, number], rotation: [number, number, number]) => void;
  updateBookTransform: (shelfId: string, slug: string, position: [number, number, number], rotation: [number, number, number]) => void;
}

export const useStore = create<AppState>((set) => ({
  phase: 'timeline',
  selectedMonth: null,
  selectedEntry: null,
  loadingProgress: 0,
  isPointerLocked: false,

  layout: null,
  entries: [],
  selectedShelfId: null,
  selectedBookId: null,
  transformMode: 'translate',

  setPhase: (phase) => set({ phase }),
  selectMonth: (month) => set({ selectedMonth: month }),
  selectEntry: (entry) => set({ selectedEntry: entry }),
  setProgress: (progress) => set({ loadingProgress: progress }),
  setPointerLocked: (locked) => set({ isPointerLocked: locked }),
  returnToTimeline: () =>
    set({
      phase: 'timeline',
      selectedMonth: null,
      selectedEntry: null,
      isPointerLocked: false,
      selectedShelfId: null,
      selectedBookId: null,
    }),
    
  setLibraryData: (layout, entries) => set({ layout, entries }),
  selectShelf: (id) => set({ selectedShelfId: id, selectedBookId: null }),
  selectBook: (id) => set({ selectedBookId: id, selectedShelfId: null }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  updateShelfTransform: (id, position, rotation) =>
    set((state) => {
      if (!state.layout) return state;
      const shelves = state.layout.shelves.map((s) =>
        s.id === id ? { ...s, position, rotation } : s
      );
      return { layout: { ...state.layout, shelves } };
    }),
  updateBookTransform: (shelfId, slug, position, rotation) =>
    set((state) => {
      if (!state.layout) return state;
      const shelves = state.layout.shelves.map((s) => {
        if (s.id !== shelfId) return s;
        const bookTransforms = s.bookTransforms ? { ...s.bookTransforms } : {};
        bookTransforms[slug] = { position, rotation };
        return { ...s, bookTransforms };
      });
      return { layout: { ...state.layout, shelves } };
    }),
}));
