'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

import type { RouteStop } from './ItineraryMap';

// Leaflet touches `window` at import time, so the map can never be server
// rendered. ssr:false is required, not a preference.
const ItineraryMap = dynamic(() => import('./ItineraryMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 text-sm text-zinc-600">
      Loading map…
    </div>
  ),
});

interface PlanItem {
  time: string;
  stop_name: string;
  note: string;
}
interface PlanDay {
  day: number;
  theme: string;
  items: PlanItem[];
}
interface Itinerary {
  destination: string;
  state: string | null;
  best_season: string | null;
  plan: { title: string; overview: string; days: PlanDay[]; tips: string[] };
  route: RouteStop[];
  unlocated: string[];
}

const DAY_COLOURS = ['#38bdf8', '#f472b6', '#4ade80', '#fbbf24', '#a78bfa'];

export function TravelPlanner({ refreshKey }: { refreshKey: string | null }) {
  const [destinations, setDestinations] = useState<{ name: string; stops: number }[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [days, setDays] = useState(1);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDestinations = useCallback(async () => {
    try {
      const r = await fetch('/api/itinerary', { cache: 'no-store' });
      const d = await r.json();
      setDestinations(d.destinations ?? []);
      setSelected((cur) => cur || d.destinations?.[0]?.name || '');
    } catch {
      /* nothing saved yet is a normal state, not an error */
    }
  }, []);

  useEffect(() => {
    loadDestinations();
  }, [loadDestinations, refreshKey]);

  async function build() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    setItinerary(null);
    try {
      const r = await fetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: selected, days }),
      });
      const d = await r.json();
      if (!r.ok) setError(d.error ?? 'Could not build the itinerary.');
      else setItinerary(d);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  if (destinations.length === 0) return null;

  return (
    <section className="mt-14 border-t border-zinc-900 pt-10">
      <h2 className="text-lg font-semibold">Travel planner</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Your saved travel reels, grouped by destination and ordered into a route.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
        >
          {destinations.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name} ({d.stops} places)
            </option>
          ))}
        </select>

        <div className="flex gap-1">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setDays(n)}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                days === n
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {n} day{n > 1 ? 's' : ''}
            </button>
          ))}
        </div>

        <button
          onClick={build}
          disabled={busy}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900
                     hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {busy ? 'Planning…' : 'Plan trip'}
        </button>
      </div>

      {busy && (
        <p className="mt-3 text-xs text-zinc-600">
          Geocoding each place against OpenStreetMap (rate-limited to 1/sec), then
          writing the plan — first run for a destination takes a few seconds longer.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {itinerary && (
        <div className="mt-6 space-y-4">
          <ItineraryMap stops={itinerary.route} />

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h3 className="text-xl font-semibold">{itinerary.plan.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {itinerary.plan.overview}
            </p>
            {itinerary.best_season && (
              <p className="mt-2 text-xs text-zinc-500">
                Best season: {itinerary.best_season}
              </p>
            )}

            {itinerary.plan.days.map((d) => (
              <div key={d.day} className="mt-6">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ background: DAY_COLOURS[(d.day - 1) % DAY_COLOURS.length] }}
                  />
                  <p className="text-sm font-medium">
                    Day {d.day} — {d.theme}
                  </p>
                </div>
                <ul className="mt-3 space-y-3 border-l border-zinc-800 pl-4">
                  {d.items.map((it, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex gap-3">
                        <span className="w-12 shrink-0 tabular-nums text-zinc-500">
                          {it.time}
                        </span>
                        <div>
                          <span className="text-zinc-100">{it.stop_name}</span>
                          <p className="mt-0.5 text-zinc-500">{it.note}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {itinerary.plan.tips.length > 0 && (
              <div className="mt-6 border-t border-zinc-800 pt-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Tips</p>
                <ul className="mt-2 space-y-1">
                  {itinerary.plan.tips.map((t, i) => (
                    <li key={i} className="text-sm text-zinc-400">
                      · {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Places OSM had no record of. Naming them beats dropping them
                silently — the user knows the place exists and would wonder. */}
            {itinerary.unlocated.length > 0 && (
              <p className="mt-6 text-xs text-amber-500/80">
                Not on the map (not found in OpenStreetMap):{' '}
                {itinerary.unlocated.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
