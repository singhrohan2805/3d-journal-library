import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { saveLayout, saveEntry, deleteEntryAction } from '../../app/actions';

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
    await saveLayout(newLayout);
    selectShelf(newShelf.id);
  };

  const handleDeleteShelf = async () => {
    if (!selectedShelf) return;
    const newLayout = {
      ...layout,
      shelves: layout.shelves.filter((s) => s.id !== selectedShelf.id),
    };
    setLibraryData(newLayout, entries);
    await saveLayout(newLayout);
    selectShelf(null);
  };

  const handleUpdateShelfName = async (name: string) => {
    if (!selectedShelf) return;
    const newLayout = {
      ...layout,
      shelves: layout.shelves.map((s) => (s.id === selectedShelf.id ? { ...s, name } : s)),
    };
    setLibraryData(newLayout, entries);
    await saveLayout(newLayout);
  };

  const handleAddEntry = async () => {
    if (!selectedShelf) return;
    setSaving(true);
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
    
    const { newLayout } = await saveEntry(slug, newEntry.title, newEntry.date, newEntry.content, selectedShelf.id, layout);
    if (newLayout) {
      setLibraryData(newLayout, [...entries, newEntry]);
      selectBook(newEntry.slug);
    }
    setSaving(false);
  };

  const handleUpdateEntry = async (updates: Partial<typeof selectedEntry>) => {
    if (!selectedEntry) return;
    const updatedEntry = { ...selectedEntry, ...updates };
    setLibraryData(layout, entries.map(e => e.slug === selectedEntry.slug ? updatedEntry : e));
    
    // We don't save to disk immediately on every keystroke to avoid spamming the server action
  };

  const handleSaveEntryToDisk = async () => {
    if (!selectedEntry) return;
    setSaving(true);
    
    // Find the shelf this entry belongs to
    const parentShelf = layout.shelves.find(s => s.entrySlugs.includes(selectedEntry.slug));
    if (parentShelf) {
      await saveEntry(selectedEntry.slug, selectedEntry.title, selectedEntry.date, selectedEntry.content, parentShelf.id, layout);
    }
    setSaving(false);
  };

  const handleDeleteEntry = async () => {
    if (!selectedEntry) return;
    setSaving(true);
    const { newLayout } = await deleteEntryAction(selectedEntry.slug, layout);
    if (newLayout) {
      setLibraryData(newLayout, entries.filter(e => e.slug !== selectedEntry.slug));
    }
    selectBook(null);
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
              await saveLayout(layout);
              setSaving(false);
            }}
            disabled={saving}
            className="text-sm border border-green-500/50 text-green-400 px-2 py-1 rounded hover:bg-green-500 hover:text-white transition-colors"
          >
            Save Layout
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

      {selectedBookId && selectedEntry ? (
        <div className="space-y-4 border-t border-[#c9a84c]/30 pt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg text-[#c9a84c]">Edit Book</h3>
            <button onClick={() => selectBook(null)} className="text-xs text-gray-400 hover:text-white">&larr; Back</button>
          </div>
          
          <div>
            <label className="block text-sm mb-1 opacity-80">Title</label>
            <input
              type="text"
              value={selectedEntry.title}
              onChange={(e) => handleUpdateEntry({ title: e.target.value })}
              className="w-full bg-black/50 border border-[#c9a84c]/50 rounded px-3 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#c9a84c]"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 opacity-80">Date (appears on spine)</label>
            <input
              type="date"
              value={selectedEntry.date}
              onChange={(e) => handleUpdateEntry({ date: e.target.value })}
              className="w-full bg-black/50 border border-[#c9a84c]/50 rounded px-3 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#c9a84c]"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 opacity-80">Journal Content (Markdown)</label>
            <textarea
              rows={6}
              value={selectedEntry.content}
              onChange={(e) => handleUpdateEntry({ content: e.target.value })}
              className="w-full bg-black/50 border border-[#c9a84c]/50 rounded px-3 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#c9a84c] font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 opacity-80 mt-4">Transform Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTransformMode('translate')}
                className={`flex-1 py-1 text-sm border rounded transition-colors ${
                  transformMode === 'translate'
                    ? 'bg-[#c9a84c] text-black border-[#c9a84c]'
                    : 'border-[#c9a84c]/50 text-[#c9a84c] hover:bg-[#c9a84c]/20'
                }`}
              >
                Move
              </button>
              <button
                onClick={() => setTransformMode('rotate')}
                className={`flex-1 py-1 text-sm border rounded transition-colors ${
                  transformMode === 'rotate'
                    ? 'bg-[#c9a84c] text-black border-[#c9a84c]'
                    : 'border-[#c9a84c]/50 text-[#c9a84c] hover:bg-[#c9a84c]/20'
                }`}
              >
                Rotate
              </button>
            </div>
            <div className="text-xs opacity-60 mt-2">
              * Use the gizmo to move/rotate the book on the shelf.
            </div>
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
      ) : selectedShelf ? (
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

          <div>
            <label className="block text-sm mb-1 opacity-80 mt-4">Transform Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTransformMode('translate')}
                className={`flex-1 py-1 text-sm border rounded transition-colors ${
                  transformMode === 'translate'
                    ? 'bg-[#c9a84c] text-black border-[#c9a84c]'
                    : 'border-[#c9a84c]/50 text-[#c9a84c] hover:bg-[#c9a84c]/20'
                }`}
              >
                Move
              </button>
              <button
                onClick={() => setTransformMode('rotate')}
                className={`flex-1 py-1 text-sm border rounded transition-colors ${
                  transformMode === 'rotate'
                    ? 'bg-[#c9a84c] text-black border-[#c9a84c]'
                    : 'border-[#c9a84c]/50 text-[#c9a84c] hover:bg-[#c9a84c]/20'
                }`}
              >
                Rotate
              </button>
            </div>
          </div>

          <div className="text-xs opacity-60 mb-4 mt-2">
            * Use the gizmo in the 3D scene to move or rotate the shelf.
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
