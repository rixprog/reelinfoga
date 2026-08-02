'use client';

/**
 * Collections and stars, in localStorage.
 *
 * Deliberately client-side: grouping is a personal, low-stakes preference, and
 * putting it on the server would mean a schema, an API and a migration for
 * something the user can rebuild in ten seconds. Revisit when there are accounts.
 */
const KEY = 'reelbrain.collections';
const STAR = 'reelbrain.starred';
const TRACK = 'reelbrain.tracking';

export interface Collection {
  id: string;
  name: string;
  shortcodes: string[];
  createdAt: number;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
  // Same-tab listeners: the storage event only fires in OTHER tabs.
  window.dispatchEvent(new Event('reelbrain:store'));
}

export const collections = {
  all: () => read<Collection[]>(KEY, []),

  create(name: string, shortcodes: string[] = []) {
    const list = collections.all();
    const c: Collection = {
      id: `c${Date.now().toString(36)}`,
      name: name.trim() || 'Untitled',
      shortcodes,
      createdAt: Date.now(),
    };
    write(KEY, [...list, c]);
    return c;
  },

  addTo(id: string, shortcodes: string[]) {
    write(
      KEY,
      collections.all().map((c) =>
        c.id === id
          ? { ...c, shortcodes: [...new Set([...c.shortcodes, ...shortcodes])] }
          : c,
      ),
    );
  },

  removeFrom(id: string, shortcode: string) {
    write(
      KEY,
      collections.all().map((c) =>
        c.id === id
          ? { ...c, shortcodes: c.shortcodes.filter((s) => s !== shortcode) }
          : c,
      ),
    );
  },

  remove: (id: string) => write(KEY, collections.all().filter((c) => c.id !== id)),
};

/**
 * Whether the phone's location relay is being watched.
 *
 * Persisted so the toggle on the map and the watcher in the layout agree, and
 * so tracking survives leaving /map — otherwise navigating to Reels silently
 * tore the socket down and the alerts stopped.
 */
export const liveTracking = {
  get: () => read<boolean>(TRACK, false),
  set: (on: boolean) => write(TRACK, on),
};

export const starred = {
  all: () => read<string[]>(STAR, []),
  has: (s: string) => starred.all().includes(s),
  toggle(s: string) {
    const list = starred.all();
    const next = list.includes(s) ? list.filter((x) => x !== s) : [...list, s];
    write(STAR, next);
    return next.includes(s);
  },
};
