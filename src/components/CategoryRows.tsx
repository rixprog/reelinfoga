'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Thumb } from './Thumb';
import type { SavedItem } from '@/lib/store-client';
import { CATEGORY, CATEGORY_ORDER, type CategoryKey, categoryOf, detailLine } from '@/lib/ui';

/** Per row. Enough to fill a wide viewport without fetching the whole library. */
const PER_ROW = 8;

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : `${n}`;

/**
 * One row per category, each a horizontal strip of reel cards.
 *
 * Rows are horizontally scrolled rather than laid out in a grid because the
 * counts are wildly uneven — a four-column grid holding a single recipe reads
 * as a rendering fault, where a strip of one reads as a strip of one.
 */
export function CategoryRows() {
  const [items, setItems] = useState<SavedItem[] | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/reels', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => live && setItems(d.items ?? []))
      // A landing-page flourish must never surface an error over the rest of
      // the page; an empty library and a failed fetch both render as nothing.
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, []);

  if (!items?.length) return null;

  const rows = CATEGORY_ORDER.map((key) => ({
    key,
    meta: CATEGORY[key],
    reels: items.filter((i) => i.category === key).slice(0, PER_ROW),
  })).filter((r) => r.reels.length > 0);

  if (!rows.length) return null;

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3.5 py-1.5 text-[11px] font-semibold text-purple-600 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
          Your Library
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
          Recently Analyzed
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500 max-w-md mx-auto">
          Every reel you run through ReelInfoga, sorted into its category with the details already
          pulled out.
        </p>
      </div>

      <div className="mt-12 space-y-12">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="flex items-end justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block h-5 w-1.5 rounded-full"
                  style={{ background: row.meta.ink }}
                />
                <h3 className="text-lg font-bold tracking-tight text-zinc-900">
                  {row.meta.label}
                </h3>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ background: row.meta.tint, color: row.meta.ink }}
                >
                  {row.reels.length}
                </span>
              </div>
              <Link
                href={`/reels?category=${row.key}`}
                className="shrink-0 text-xs font-semibold text-primary hover:underline"
              >
                View all →
              </Link>
            </div>

            {/* -mx/px pair lets cards bleed to the screen edge on phones while
                the section keeps its padding on desktop. */}
            <div className="mt-4 -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {row.reels.map((reel) => (
                <ReelCard key={reel.shortcode} reel={reel} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReelCard({ reel }: { reel: SavedItem }) {
  const cat = categoryOf(reel.category);
  const detail = detailLine(reel);

  return (
    <Link
      href={`/reel/${reel.shortcode}`}
      className="group w-[168px] shrink-0 sm:w-[184px]"
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-100 shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
        <Thumb shortcode={reel.shortcode} category={reel.category} fill />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        <span
          className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: cat.tint, color: cat.ink }}
        >
          {cat.one}
        </span>

        {reel.likes != null && (
          <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
              <path d="M12 21s-7.5-4.6-9.6-9A5.4 5.4 0 0 1 12 6.1 5.4 5.4 0 0 1 21.6 12c-2.1 4.4-9.6 9-9.6 9Z" />
            </svg>
            {compact(reel.likes)}
          </span>
        )}
      </div>

      <p className="mt-2.5 line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">
        {reel.title ?? 'Untitled'}
      </p>
      {detail && <p className="mt-1 truncate text-xs text-zinc-500">{detail}</p>}
      {reel.owner && <p className="mt-0.5 truncate text-[11px] text-zinc-400">@{reel.owner}</p>}
    </Link>
  );
}
