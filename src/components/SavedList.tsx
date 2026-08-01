'use client';

import { useEffect, useState } from 'react';

import { TONE_CLASS, TYPE_ICON, countdown, formatDate, href } from '@/lib/deadline';
import { type SavedItem, daysUntil } from '@/lib/store-client';

/**
 * Everything saved so far, deadlines first.
 *
 * `refreshKey` changes when an analysis finishes, which re-fetches so a newly
 * saved reel appears without a manual reload.
 */
export function SavedList({ refreshKey }: { refreshKey: string | null }) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [tab, setTab] = useState<'deadline' | 'food_spot'>('deadline');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reels', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setItems(d.items ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const deadlines = items.filter((i) => i.category === 'deadline');
  const spots = items.filter((i) => i.category === 'food_spot');
  const shown = tab === 'deadline' ? deadlines : spots;

  if (items.length === 0) return null;

  return (
    <section className="mt-14 border-t border-zinc-900 pt-10">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-lg font-semibold">Saved</h2>
        <Tab
          active={tab === 'deadline'}
          onClick={() => setTab('deadline')}
          label={`Deadlines (${deadlines.length})`}
        />
        <Tab
          active={tab === 'food_spot'}
          onClick={() => setTab('food_spot')}
          label={`Food spots (${spots.length})`}
        />
      </div>

      {shown.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">Nothing here yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {shown.map((item) =>
            tab === 'deadline' ? (
              <DeadlineRow key={item.shortcode} item={item} />
            ) : (
              <SpotRow key={item.shortcode} item={item} />
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function DeadlineRow({ item }: { item: SavedItem }) {
  const days = daysUntil(item.deadline_date);
  const cd = countdown(days, item.deadline_passed);
  const link = item.registration_links?.[0];

  return (
    <li
      className={`rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 ${
        cd.tone === 'expired' ? 'opacity-50' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">
            <span className="mr-2">
              {TYPE_ICON[item.opportunity_type ?? 'other'] ?? '📌'}
            </span>
            {item.title ?? 'Untitled'}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {[item.organisation, formatDate(item.deadline_date ?? null)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${TONE_CLASS[cd.tone]}`}
        >
          {cd.text}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {item.deadline_date && (
          <a
            href={`/api/reels/${item.shortcode}/ics`}
            className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-300 hover:bg-zinc-700"
          >
            Calendar
          </a>
        )}
        {link && (
          <a
            href={href(link)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-300 hover:bg-zinc-700"
          >
            Register ↗
          </a>
        )}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md px-2.5 py-1 text-zinc-500 hover:text-zinc-300"
        >
          Reel ↗
        </a>
      </div>
    </li>
  );
}

function SpotRow({ item }: { item: SavedItem }) {
  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="truncate font-medium">🍽️ {item.title ?? 'Unknown place'}</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        {[item.area, item.city].filter(Boolean).join(', ') || 'Location unresolved'}
      </p>
    </li>
  );
}

function Tab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition ${
        active
          ? 'bg-zinc-100 text-zinc-900'
          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  );
}
