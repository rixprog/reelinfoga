'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Card, Empty, Eyebrow } from './Shell';
import { Thumb } from './Thumb';
import { type Collection, collections, starred } from '@/lib/collections';
import type { SavedItem } from '@/lib/store-client';
import { categoryOf, detailLine } from '@/lib/ui';

export function SavedView() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [cols, setCols] = useState<Collection[]>([]);
  const [stars, setStars] = useState<string[]>([]);

  const sync = useCallback(() => {
    setCols(collections.all());
    setStars(starred.all());
  }, []);

  useEffect(() => {
    fetch('/api/reels', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));
    sync();
    window.addEventListener('reelbrain:store', sync);
    return () => window.removeEventListener('reelbrain:store', sync);
  }, [sync]);

  const byCode = new Map(items.map((i) => [i.shortcode, i]));
  const starredItems = stars.map((s) => byCode.get(s)).filter(Boolean) as SavedItem[];

  if (!cols.length && !starredItems.length) {
    return (
      <Empty
        title="Nothing saved yet"
        body="Star a reel, or group reels into a collection from the Reels tab, and they'll gather here as your shortlist."
        action={
          <Link
            href="/reels"
            className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            Browse reels
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-10">
      {starredItems.length > 0 && (
        <section>
          <Eyebrow>Starred</Eyebrow>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {starredItems.map((i) => (
              <Link key={i.shortcode} href={`/reel/${i.shortcode}`}>
                <Card className="flex items-center gap-4 p-4 transition hover:border-primary/30">
                  <Thumb shortcode={i.shortcode} category={i.category} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{i.title ?? 'Untitled'}</p>
                    <p className="truncate text-sm text-ink-muted">{detailLine(i)}</p>
                  </div>
                  <span className="text-primary">★</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {cols.length > 0 && (
        <section>
          <Eyebrow>Collections</Eyebrow>
          {/* The only screen with large cards. Everywhere else is dense, so this
              reads as the shortlist rather than another archive. */}
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cols.map((c) => (
              <Link key={c.id} href={`/saved/${c.id}`} className="group">
                <div className="flex h-40 gap-1 overflow-hidden rounded-2xl bg-background">
                  {c.shortcodes.slice(0, 3).map((sc) => (
                    <div key={sc} className="relative flex-1">
                      <Thumb shortcode={sc} category={byCode.get(sc)?.category} fill />
                    </div>
                  ))}
                  {!c.shortcodes.length && (
                    <div className="grid flex-1 place-items-center text-sm text-ink-faint">
                      Empty collection
                    </div>
                  )}
                </div>
                <div className="mt-2.5 flex items-baseline justify-between gap-2">
                  <p className="truncate font-semibold">{c.name}</p>
                  <span className="shrink-0 text-xs text-ink-faint">
                    {c.shortcodes.length} reels
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function CollectionHeader({ id }: { id: string }) {
  const [c, setC] = useState<Collection | null>(null);
  useEffect(() => {
    setC(collections.all().find((x) => x.id === id) ?? null);
  }, [id]);
  if (!c) return null;
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <Link href="/saved" className="text-sm font-semibold text-primary">
        ← Saved
      </Link>
      <button
        onClick={() => {
          if (window.confirm(`Delete the collection "${c.name}"? The reels stay.`)) {
            collections.remove(c.id);
            window.location.href = '/saved';
          }
        }}
        className="text-xs font-semibold text-ink-faint hover:text-[#DC2626]"
      >
        Delete collection
      </button>
    </div>
  );
}
