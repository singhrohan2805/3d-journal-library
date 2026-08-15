import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { saveLayout, saveEntry, deleteEntryAction } from '../../app/actions';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

export default function EditorOverlay() {
  const phase = useStore((s) => s.phase);
  const layout = useStore((s) => s.layout);
  const selectedShelfId = useStore((s) => s.selectedShelfId);
  const entries = useStore((s) => s.entries);
  const setLibraryData = useStore((s) => s.setLibraryData);
  const setPhase = useStore((s) => s.setPhase);
  const selectShelf = useStore((s) => s.selectShelf);
  const transformMode = useStore((s) => s.transformMode);
  const setTransformMode = useStore((s) => s.setTransformMode);

  const selectedBookId = useStore((s) => s.selectedBookId);
  const selectBook = useStore((s) => s.selectBook);

  const [saving, setSaving] = useState(false);

  if (phase !== 'editing' || !layout) return null;

  const selectedShelf = layout.shelves.find((s) => s.id === selectedShelfId);
  const selectedEntry = entries.find((e) => e.slug === selectedBookId);

  const handleAddShelf = async () => {
    const newShelf = {
      id: `shelf_${Date.now()}`,
      name: 'New Shelf',
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      entrySlugs: [],
    };
    const newLayout = { ...layout, shelves: [...layout.shelves, newShelf] };
    
    setLibraryData(newLayout, entries);
    selectShelf(newShelf.id);
  };

  const handleDeleteShelf = async () => {
    if (!selectedShelf) return;
    const newLayout = {
      ...layout,
      shelves: layout.shelves.filter((s) => s.id !== selectedShelf.id),
    };
    const prevLayout = layout;
    setLibraryData(newLayout, entries);
    selectShelf(null);
    
    setSaving(true);
    const result = await saveLayout(newLayout);
    if (!result.success) {
      alert("Failed to delete shelf. Reverting.");
      setLibraryData(prevLayout, entries);
      selectShelf(selectedShelf.id);
    }
    setSaving(false);
  };

  const handleUpdateShelfName = async (name: string) => {
    if (!selectedShelf) return;
    const newLayout = {
      ...layout,
      shelves: layout.shelves.map((s) => (s.id === selectedShelf.id ? { ...s, name } : s)),
    };
    setLibraryData(newLayout, entries);
  };

  const handleAddEntry = async () => {
    if (!selectedShelf) return;
    const slug = `entry_${Date.now()}`;
    const newEntry = {
      slug,
      title: 'New Entry',
      date: new Date().toISOString().split('T')[0],
      mood: '',
      content: 'Start writing...',
      month: '',
      monthLabel: '',
    };
    
    // Optimistically update layout to include the new entry slug in the selected shelf
    const newLayout = {
      ...layout,
      shelves: layout.shelves.map(s => s.id === selectedShelf.id ? { ...s, entrySlugs: [...s.entrySlugs, slug] } : s)
    };
    
    setLibraryData(newLayout, [...entries, newEntry]);
    selectBook(newEntry.slug);
  };

  const handleUpdateEntry = async (updates: Partial<typeof selectedEntry>) => {
    const currentEntry = entries.find(e => e.slug === selectedBookId) || selectedEntry;
    if (!currentEntry) return;
    const updatedEntry = { ...currentEntry, ...updates };
    setLibraryData(layout, entries.map(e => e.slug === currentEntry.slug ? updatedEntry : e));
    
    // We don't save to disk immediately on every keystroke to avoid spamming the server action
  };

  const handleSaveEntryToDisk = async () => {
    const currentEntry = entries.find(e => e.slug === selectedBookId) || selectedEntry;
    if (!currentEntry) return;
    setSaving(true);
    
    // Find the shelf this entry belongs to
    const parentShelf = layout.shelves.find(s => s.entrySlugs.includes(currentEntry.slug));
    if (parentShelf) {
      const result = await saveEntry(currentEntry.slug, currentEntry.title, currentEntry.date, currentEntry.content, parentShelf.id, layout);
      if (!result.success) {
        alert("Failed to save changes. Please try again.");
      }
    }
    setSaving(false);
  };

  const handleDeleteEntry = async () => {
    const currentEntry = entries.find(e => e.slug === selectedBookId) || selectedEntry;
    if (!currentEntry) return;
    setSaving(true);
    const result = await deleteEntryAction(currentEntry.slug, layout);
    if (result.success && result.newLayout) {
      setLibraryData(result.newLayout, entries.filter(e => e.slug !== currentEntry.slug));
      selectBook(null);
    } else {
      alert("Failed to delete book. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-[#1a1210]/95 border-l border-[#c9a84c] p-6 text-[#e0e0e0] font-serif overflow-y-auto pointer-events-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl text-[#c9a84c]">Library Editor</h2>
        <div className="space-x-2">
          <button 
            onClick={async () => {
              setSaving(true);
              const result = await saveLayout(layout);
              if (!result.success) alert("Failed to save layout. Please try again.");
              setSaving(false);
            }}
            disabled={saving}
            className="text-sm border border-green-500/50 text-green-400 px-2 py-1 rounded hover:bg-green-500 hover:text-white transition-colors"
          >
            {saving ? 'Saving...' : 'Save Layout'}
          </button>
          <button 
            onClick={() => {
              selectShelf(null);
              selectBook(null);
              setPhase('exploring');
            }}
            className="text-sm border border-[#c9a84c] px-2 py-1 rounded hover:bg-[#c9a84c] hover:text-black transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <button
          onClick={handleAddShelf}
          className="w-full bg-[#c9a84c] text-black py-2 rounded font-semibold hover:bg-[#d4b96b] transition-colors"
        >
          + Add New Shelf
        </button>
      </div>

      {selectedBookId ? (() => {
        const entryToEdit = entries.find(e => e.slug === selectedBookId) || selectedEntry;
        if (!entryToEdit) return null;
        return (
        <div className="space-y-4 border-t border-[#c9a84c]/30 pt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg text-[#c9a84c]">Edit Book</h3>
            <button onClick={() => selectBook(null)} className="text-xs text-gray-400 hover:text-white">&larr; Back</button>
          </div>
          
          <div>
            <label className="block text-sm mb-1 opacity-80">Title</label>
            <input
              type="text"
              value={entryToEdit.title}
              onChange={(e) => handleUpdateEntry({ title: e.target.value })}
              className="w-full bg-black/50 border border-[#c9a84c]/50 rounded px-3 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#c9a84c]"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 opacity-80">Date (appears on spine)</label>
            <input
              type="date"
              value={entryToEdit.date}
              onChange={(e) => handleUpdateEntry({ date: e.target.value })}
              className="w-full bg-black/50 border border-[#c9a84c]/50 rounded px-3 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#c9a84c]"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 opacity-80">Journal Content (Rich Text)</label>
            <div className="bg-black/50 border border-[#c9a84c]/50 rounded text-[#e0e0e0] [&_.ql-toolbar]:border-[#c9a84c]/50 [&_.ql-toolbar]:bg-[#c9a84c]/10 [&_.ql-container]:border-[#c9a84c]/50 [&_.ql-editor]:min-h-[150px] [&_.ql-stroke]:stroke-[#c9a84c] [&_.ql-fill]:fill-[#c9a84c] [&_.ql-picker-label]:text-[#c9a84c]">
              <ReactQuill 
                theme="snow" 
                value={entryToEdit.content} 
                onChange={(content) => handleUpdateEntry({ content })} 
              />
            </div>
          </div>

          <div className="mt-6 border-t border-[#c9a84c]/30 pt-4">
            <label className="block text-sm mb-2 opacity-80 text-[#c9a84c]">Position Controls</label>
            <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
              <div />
              <button onClick={() => {
                const s = layout.shelves.find(sh => sh.entrySlugs.includes(entryToEdit.slug));
                if (!s) return;
                const t = s.bookTransforms?.[entryToEdit.slug];
                const idx = s.entrySlugs.indexOf(entryToEdit.slug);
                const h = 0.7 + (idx % 3) * 0.1;
                const p = t ? [...t.position] : [-(s.entrySlugs.length * 0.14) / 2 + idx * 0.14, 1.15 + h / 2 + 0.02, 0];
                const r = t ? [...t.rotation] : [0, 0, 0];
                p[1] += 0.05;
                useStore.getState().updateBookTransform(s.id, entryToEdit.slug, p as any, r as any);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Up</button>
              <div />
              <button onClick={() => {
                const s = layout.shelves.find(sh => sh.entrySlugs.includes(entryToEdit.slug));
                if (!s) return;
                const t = s.bookTransforms?.[entryToEdit.slug];
                const idx = s.entrySlugs.indexOf(entryToEdit.slug);
                const h = 0.7 + (idx % 3) * 0.1;
                const p = t ? [...t.position] : [-(s.entrySlugs.length * 0.14) / 2 + idx * 0.14, 1.15 + h / 2 + 0.02, 0];
                const r = t ? [...t.rotation] : [0, 0, 0];
                p[2] += 0.05;
                useStore.getState().updateBookTransform(s.id, entryToEdit.slug, p as any, r as any);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Left</button>
              <div className="flex items-center justify-center opacity-50">Pos</div>
              <button onClick={() => {
                const s = layout.shelves.find(sh => sh.entrySlugs.includes(entryToEdit.slug));
                if (!s) return;
                const t = s.bookTransforms?.[entryToEdit.slug];
                const idx = s.entrySlugs.indexOf(entryToEdit.slug);
                const h = 0.7 + (idx % 3) * 0.1;
                const p = t ? [...t.position] : [-(s.entrySlugs.length * 0.14) / 2 + idx * 0.14, 1.15 + h / 2 + 0.02, 0];
                const r = t ? [...t.rotation] : [0, 0, 0];
                p[2] -= 0.05;
                useStore.getState().updateBookTransform(s.id, entryToEdit.slug, p as any, r as any);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Right</button>
              <button onClick={() => {
                const s = layout.shelves.find(sh => sh.entrySlugs.includes(entryToEdit.slug));
                if (!s) return;
                const t = s.bookTransforms?.[entryToEdit.slug];
                const idx = s.entrySlugs.indexOf(entryToEdit.slug);
                const h = 0.7 + (idx % 3) * 0.1;
                const p = t ? [...t.position] : [-(s.entrySlugs.length * 0.14) / 2 + idx * 0.14, 1.15 + h / 2 + 0.02, 0];
                const r = t ? [...t.rotation] : [0, 0, 0];
                p[0] += 0.05;
                useStore.getState().updateBookTransform(s.id, entryToEdit.slug, p as any, r as any);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20 text-blue-300">Fwd</button>
              <button onClick={() => {
                const s = layout.shelves.find(sh => sh.entrySlugs.includes(entryToEdit.slug));
                if (!s) return;
                const t = s.bookTransforms?.[entryToEdit.slug];
                const idx = s.entrySlugs.indexOf(entryToEdit.slug);
                const h = 0.7 + (idx % 3) * 0.1;
                const p = t ? [...t.position] : [-(s.entrySlugs.length * 0.14) / 2 + idx * 0.14, 1.15 + h / 2 + 0.02, 0];
                const r = t ? [...t.rotation] : [0, 0, 0];
                p[1] -= 0.05;
                useStore.getState().updateBookTransform(s.id, entryToEdit.slug, p as any, r as any);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Down</button>
              <button onClick={() => {
                const s = layout.shelves.find(sh => sh.entrySlugs.includes(entryToEdit.slug));
                if (!s) return;
                const t = s.bookTransforms?.[entryToEdit.slug];
                const idx = s.entrySlugs.indexOf(entryToEdit.slug);
                const h = 0.7 + (idx % 3) * 0.1;
                const p = t ? [...t.position] : [-(s.entrySlugs.length * 0.14) / 2 + idx * 0.14, 1.15 + h / 2 + 0.02, 0];
                const r = t ? [...t.rotation] : [0, 0, 0];
                p[0] -= 0.05;
                useStore.getState().updateBookTransform(s.id, entryToEdit.slug, p as any, r as any);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20 text-blue-300">Back</button>
            </div>

            <label className="block text-sm mb-2 opacity-80 text-[#c9a84c]">Rotation Controls</label>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <button onClick={() => {
                const s = layout.shelves.find(sh => sh.entrySlugs.includes(entryToEdit.slug));
                if (!s) return;
                const t = s.bookTransforms?.[entryToEdit.slug];
                const idx = s.entrySlugs.indexOf(entryToEdit.slug);
                const h = 0.7 + (idx % 3) * 0.1;
                const p = t ? [...t.position] : [-(s.entrySlugs.length * 0.14) / 2 + idx * 0.14, 1.15 + h / 2 + 0.02, 0];
                const r = t ? [...t.rotation] : [0, 0, 0];
                r[0] += 0.1;
                useStore.getState().updateBookTransform(s.id, entryToEdit.slug, p as any, r as any);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Rot X (+)</button>
              <button onClick={() => {
                const s = layout.shelves.find(sh => sh.entrySlugs.includes(entryToEdit.slug));
                if (!s) return;
                const t = s.bookTransforms?.[entryToEdit.slug];
                const idx = s.entrySlugs.indexOf(entryToEdit.slug);
                const h = 0.7 + (idx % 3) * 0.1;
                const p = t ? [...t.position] : [-(s.entrySlugs.length * 0.14) / 2 + idx * 0.14, 1.15 + h / 2 + 0.02, 0];
                const r = t ? [...t.rotation] : [0, 0, 0];
                r[0] -= 0.1;
                useStore.getState().updateBookTransform(s.id, entryToEdit.slug, p as any, r as any);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Rot X (-)</button>
              
              <button onClick={() => {
                const s = layout.shelves.find(sh => sh.entrySlugs.includes(entryToEdit.slug));
                if (!s) return;
                const t = s.bookTransforms?.[entryToEdit.slug];
                const idx = s.entrySlugs.indexOf(entryToEdit.slug);
                const h = 0.7 + (idx % 3) * 0.1;
                const p = t ? [...t.position] : [-(s.entrySlugs.length * 0.14) / 2 + idx * 0.14, 1.15 + h / 2 + 0.02, 0];
                const r = t ? [...t.rotation] : [0, 0, 0];
                r[1] += 0.1;
                useStore.getState().updateBookTransform(s.id, entryToEdit.slug, p as any, r as any);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Rot Y (+)</button>
              <button onClick={() => {
                const s = layout.shelves.find(sh => sh.entrySlugs.includes(entryToEdit.slug));
                if (!s) return;
                const t = s.bookTransforms?.[entryToEdit.slug];
                const idx = s.entrySlugs.indexOf(entryToEdit.slug);
                const h = 0.7 + (idx % 3) * 0.1;
                const p = t ? [...t.position] : [-(s.entrySlugs.length * 0.14) / 2 + idx * 0.14, 1.15 + h / 2 + 0.02, 0];
                const r = t ? [...t.rotation] : [0, 0, 0];
                r[1] -= 0.1;
                useStore.getState().updateBookTransform(s.id, entryToEdit.slug, p as any, r as any);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Rot Y (-)</button>
              
              <button onClick={() => {
                const s = layout.shelves.find(sh => sh.entrySlugs.includes(entryToEdit.slug));
                if (!s) return;
                const t = s.bookTransforms?.[entryToEdit.slug];
                const idx = s.entrySlugs.indexOf(entryToEdit.slug);
                const h = 0.7 + (idx % 3) * 0.1;
                const p = t ? [...t.position] : [-(s.entrySlugs.length * 0.14) / 2 + idx * 0.14, 1.15 + h / 2 + 0.02, 0];
                const r = t ? [...t.rotation] : [0, 0, 0];
                r[2] += 0.1;
                useStore.getState().updateBookTransform(s.id, entryToEdit.slug, p as any, r as any);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Rot Z (+)</button>
              <button onClick={() => {
                const s = layout.shelves.find(sh => sh.entrySlugs.includes(entryToEdit.slug));
                if (!s) return;
                const t = s.bookTransforms?.[entryToEdit.slug];
                const idx = s.entrySlugs.indexOf(entryToEdit.slug);
                const h = 0.7 + (idx % 3) * 0.1;
                const p = t ? [...t.position] : [-(s.entrySlugs.length * 0.14) / 2 + idx * 0.14, 1.15 + h / 2 + 0.02, 0];
                const r = t ? [...t.rotation] : [0, 0, 0];
                r[2] -= 0.1;
                useStore.getState().updateBookTransform(s.id, entryToEdit.slug, p as any, r as any);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Rot Z (-)</button>
            </div>
            
            <button onClick={() => {
                const s = layout.shelves.find(sh => sh.entrySlugs.includes(entryToEdit.slug));
                if (!s) return;
                // We'll reset by explicitly giving it the default calculated position, or clearing its transform entirely if our state supported undefined.
                // Our useStore currently updates the object. We can just set it to the default calc.
                const idx = s.entrySlugs.indexOf(entryToEdit.slug);
                const h = 0.7 + (idx % 3) * 0.1;
                const p = [-(s.entrySlugs.length * 0.14) / 2 + idx * 0.14, 1.15 + h / 2 + 0.02, 0];
                const r = [0, 0, 0];
                useStore.getState().updateBookTransform(s.id, entryToEdit.slug, p as any, r as any);
            }} className="w-full mt-4 py-1 text-xs border border-red-500/50 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors">
              Reset Transform
            </button>
          </div>

          <button
            onClick={handleSaveEntryToDisk}
            disabled={saving}
            className="w-full bg-[#c9a84c] text-black py-2 rounded hover:bg-[#d4b96b] transition-colors disabled:opacity-50 mt-4"
          >
            {saving ? 'Saving...' : 'Save Book Content'}
          </button>

          <button
            onClick={handleDeleteEntry}
            disabled={saving}
            className="w-full border border-red-500/50 text-red-400 py-2 rounded hover:bg-red-500 hover:text-white transition-colors mt-8"
          >
            Delete Book
          </button>
        </div>
        );
      })() : selectedShelf ? (
        <div className="space-y-4 border-t border-[#c9a84c]/30 pt-4">
          <h3 className="text-lg text-[#c9a84c] mb-2">Edit Shelf</h3>
          
          <div>
            <label className="block text-sm mb-1 opacity-80">Plaque Name</label>
            <input
              type="text"
              value={selectedShelf.name}
              onChange={(e) => handleUpdateShelfName(e.target.value)}
              className="w-full bg-black/50 border border-[#c9a84c]/50 rounded px-3 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#c9a84c]"
            />
          </div>

          <div className="mt-6 border-t border-[#c9a84c]/30 pt-4">
            <label className="block text-sm mb-2 opacity-80 text-[#c9a84c]">Position Controls</label>
            <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
              <div />
              <button onClick={() => {
                const p = [...selectedShelf.position] as [number, number, number];
                p[1] += 0.1;
                useStore.getState().updateShelfTransform(selectedShelf.id, p, selectedShelf.rotation);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Up</button>
              <div />
              <button onClick={() => {
                const p = [...selectedShelf.position] as [number, number, number];
                p[2] += 0.1;
                useStore.getState().updateShelfTransform(selectedShelf.id, p, selectedShelf.rotation);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Left</button>
              <div className="flex items-center justify-center opacity-50">Pos</div>
              <button onClick={() => {
                const p = [...selectedShelf.position] as [number, number, number];
                p[2] -= 0.1;
                useStore.getState().updateShelfTransform(selectedShelf.id, p, selectedShelf.rotation);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Right</button>
              <button onClick={() => {
                const p = [...selectedShelf.position] as [number, number, number];
                p[0] += 0.1;
                useStore.getState().updateShelfTransform(selectedShelf.id, p, selectedShelf.rotation);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20 text-blue-300">Fwd</button>
              <button onClick={() => {
                const p = [...selectedShelf.position] as [number, number, number];
                p[1] -= 0.1;
                useStore.getState().updateShelfTransform(selectedShelf.id, p, selectedShelf.rotation);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Down</button>
              <button onClick={() => {
                const p = [...selectedShelf.position] as [number, number, number];
                p[0] -= 0.1;
                useStore.getState().updateShelfTransform(selectedShelf.id, p, selectedShelf.rotation);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20 text-blue-300">Back</button>
            </div>

            <label className="block text-sm mb-2 opacity-80 text-[#c9a84c]">Rotation Controls</label>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <button onClick={() => {
                const r = [...selectedShelf.rotation] as [number, number, number];
                r[0] += 0.1;
                useStore.getState().updateShelfTransform(selectedShelf.id, selectedShelf.position, r);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Rot X (+)</button>
              <button onClick={() => {
                const r = [...selectedShelf.rotation] as [number, number, number];
                r[0] -= 0.1;
                useStore.getState().updateShelfTransform(selectedShelf.id, selectedShelf.position, r);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Rot X (-)</button>
              
              <button onClick={() => {
                const r = [...selectedShelf.rotation] as [number, number, number];
                r[1] += 0.1;
                useStore.getState().updateShelfTransform(selectedShelf.id, selectedShelf.position, r);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Rot Y (+)</button>
              <button onClick={() => {
                const r = [...selectedShelf.rotation] as [number, number, number];
                r[1] -= 0.1;
                useStore.getState().updateShelfTransform(selectedShelf.id, selectedShelf.position, r);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Rot Y (-)</button>
              
              <button onClick={() => {
                const r = [...selectedShelf.rotation] as [number, number, number];
                r[2] += 0.1;
                useStore.getState().updateShelfTransform(selectedShelf.id, selectedShelf.position, r);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Rot Z (+)</button>
              <button onClick={() => {
                const r = [...selectedShelf.rotation] as [number, number, number];
                r[2] -= 0.1;
                useStore.getState().updateShelfTransform(selectedShelf.id, selectedShelf.position, r);
              }} className="py-2 border border-[#c9a84c]/50 rounded hover:bg-[#c9a84c]/20">Rot Z (-)</button>
            </div>
            
            <button onClick={() => {
                useStore.getState().updateShelfTransform(selectedShelf.id, [0,0,0], [0,0,0]);
            }} className="w-full mt-4 py-1 text-xs border border-red-500/50 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors">
              Reset Transform
            </button>
          </div>

          <button
            onClick={handleAddEntry}
            disabled={saving}
            className="w-full border border-[#c9a84c] text-[#c9a84c] py-2 rounded hover:bg-[#c9a84c] hover:text-black transition-colors disabled:opacity-50"
          >
            {saving ? 'Adding...' : '+ Add Book (Entry)'}
          </button>

          <button
            onClick={handleDeleteShelf}
            className="w-full border border-red-500/50 text-red-400 py-2 rounded hover:bg-red-500 hover:text-white transition-colors mt-8"
          >
            Delete Shelf
          </button>
        </div>
      ) : (
        <div className="text-sm opacity-60 italic text-center mt-12">
          Click on a shelf or book in the 3D scene to edit its properties.
        </div>
      )}
    </div>
  );
}
