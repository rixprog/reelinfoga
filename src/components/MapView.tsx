'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Card, Empty, Eyebrow, Pill } from './Shell';
import { Thumb } from './Thumb';
import type { SavedItem } from '@/lib/store-client';
import { formatDistance, metresBetween } from '@/lib/geo';
import { categoryOf, placeKey } from '@/lib/ui';
import { RELAY_URL, useLiveLocation } from '@/lib/use-live-location';

/** Alert when the phone comes within this of a saved place. */
const NEAR_M = 300;
/** Must get this far away before the same place can alert again. */
const CLEAR_M = 450;

const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-slate-50 text-sm text-zinc-400 font-medium">
      Loading map engine…
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
  const [searchQuery, setSearchQuery] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [alert, setAlert] = useState<{ name: string; sub: string; metres: number; key: string } | null>(null);
  const rows = useRef<Record<string, HTMLButtonElement | null>>({});
  /** Places already announced, cleared once the phone moves back out of range. */
  const announced = useRef<Set<string>>(new Set());

  const { position: live, status: relay } = useLiveLocation(tracking);

  // Selection also arrives from the map, where the matching row may be far down
  // a 300-item rail; without this the highlight lands off-screen.
  useEffect(() => {
    if (active) rows.current[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  useEffect(() => {
    Promise.all([
      fetch('/api/reels', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/places', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([reels, geoData]) => {
        setItems(reels.items ?? []);
        setGeo(geoData.places ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /** Every located place, before the UI filters. Proximity watches this list —
      alerts driven off the filtered one would go quiet the moment you typed in
      the search box, which is the opposite of what a proximity alert is for. */
  const allPlaces = useMemo(() => {
    const seen = new Set<string>();
    return [...geo, ...toPlaces(items)].filter((p) => {
      const k = `${p.name}|${p.lat.toFixed(4)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [items, geo]);

  const places = useMemo(
    () =>
      allPlaces
        .filter((p) => filter === 'all' || p.category === filter)
        .filter((p) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return p.name.toLowerCase().includes(q) || p.sub.toLowerCase().includes(q);
        }),
    [allPlaces, filter, searchQuery],
  );

  // Proximity watch. Hysteresis (NEAR_M in, CLEAR_M out) stops a place that you
  // are sitting right on top of from re-alerting on every GPS jitter frame.
  useEffect(() => {
    if (!live) return;
    let nearest: { p: (typeof allPlaces)[number]; d: number; key: string } | null = null;

    allPlaces.forEach((p, n) => {
      const d = metresBetween({ lat: live.lat, lon: live.lon }, { lat: p.lat, lon: p.lon });
      const key = placeKey(p, n);
      if (d > CLEAR_M) announced.current.delete(key);
      if (d <= NEAR_M && !announced.current.has(key)) {
        if (!nearest || d < nearest.d) nearest = { p, d, key };
      }
    });

    if (nearest) {
      const hit = nearest as { p: (typeof allPlaces)[number]; d: number; key: string };
      announced.current.add(hit.key);
      setAlert({ name: hit.p.name, sub: hit.p.sub, metres: hit.d, key: hit.key });
    }
  }, [live, allPlaces]);

  // Auto-dismiss, but keyed on the alert so a new one restarts the clock.
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 9000);
    return () => clearTimeout(t);
  }, [alert]);

  if (loading) {
    return (
      <div className="grid h-[60vh] place-items-center text-sm text-zinc-500 font-medium">
        Locating your saved places…
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 text-zinc-900 font-sans pb-12">
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#F4F9FF] via-[#EBF4FD] to-[#F4F2FF] p-6 sm:p-10 shadow-sm border border-blue-100/60">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/90 px-4 py-1.5 text-xs font-semibold text-blue-700 shadow-sm backdrop-blur-sm mb-3">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            Interactive Place Explorer
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900">
            Travel &amp; Place Discovery
          </h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-600">
            Explore every restaurant, café, hotel, and landmark extracted from your Instagram reels on a visual map.
          </p>


          {/* Floating Badges */}
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-blue-100 px-3.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
              📍 {places.length} Places Found
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-orange-100 px-3.5 py-1.5 text-xs font-semibold text-orange-700 shadow-sm">
              🍕 Restaurants &amp; Cafes
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-purple-100 px-3.5 py-1.5 text-xs font-semibold text-purple-700 shadow-sm">
              ✨ Hidden Gems
            </span>
          </div>
        </div>
      </section>

      {/* 2. DASHBOARD LAYOUT (SIDEBAR + MAP) */}
      <div className="relative overflow-hidden rounded-[28px] bg-white border border-purple-100/80 shadow-xl shadow-purple-900/5 min-h-[560px] flex flex-col lg:flex-row">
        {/* Left Sidebar */}
        <aside className="w-full lg:w-[340px] shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-100 bg-slate-50/50 flex flex-col">
          <div className="p-4 border-b border-zinc-100 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <Eyebrow>Discovered Places ({places.length})</Eyebrow>
            </div>
            {/* Search Input */}
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or city..."
              className="w-full rounded-xl border border-zinc-200 bg-slate-50 px-3.5 py-2 text-xs text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white"
            />
            {/* Filter Pills */}
            <div className="flex gap-1.5">
              {(['all', 'food_spot', 'travel'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                    filter === k
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-slate-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {k === 'all' ? 'All' : categoryOf(k).one}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Places List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[460px]">
            {places.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                No places found matching your filter.
              </div>
            ) : (
              places.map((p, n) => (
                <button
                  key={placeKey(p, n)}
                  // Registers the row so a marker click can scroll it into view.
                  // Without the ref the effect above has nothing to look up and
                  // the map-to-rail half of the sync silently does nothing.
                  ref={(el) => {
                    rows.current[placeKey(p, n)] = el;
                  }}
                  onClick={() => setActive(placeKey(p, n))}
                  className={`w-full text-left rounded-xl p-3 border transition flex items-center gap-3 ${
                    active === placeKey(p, n)
                      ? 'bg-violet-50/90 border-violet-300 shadow-sm'
                      : 'bg-white border-zinc-100 hover:border-zinc-200'
                  }`}
                >
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-xl text-xs font-bold text-white shadow-sm"
                    style={{ background: categoryOf(p.category).ink }}
                  >
                    {n + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-zinc-900">{p.name}</p>
                    <p className="truncate text-[10px] text-zinc-500 mt-0.5">
                      {p.sub || 'Extracted Location'}
                      {p.approximate && ' · approx'}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-zinc-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right Map View */}
        <div className="relative flex-1 min-h-[400px] lg:min-h-[560px]">
          <LocationMap places={places} active={active} onSelect={setActive} live={live} />

          {/* Live tracking toggle. Off by default — the relay only runs on the
              demo machine, so auto-connecting would retry a dead socket.
              Top-right because Leaflet's zoom control owns the top-left. */}
          <div className="absolute right-3 top-3 z-[500] flex items-center gap-2">
            <button
              onClick={() => setTracking((t) => !t)}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-md transition ${
                tracking
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200'
              }`}
              title={RELAY_URL}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  relay === 'live'
                    ? 'bg-emerald-400 animate-pulse'
                    : relay === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : relay === 'error'
                        ? 'bg-red-400'
                        : 'bg-zinc-400'
                }`}
              />
              {tracking ? 'Live location' : 'Track me'}
            </button>
            {tracking && relay !== 'live' && (
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-zinc-500 shadow-sm">
                {relay === 'connecting' ? 'connecting…' : 'relay offline'}
              </span>
            )}
          </div>

          {/* Proximity alert */}
          {alert && (
            <div className="absolute inset-x-3 bottom-3 z-[600] sm:left-auto sm:right-3 sm:w-[320px]">
              <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xl">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-lg">
                  📍
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">
                    You&apos;re nearby
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-zinc-900">{alert.name}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {formatDistance(alert.metres)} away{alert.sub ? ` · ${alert.sub}` : ''}
                  </p>
                  <button
                    onClick={() => {
                      setActive(alert.key);
                      setAlert(null);
                    }}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Show on map →
                  </button>
                </div>
                <button
                  onClick={() => setAlert(null)}
                  aria-label="Dismiss"
                  className="shrink-0 text-zinc-300 hover:text-zinc-500"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM CAROUSEL OF DISCOVERED PLACES */}
      {places.length > 0 && (
        <section className="relative">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Eyebrow>Spot Showcase</Eyebrow>
              <h2 className="text-xl font-bold text-zinc-900">Featured Locations</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {places.slice(0, 4).map((loc, idx) => (
              <div
                key={`${loc.name}-${idx}`}
                className="group rounded-2xl bg-white border border-zinc-100 overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-md transition-all"
              >
                <div className="relative h-28 overflow-hidden bg-zinc-900">
                  <Thumb shortcode={loc.shortcode} category={loc.category} fill />
                  <span
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow-sm"
                    style={{ background: categoryOf(loc.category).ink }}
                  >
                    {categoryOf(loc.category).one}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-zinc-900 truncate">{loc.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate mt-0.5">{loc.sub || 'Saved spot'}</p>
                  <Link
                    href={`/reel/${loc.shortcode}`}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-bold text-violet-700 hover:bg-violet-100 transition"
                  >
                    Open Reel →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export { toPlaces };
