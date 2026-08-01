/**
 * Thin client over the backend already running on the laptop.
 *
 * There is no business logic here and there should never be any. Every model
 * call, ffmpeg invocation and embedding happens on the laptop, where it already
 * works; the phone posts a URL, polls, and renders what comes back.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'reelbrain.baseUrl';

/**
 * Tailscale MagicDNS, not a LAN IP.
 *
 * The laptop's LAN address changes on every network, which is the single most
 * common way a demo like this dies. This name does not change, and Tailscale
 * connects directly (not via a relay) when both devices are on the same wifi,
 * so it costs nothing in latency.
 */
export const DEFAULT_BASE_URL = 'http://fedora.tail786f1.ts.net:3000';

let cached: string | null = null;

export async function getBaseUrl(): Promise<string> {
  if (cached) return cached;
  cached = (await AsyncStorage.getItem(KEY)) ?? DEFAULT_BASE_URL;
  return cached;
}

export async function setBaseUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/+$/, '');
  cached = clean;
  await AsyncStorage.setItem(KEY, clean);
}

async function req<T>(path: string, init?: RequestInit, timeoutMs = 20000): Promise<T> {
  const base = await getBaseUrl();
  // React Native's fetch has no default timeout, so a sleeping laptop would hang
  // the UI forever rather than surfacing a fixable error.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`Backend returned non-JSON (HTTP ${res.status})`);
    }
    if (!res.ok) {
      const msg = (body as { error?: string })?.error ?? `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return body as T;
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new Error("Couldn't reach the backend — is it running?");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ── types (mirrors of what the backend already returns) ──────────────────────

export interface SavedItem {
  shortcode: string;
  url: string;
  category: 'food_spot' | 'deadline' | 'travel' | 'recipe' | 'product' | 'other';
  owner: string | null;
  caption: string | null;
  hashtags: string[];
  likes: number | null;
  saved_at: string;
  title: string | null;
  confidence?: 'high' | 'medium' | 'low';

  organisation?: string | null;
  deadline_date?: string | null;
  deadline_passed?: boolean | null;
  registration_links?: string[];
  link_in_bio?: boolean;

  city?: string | null;
  area?: string | null;

  destination?: string | null;
  place_count?: number;

  cuisine?: string | null;
  total_time_minutes?: number | null;
  ingredient_count?: number;

  product_count?: number;
  product_names?: string[];

  topic?: string | null;
  tags?: string[];

  payload: Record<string, unknown>;
}

export interface JobStage {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  detail?: string;
}

export interface Job {
  id: string;
  url: string;
  status: 'running' | 'done' | 'error';
  stages: JobStage[];
  result: { reel?: { shortcode?: string } } | null;
  error: string | null;
  elapsedMs: number;
}

export interface SearchResult {
  shortcode: string;
  title: string | null;
  category: string;
  owner: string | null;
  url: string;
  snippet: string;
  matched: { semantic?: number; keyword?: number };
}

// ── calls ────────────────────────────────────────────────────────────────────

export const api = {
  reels: () => req<{ count: number; items: SavedItem[] }>('/api/reels'),

  analyze: (url: string) =>
    req<{ id: string; status: string }>('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),

  job: (id: string) => req<Job>(`/api/analyze/${id}`),

  search: (q: string) =>
    req<{ results: SearchResult[] }>(
      `/api/search?q=${encodeURIComponent(q)}&limit=15`,
      undefined,
      60000, // embeds the query server-side; slower than the other routes
    ),

  thumbUrl: async (shortcode: string) =>
    `${await getBaseUrl()}/api/thumb/${shortcode}`,

  /** Used by Settings. Returns how many reels the backend can see. */
  async ping(url?: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
    const base = (url ?? (await getBaseUrl())).trim().replace(/\/+$/, '');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(`${base}/api/reels`, { signal: ctrl.signal });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const body = (await res.json()) as { count?: number };
      return { ok: true, count: body.count ?? 0 };
    } catch (e) {
      const msg = (e as Error).name === 'AbortError' ? 'Timed out' : (e as Error).message;
      return { ok: false, error: msg };
    } finally {
      clearTimeout(timer);
    }
  },
};

export const INSTAGRAM_URL =
  /https?:\/\/(www\.)?instagram\.com\/(reel|reels|p|tv)\/[\w-]+/i;

/** Share sheets hand over messy text ("Check this out! https://... "). */
export function extractReelUrl(text: string): string | null {
  const m = text.match(INSTAGRAM_URL);
  return m ? m[0] : null;
}
