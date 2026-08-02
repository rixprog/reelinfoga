'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Empty, Eyebrow } from './Shell';
import { Thumb } from './Thumb';
import type { SavedItem } from '@/lib/store-client';
import { categoryOf, placeKey } from '@/lib/ui';

const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-background text-sm text-ink-faint">
      Loading map…
    </div>
  ),
});

export interface Place {
  shortcode: string;
  name: string;
  category: string;
  sub: string;
  lat: number;
  lon: number;
  approximate?: boolean;
}

/** Pull every located place out of the library, whatever vertical it came from. */
function toPlaces(items: SavedItem[]): Place[] {
  const out: Place[] = [];
  for (const i of items) {
    const p = i.payload as Record<string, any>;
    if (typeof p?.lat === 'number' && typeof p?.lon === 'number') {
      out.push({
        shortcode: i.shortcode,
        name: i.title ?? 'Saved place',
        category: i.category,
        sub: [p.area, p.city].filter(Boolean).join(', '),
        lat: p.lat,
        lon: p.lon,
      });
    }
    for (const pl of p?.places ?? []) {
      if (typeof pl?.lat === 'number' && typeof pl?.lon === 'number') {
        out.push({
          shortcode: i.shortcode,
          name: pl.name,
          category: 'travel',
          sub: p.destination ?? '',
          lat: pl.lat,
          lon: pl.lon,
          approximate: pl.approximate,
        });
      }
    }
  }
  return out;
}

export function MapView() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [geo, setGeo] = useState<Place[]>([]);
  const [filter, setFilter] = useState<'all' | 'food_spot' | 'travel'>('all');
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const rows = useRef<Record<string, HTMLButtonElement | null>>({});

  // Selection also arrives from the map, where the matching row may be far down
  // a 300-item rail; without this the highlight lands off-screen.
  useEffect(() => {
    if (active) rows.current[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  useEffect(() => {
    // /api/places geocodes only — no language model. Calling the trip planner
    // here (as an earlier version did) meant an LLM ran just to draw pins.
    Promise.all([
      fetch('/api/reels', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/places', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([reels, geo]) => {
        setItems(reels.items ?? []);
        setGeo(geo.places ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const places = useMemo(() => {
    const all = [...geo, ...toPlaces(items)];
    const seen = new Set<string>();
    return all
      .filter((p) => {
        const k = `${p.name}|${p.lat.toFixed(4)}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .filter((p) => filter === 'all' || p.category === filter);
  }, [items, geo, filter]);

  if (loading) {
    return (
      <div className="grid h-[60vh] place-items-center text-sm text-ink-muted">
        Locating your saved places…
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <Empty
        title="Nothing on the map yet"
        body="Save a reel about a restaurant or a place to visit and its pin will appear here."
      />
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] flex-col overflow-hidden border-t border-line sm:h-[calc(100dvh-3.5rem)] sm:flex-row">
      {/* List rail: desktop only. On a phone the map plus a bottom sheet is the
          whole screen — a side rail would leave the map unusably narrow. */}
      <aside className="hidden w-[320px] shrink-0 flex-col border-r border-line bg-surface sm:flex">
        <div className="border-b border-line px-4 py-3">
          <Eyebrow>{places.length} places</Eyebrow>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {places.map((p, n) => {
            const key = placeKey(p, n);
            const on = active === key;
            return (
              <button
                key={key}
                ref={(el) => {
                  rows.current[key] = el;
                }}
                // Re-clicking the active row deselects, so the same control that
                // flew you somewhere also gets you back out.
                onClick={() => setActive(on ? null : key)}
                className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition hover:bg-background ${
                  on ? 'bg-primary-soft/40' : ''
                }`}
              >
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white transition-transform"
                  style={{
                    background: categoryOf(p.category).ink,
                    transform: on ? 'scale(1.15)' : undefined,
                  }}
                >
                  {n + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {p.sub}
                    {p.approximate && ' · approximate'}
                  </span>
                </span>
                <Thumb shortcode={p.shortcode} category={p.category} size={36} />
              </button>
            );
          })}
        </div>
      </aside>

      <div className="relative min-h-0 flex-1">
        <div className="absolute right-3 top-3 z-[500] flex rounded-full border border-line bg-surface p-1 shadow-sm">
          {(['all', 'food_spot', 'travel'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === k ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {k === 'all' ? 'All' : categoryOf(k).one}
            </button>
          ))}
        </div>
        <LocationMap places={places} active={active} onSelect={setActive} />
      </div>
    </div>
  );
}

export { toPlaces };
