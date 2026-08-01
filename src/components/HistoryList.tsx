'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Card, Empty, Eyebrow, Pill } from './Shell';
import { Thumb } from './Thumb';
import type { SavedItem } from '@/lib/store-client';
import { categoryOf } from '@/lib/ui';

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Earlier';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const then = new Date(d);
  then.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - then.getTime()) / 86_400_000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
}

export function HistoryList() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [q, setQ] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/reels', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoaded(true));
  }, []);

  // Plain substring filtering, not the semantic endpoint: here the user is
  // scanning a log they already know, not trying to remember something.
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = [...items]
      .filter(
        (i) =>
          !term ||
          [i.title, i.owner, i.category, (i.payload as any)?.search_summary]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(term)),
      )
      .sort((a, b) => (b.saved_at ?? '').localeCompare(a.saved_at ?? ''));

    const map = new Map<string, SavedItem[]>();
    for (const i of list) {
      const k = dayLabel(i.saved_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    }
    return [...map.entries()];
  }, [items, q]);

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search your history"
        className="w-full rounded-full border border-line bg-surface px-5 py-3 text-sm
                   outline-none placeholder:text-ink-faint focus:border-primary/50"
      />

      {loaded && groups.length === 0 && (
        <div className="mt-6">
          <Empty title="Nothing here" body="Analyzed reels appear here as a running log." />
        </div>
      )}

      <div className="mt-8 space-y-8">
        {groups.map(([day, list]) => (
          <section key={day}>
            <div className="flex items-center gap-3">
              <Eyebrow>{day}</Eyebrow>
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="mt-3 space-y-2">
              {list.map((i) => {
                const p = i.payload as Record<string, any>;
                const time = new Date(i.saved_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                });
                return (
                  <Card key={i.shortcode} className="p-4">
                    <div className="flex gap-4">
                      <span className="tnum hidden w-11 shrink-0 pt-0.5 text-xs text-ink-faint sm:block">
                        {time}
                      </span>
                      <Thumb shortcode={i.shortcode} category={i.category} size={48} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-semibold">{i.title ?? 'Untitled'}</p>
                          <Pill>{categoryOf(i.category).one}</Pill>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                          {p?.search_summary || p?.summary || p?.description || 'No summary'}
                        </p>
                        {/* The only screen that reports what the SYSTEM did, so
                            run details belong here and nowhere else. Kept quiet. */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint">
                          <span className="sm:hidden">{time}</span>
                          {i.owner && <span>@{i.owner}</span>}
                          {i.language && <span>{i.language.toUpperCase()}</span>}
                          {i.model && <span>{i.model}</span>}
                          <Link
                            href={`/reel/${i.shortcode}`}
                            className="font-semibold text-primary"
                          >
                            View more →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
