/**
 * Local queue for shared reels.
 *
 * The share sheet fires whether or not there is signal — on a train, in a lift,
 * or when the laptop is asleep. Writing to disk first and syncing later means a
 * share is never silently lost, and the user can see that it landed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from './api';

const KEY = 'reelbrain.queue';

export interface Pending {
  url: string;
  queuedAt: number;
  jobId?: string;
  error?: string;
}

export async function readQueue(): Promise<Pending[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]') as Pending[];
  } catch {
    return [];
  }
}

async function write(items: Pending[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function enqueue(url: string): Promise<void> {
  const q = await readQueue();
  // A double-tap on the share sheet should not process the same reel twice.
  if (q.some((p) => p.url === url)) return;
  q.push({ url, queuedAt: Date.now() });
  await write(q);
}

export async function remove(url: string): Promise<void> {
  await write((await readQueue()).filter((p) => p.url !== url));
}

/**
 * Try to submit everything queued. Anything that fails stays queued with its
 * error recorded, so the next attempt retries rather than dropping it.
 */
export async function drain(): Promise<Pending[]> {
  const q = await readQueue();
  if (!q.length) return q;

  const next: Pending[] = [];
  for (const item of q) {
    if (item.jobId) {
      next.push(item);
      continue;
    }
    try {
      const { id } = await api.analyze(item.url);
      next.push({ ...item, jobId: id, error: undefined });
    } catch (e) {
      next.push({ ...item, error: (e as Error).message });
    }
  }
  await write(next);
  return next;
}
