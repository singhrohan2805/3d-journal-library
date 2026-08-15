import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface JournalEntry {
  slug: string;
  title: string;
  date: string;
  mood: string;
  content: string;
  month: string; // "2024-01" format
  monthLabel: string; // "January 2024"
}

export interface ShelfLayout {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  entrySlugs: string[];
  bookTransforms?: Record<string, { position: [number, number, number]; rotation: [number, number, number] }>;
}

export interface LibraryLayout {
  shelves: ShelfLayout[];
}

export interface MonthGroup {
  month: string;
  label: string;
  entries: JournalEntry[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getAllEntries(): JournalEntry[] {
  const journalDir = path.join(process.cwd(), 'content', 'journal');

  if (!fs.existsSync(journalDir)) {
    return [];
  }

  const files = fs.readdirSync(journalDir).filter((f) => f.endsWith('.md'));

  return files
    .map((filename) => {
      const filePath = path.join(journalDir, filename);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(fileContent);
      const slug = filename.replace('.md', '');
      const date = new Date(data.date);
      const monthNum = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const month = `${year}-${monthNum}`;
      const monthLabel = `${MONTHS[date.getMonth()]} ${year}`;

      return {
        slug,
        title: data.title || slug,
        date: data.date?.toString() || '',
        mood: data.mood || '',
        content,
        month,
        monthLabel,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getEntriesGroupedByMonth(): MonthGroup[] {
  const entries = getAllEntries();
  const groups: Map<string, MonthGroup> = new Map();

  for (const entry of entries) {
    if (!groups.has(entry.month)) {
      groups.set(entry.month, {
        month: entry.month,
        label: entry.monthLabel,
        entries: [],
      });
    }
    groups.get(entry.month)!.entries.push(entry);
  }

  return Array.from(groups.values());
}
