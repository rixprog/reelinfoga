'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { Place } from './MapView';
import { formatDistance, metresBetween } from '@/lib/geo';
import { liveTracking } from '@/lib/collections';
import { useLiveLocation } from '@/lib/use-live-location';

/** Alert when the phone comes within this of a saved food spot. */
const NEAR_M = 10_000;
/** Must get this far back out before the same place can alert again. */
const CLEAR_M = 15_000;
const ALERT_CATEGORIES = new Set(['food_spot']);

function notify(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag: 'reelinfoga-nearby' });
  } catch {
    // Some browsers only allow notifications from a service worker.
  }
}

/**
 * Watches the phone's position on every page, not just the map.
 *
 * Lives in the layout because the alert is the point of the feature: someone
 * walking past a saved restaurant is not sitting on /map with it open, and
 * previously the watch was mounted inside MapView, so navigating anywhere else
 * silently tore the socket down.
 */
export function ProximityWatch() {
  const [on, setOn] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [alert, setAlert] = useState<{ name: string; sub: string; metres: number } | null>(null);
  const announced = useRef<Set<string>>(new Set());

  // Tracking is toggled from the map; this keeps the two in step across pages.
  useEffect(() => {
    const sync = () => setOn(liveTracking.get());
    sync();
    window.addEventListener('reelbrain:store', sync);
    return () => window.removeEventListener('reelbrain:store', sync);
  }, []);

  const { position: live } = useLiveLocation(on);

  useEffect(() => {
    if (!on) return;
    let alive = true;
    fetch('/api/places', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => alive && setPlaces(d.places ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [on]);

  useEffect(() => {
    if (!live || !places.length) return;
    let best: { p: Place; d: number } | null = null;

    for (const p of places) {
      if (!ALERT_CATEGORIES.has(p.category)) continue;
      const key = `${p.name}|${p.lat.toFixed(4)}`;
      const d = metresBetween({ lat: live.lat, lon: live.lon }, { lat: p.lat, lon: p.lon });
      if (d > CLEAR_M) announced.current.delete(key);
      if (d <= NEAR_M && !announced.current.has(key)) {
        if (!best || d < best.d) best = { p, d };
      }
    }

    if (best) {
      const hit = best as { p: Place; d: number };
      announced.current.add(`${hit.p.name}|${hit.p.lat.toFixed(4)}`);
      setAlert({ name: hit.p.name, sub: hit.p.sub, metres: hit.d });
      notify(`${hit.p.name} is nearby`, `${formatDistance(hit.d)} away — tap to explore`);
    }
  }, [live, places]);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 12_000);
    return () => clearTimeout(t);
  }, [alert]);

  if (!alert) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[900] w-[320px] max-w-[calc(100vw-2rem)] sm:bottom-6">
      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-white p-3.5 shadow-2xl">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-lg">📍</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">
            Food spot nearby
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-zinc-900">{alert.name}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {formatDistance(alert.metres)} away{alert.sub ? ` · ${alert.sub}` : ''}
          </p>
          <Link
            href="/map"
            onClick={() => setAlert(null)}
            className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline"
          >
            Explore on map →
          </Link>
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
  );
}
