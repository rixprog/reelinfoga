'use client';

import { PLACE_ICON, type TravelExtraction } from '@/lib/deadline';

export function TravelCard({ t }: { t: TravelExtraction }) {
  if (!t.is_travel_content) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="text-xl font-semibold">No places found</h2>
        <p className="mt-2 text-sm text-zinc-500">{t.reasoning}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h2 className="text-2xl font-semibold">
        🗺️ {t.destination ?? 'Unknown destination'}
      </h2>
      {t.state && <p className="mt-1 text-zinc-400">{t.state}</p>}
      {t.summary && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{t.summary}</p>
      )}
      {t.best_season && (
        <p className="mt-2 text-xs text-zinc-500">Best season: {t.best_season}</p>
      )}

      <p className="mt-6 text-xs uppercase tracking-wide text-zinc-500">
        {t.places.length} place{t.places.length === 1 ? '' : 's'} found
      </p>
      <ul className="mt-3 space-y-3">
        {t.places.map((p) => (
          <li
            key={p.name}
            className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">
                <span className="mr-2">{PLACE_ICON[p.place_type] ?? '📍'}</span>
                {p.name}
              </p>
              <span className="text-xs text-zinc-500">
                {[
                  p.duration_minutes ? `~${p.duration_minutes} min` : null,
                  p.best_time_of_day,
                  p.entry_fee,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            {p.description && (
              <p className="mt-1 text-sm text-zinc-400">{p.description}</p>
            )}
            {p.tips && (
              <p className="mt-1 text-xs text-emerald-400/80">Tip: {p.tips}</p>
            )}
          </li>
        ))}
      </ul>

      {/* These places feed the planner below, so say so — otherwise the two
          sections look unrelated. */}
      <p className="mt-5 text-xs text-zinc-500">
        Added to your {t.destination} trip. Build an itinerary in the travel
        planner below.
      </p>
    </div>
  );
}
