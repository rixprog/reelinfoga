'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import type { Place } from './MapView';

const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-slate-50 text-xs text-zinc-400">
      Loading map…
    </div>
  ),
});

/**
 * The pins belonging to one reel.
 *
 * Coordinates are not in the stored payload — the extractor records
 * area/city/state and /api/places is what turns those into lat/lon. So this
 * asks for the whole set and keeps its own, rather than duplicating geocoding
 * that already exists on the server.
 */
export function PlaceMap({ shortcode }: { shortcode: string }) {
  const [places, setPlaces] = useState<Place[] | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/places', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        setPlaces((d.places ?? []).filter((p: Place) => p.shortcode === shortcode));
      })
      .catch(() => live && setPlaces([]));
    return () => {
      live = false;
    };
  }, [shortcode]);

  // Geocoding can legitimately fail; a missing map beats an empty grey box.
  if (!places?.length) return null;

  const approximate = places.some((p) => p.approximate);

  return (
    <div>
      <div className="h-[260px] overflow-hidden rounded-2xl border border-zinc-200">
        <LocationMap places={places} active={null} onSelect={() => {}} />
      </div>
      {approximate && (
        <p className="mt-2 text-xs text-[#B45309]">
          Approximate — this is the surrounding area, not the exact venue.
        </p>
      )}
    </div>
  );
}
