'use server';

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Octokit } from '@octokit/rest';
import { JournalEntry, LibraryLayout, ShelfLayout, getAllEntries } from '../lib/journal';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const JOURNAL_DIR = path.join(CONTENT_DIR, 'journal');
const LAYOUT_FILE = path.join(CONTENT_DIR, 'layout.json');

const octokit = process.env.GITHUB_TOKEN ? new Octokit({ auth: process.env.GITHUB_TOKEN }) : null;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'singhrohan2805';
const GITHUB_REPO = process.env.GITHUB_REPO || '3d-journal-library';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// Helper to push multiple file changes to GitHub directly
async function commitToGithub(message: string, files: { path: string; content: string | null }[], retries = 3) {
  if (!octokit) return false;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // 1. Get current commit
      const { data: ref } = await octokit.git.getRef({ owner: GITHUB_OWNER, repo: GITHUB_REPO, ref: `heads/${GITHUB_BRANCH}` });
      const { data: commit } = await octokit.git.getCommit({ owner: GITHUB_OWNER, repo: GITHUB_REPO, commit_sha: ref.object.sha });
      
      // 2. Create blobs & tree
      const tree: any[] = [];
      for (const file of files) {
        if (file.content === null) {
          // null means delete file
          tree.push({ path: file.path, mode: '100644', type: 'blob', sha: null });
        } else {
          const { data: blob } = await octokit.git.createBlob({ owner: GITHUB_OWNER, repo: GITHUB_REPO, content: file.content, encoding: 'utf-8' });
          tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
        }
      }
      
      // 3. Create Tree
      const { data: newTree } = await octokit.git.createTree({ owner: GITHUB_OWNER, repo: GITHUB_REPO, base_tree: commit.tree.sha, tree });
      
      // 4. Create Commit
      const { data: newCommit } = await octokit.git.createCommit({ owner: GITHUB_OWNER, repo: GITHUB_REPO, message, tree: newTree.sha, parents: [commit.sha] });
      
      // 5. Update Ref
      await octokit.git.updateRef({ owner: GITHUB_OWNER, repo: GITHUB_REPO, ref: `heads/${GITHUB_BRANCH}`, sha: newCommit.sha });
      return true; // Success!
    } catch (err: any) {
      console.error(`GitHub API error on attempt ${attempt}:`, err?.message || err);
      if (attempt === retries) {
        return false;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return false;
}

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
    try {
      if (!fs.existsSync(CONTENT_DIR)) {
        fs.mkdirSync(CONTENT_DIR, { recursive: true });
      }
      const layoutContent = JSON.stringify(layout, null, 2);
      fs.writeFileSync(LAYOUT_FILE, layoutContent);
    } catch (e) {
      console.warn('Local FS write failed (expected on Vercel)', e);
    }
    const layoutContent = JSON.stringify(layout, null, 2);

    // If migrating dynamically, might want to commit it as well
    if (octokit) {
      await commitToGithub('Initialize layout.json', [{ path: 'content/layout.json', content: layoutContent }]);
    }
  }

  return { layout, entries };
}

export async function saveLayout(layout: LibraryLayout) {
  const content = JSON.stringify(layout, null, 2);
  try {
    fs.writeFileSync(LAYOUT_FILE, content);
  } catch (e) {
    console.warn('Local FS write failed (expected on Vercel)', e);
  }

  if (octokit) {
    const success = await commitToGithub('Update library layout', [
      { path: 'content/layout.json', content }
    ]);
    if (!success) return { success: false, error: 'Failed to save to GitHub' };
  }

  return { success: true };
}

export async function saveEntry(slug: string, title: string, date: string, content: string, shelfId: string, layout: LibraryLayout) {
  const fileContent = matter.stringify(content, { title, date });
  try {
    if (!fs.existsSync(JOURNAL_DIR)) {
      fs.mkdirSync(JOURNAL_DIR, { recursive: true });
    }

    const filePath = path.join(JOURNAL_DIR, `${slug}.md`);
    fs.writeFileSync(filePath, fileContent);
  } catch (e) {
    console.warn('Local FS write failed (expected on Vercel)', e);
  }

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

  const filesToCommit = [
    { path: `content/journal/${slug}.md`, content: fileContent }
  ];

  if (found) {
    const layoutContent = JSON.stringify(updatedLayout, null, 2);
    try {
      fs.writeFileSync(LAYOUT_FILE, layoutContent);
    } catch (e) {
      console.warn('Local FS write failed (expected on Vercel)', e);
    }
    filesToCommit.push({ path: 'content/layout.json', content: layoutContent });
  }

  if (octokit) {
    const success = await commitToGithub(`Update journal entry: ${slug}`, filesToCommit);
    if (!success) return { success: false, error: 'Failed to save to GitHub' };
  }

  return { success: true, newLayout: updatedLayout };
}

export async function deleteEntryAction(slug: string, layout: LibraryLayout) {
  try {
    const filePath = path.join(JOURNAL_DIR, `${slug}.md`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.warn('Local FS delete failed (expected on Vercel)', e);
  }

  // Remove from layout
  const updatedLayout = { ...layout };
  updatedLayout.shelves = updatedLayout.shelves.map(shelf => ({
    ...shelf,
    entrySlugs: shelf.entrySlugs.filter(s => s !== slug)
  }));

  const layoutContent = JSON.stringify(updatedLayout, null, 2);
  try {
    fs.writeFileSync(LAYOUT_FILE, layoutContent);
  } catch (e) {
    console.warn('Local FS write failed (expected on Vercel)', e);
  }

  if (octokit) {
    const success = await commitToGithub(`Delete journal entry: ${slug}`, [
      { path: `content/journal/${slug}.md`, content: null },
      { path: 'content/layout.json', content: layoutContent }
    ]);
    if (!success) return { success: false, error: 'Failed to save to GitHub' };
  }

  return { success: true, newLayout: updatedLayout };
}
