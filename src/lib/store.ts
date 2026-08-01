// Read side of the saved-reel store (server only).
//
// The pipeline owns writes (out/index.json, out/ics/*.ics); the web layer only
// reads. Keeping it one-directional means there is no locking to get wrong
// between the Node process and the Python child.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { SavedItem } from './store-client';

export type { SavedItem };
export { daysUntil, sortByUrgency } from './store-client';

const OUT_DIR = path.join(process.cwd(), 'out');

export async function readIndex(): Promise<SavedItem[]> {
  try {
    const raw = await readFile(path.join(OUT_DIR, 'index.json'), 'utf8');
    return JSON.parse(raw) as SavedItem[];
  } catch {
    // No index yet just means nothing has been analysed — not an error.
    return [];
  }
}

export async function readIcs(shortcode: string): Promise<string | null> {
  // Guard against traversal: shortcodes are alphanumeric-ish, nothing else.
  if (!/^[\w-]+$/.test(shortcode)) return null;
  try {
    return await readFile(path.join(OUT_DIR, 'ics', `${shortcode}.ics`), 'utf8');
  } catch {
    return null;
  }
}
