'use server';

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { JournalEntry, LibraryLayout, ShelfLayout, getAllEntries } from '../lib/journal';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const JOURNAL_DIR = path.join(CONTENT_DIR, 'journal');
const LAYOUT_FILE = path.join(CONTENT_DIR, 'layout.json');

// Helper to calculate default shelf positions based on index
function calculateDefaultShelfPosition(index: number): { position: [number, number, number], rotation: [number, number, number] } {
  const ROOM_W = 20;
  const ROOM_D = 24;
  
  if (index < 4) {
    // Left wall
    return {
      position: [-ROOM_W / 2 + 0.5, 0, -ROOM_D / 2 + 3 + index * 5],
      rotation: [0, Math.PI / 2, 0]
    };
  } else if (index < 8) {
    // Right wall
    return {
      position: [ROOM_W / 2 - 0.5, 0, -ROOM_D / 2 + 3 + (index - 4) * 5],
      rotation: [0, -Math.PI / 2, 0]
    };
  } else {
    // Back wall
    return {
      position: [-ROOM_W / 2 + 3 + (index - 8) * 5, 0, -ROOM_D / 2 + 0.5],
      rotation: [0, 0, 0]
    };
  }
}

export async function getLibraryData() {
  const entries = getAllEntries();
  let layout: LibraryLayout;

  if (fs.existsSync(LAYOUT_FILE)) {
    layout = JSON.parse(fs.readFileSync(LAYOUT_FILE, 'utf-8'));
  } else {
    // Migrate existing data to layout.json
    const shelves: ShelfLayout[] = [];
    const groups: Map<string, JournalEntry[]> = new Map();
    
    // Group by month
    for (const entry of entries) {
      if (!groups.has(entry.monthLabel)) {
        groups.set(entry.monthLabel, []);
      }
      groups.get(entry.monthLabel)!.push(entry);
    }

    let shelfIndex = 0;
    for (const [monthLabel, monthEntries] of groups.entries()) {
      const { position, rotation } = calculateDefaultShelfPosition(shelfIndex);
      shelves.push({
        id: `shelf_${Date.now()}_${shelfIndex}`,
        name: monthLabel,
        position,
        rotation,
        entrySlugs: monthEntries.map(e => e.slug),
      });
      shelfIndex++;
    }

    layout = { shelves };
    
    // Ensure directory exists
    if (!fs.existsSync(CONTENT_DIR)) {
      fs.mkdirSync(CONTENT_DIR, { recursive: true });
    }
    fs.writeFileSync(LAYOUT_FILE, JSON.stringify(layout, null, 2));
  }

  return { layout, entries };
}

export async function saveLayout(layout: LibraryLayout) {
  fs.writeFileSync(LAYOUT_FILE, JSON.stringify(layout, null, 2));
  return { success: true };
}

export async function saveEntry(slug: string, title: string, date: string, content: string, shelfId: string, layout: LibraryLayout) {
  if (!fs.existsSync(JOURNAL_DIR)) {
    fs.mkdirSync(JOURNAL_DIR, { recursive: true });
  }

  const filePath = path.join(JOURNAL_DIR, `${slug}.md`);
  const fileContent = matter.stringify(content, { title, date });
  fs.writeFileSync(filePath, fileContent);

  // Update layout.json if the slug is not in the shelf
  let updatedLayout = { ...layout };
  let found = false;
  
  updatedLayout.shelves = updatedLayout.shelves.map(shelf => {
    // Remove from other shelves
    if (shelf.id !== shelfId) {
      return {
        ...shelf,
        entrySlugs: shelf.entrySlugs.filter(s => s !== slug)
      };
    }
    // Add to target shelf
    if (!shelf.entrySlugs.includes(slug)) {
      found = true;
      return {
        ...shelf,
        entrySlugs: [...shelf.entrySlugs, slug]
      };
    }
    return shelf;
  });

  if (found) {
    await saveLayout(updatedLayout);
  }

  return { success: true, newLayout: updatedLayout };
}

export async function deleteEntryAction(slug: string, layout: LibraryLayout) {
  const filePath = path.join(JOURNAL_DIR, `${slug}.md`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Remove from layout
  const updatedLayout = { ...layout };
  updatedLayout.shelves = updatedLayout.shelves.map(shelf => ({
    ...shelf,
    entrySlugs: shelf.entrySlugs.filter(s => s !== slug)
  }));

  await saveLayout(updatedLayout);
  return { success: true, newLayout: updatedLayout };
}
