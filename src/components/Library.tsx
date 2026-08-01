'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Analyse } from './Analyse';
import { Card, Empty, Eyebrow, Pill } from './Shell';
import { Thumb } from './Thumb';
import type { SavedItem } from '@/lib/store-client';
import {
  CATEGORY_ORDER,
  categoryOf,
  countdown,
  daysUntil,
  detailLine,
} from '@/lib/ui';

interface Hit {
  shortcode: string;
  title: string | null;
  category: string;
  owner: string | null;
  snippet: string;
  matched: { semantic?: number; keyword?: number };
}

export function Library() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/reels', { cache: 'no-store' });
      const d = await r.json();
      setItems(d.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced — each keystroke would otherwise embed the query server-side.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) {
      setHits(null);
      return;
    }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=12`, {
          cache: 'no-store',
        });
        const d = await r.json();
        setHits(d.results ?? []);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 550);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q]);

  const groups = CATEGORY_ORDER.map((k) => ({
    key: k,
    list: items.filter((i) => i.category === k),
  }))
    // Filter BEFORE deriving a cover: an empty category has no list[0].
    .filter((g) => g.list.length > 0)
    .map(({ key: k, list }) => {
    return {
      key: k,
      meta: categoryOf(k),
      list,
      // Prefer a cover that actually has an image. Media is purged after
      // extraction and JSON-seeded rows never had any, so picking list[0]
      // blindly leaves some collections as a flat tint.
      cover: (list.find((i) => (i as { thumbnail?: string | null }).thumbnail) ?? list[0])
        .shortcode,
    };
  });

  const closing = items.filter((i) => {
    const d = daysUntil(i.deadline_date);
    return d !== null && d >= 0 && d <= 7;
  });

  const shown =
    filter === 'all' ? items : items.filter((i) => i.category === filter);
  const recent = [...shown].sort((a, b) =>
    (b.saved_at ?? '').localeCompare(a.saved_at ?? ''),
  );

  return (
    <div className="space-y-10">
      <Analyse onDone={load} />

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search everything you've saved — by meaning, not just keywords"
        className="w-full rounded-full border border-line bg-surface px-5 py-3 text-sm
                   outline-none placeholder:text-ink-faint focus:border-primary/50"
      />

      {q && (
        <section>
          <Eyebrow>
            {searching ? 'Searching…' : `${hits?.length ?? 0} results`}
          </Eyebrow>
          <div className="mt-3 space-y-2">
            {hits?.map((h) => (
              <Link key={h.shortcode} href={`/reel/${h.shortcode}`}>
                <Card className="flex gap-4 p-4 transition hover:border-primary/30">
                  <Thumb shortcode={h.shortcode} category={h.category} size={68} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{h.title ?? 'Untitled'}</p>
                      <Pill>{categoryOf(h.category).one}</Pill>
                    </div>
                    {h.snippet && (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                        {h.snippet}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-ink-faint">
                      {[
                        h.owner && `@${h.owner}`,
                        // Showing which arm matched makes the hybrid legible
                        // rather than magic.
                        h.matched.semantic !== undefined &&
                          `meaning ${h.matched.semantic.toFixed(2)}`,
                        h.matched.keyword !== undefined &&
                          `keyword ${h.matched.keyword.toFixed(1)}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
            {hits?.length === 0 && !searching && (
              <p className="text-sm text-ink-muted">Nothing matched.</p>
            )}
          </div>
        </section>
      )}

      {!q && closing.length > 0 && (
        <Link href="/alerts">
          <Card edge="var(--amber)" className="flex items-center gap-4 p-5">
            <div className="flex-1">
              <p className="eyebrow text-[var(--amber)]">Closing this week</p>
              <p className="mt-1 text-base font-semibold">
                {closing.length} deadline{closing.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex">
              {closing.slice(0, 3).map((i, n) => (
                <span key={i.shortcode} className={n ? '-ml-4' : ''}>
                  <Thumb shortcode={i.shortcode} category="deadline" size={40} />
                </span>
              ))}
            </div>
          </Card>
        </Link>
      )}

      {!q && !loading && items.length === 0 && (
        <Empty
          title="Nothing saved yet"
          body="Paste an Instagram reel link above. We'll watch it, read the on-screen text, listen to the audio, and pull out what actually matters."
        />
      )}

      {!q && groups.length > 0 && (
        <section>
          <Eyebrow>Collections</Eyebrow>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {groups.map(({ key, meta, list, cover }) => (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? 'all' : key)}
                className={`group relative aspect-[3/4] overflow-hidden rounded-2xl text-left
                            ring-offset-2 transition ${
                              filter === key ? 'ring-2 ring-primary' : ''
                            }`}
              >
                <span
                  className="absolute inset-0"
                  style={{ background: meta.tint }}
                />
                <Thumb shortcode={cover} category={key} fill />
                {/* Scrim, so white label text survives a bright photo. */}
                <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-3">
                  <span className="block text-sm font-bold text-white">
                    {meta.label}
                  </span>
                  <span className="block text-xs text-white/80">
                    {list.length} {list.length === 1 ? 'reel' : 'reels'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!q && recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <Eyebrow>
              {filter === 'all' ? 'Recently saved' : categoryOf(filter).label}
            </Eyebrow>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-xs font-semibold text-primary"
              >
                Show all
              </button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recent.map((item) => {
              const d = daysUntil(item.deadline_date);
              const cd = countdown(d, item.deadline_passed);
              return (
                <Link key={item.shortcode} href={`/reel/${item.shortcode}`}>
                  <Card className="flex items-center gap-4 p-4 transition hover:border-primary/30">
                    <Thumb shortcode={item.shortcode} category={item.category} size={56} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {item.title ?? 'Untitled'}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-ink-muted">
                        {detailLine(item)}
                      </p>
                    </div>
                    {item.category === 'deadline' && d !== null && d >= 0 && d <= 7 && (
                      <Pill tone={cd.tone}>{d === 0 ? 'Today' : `${d}d`}</Pill>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
