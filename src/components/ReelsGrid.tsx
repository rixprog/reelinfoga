'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Card, Empty, Eyebrow, Pill } from './Shell';
import { Thumb } from './Thumb';
import { type Collection, collections, starred } from '@/lib/collections';
import type { SavedItem } from '@/lib/store-client';
import { CATEGORY_ORDER, categoryOf, detailLine } from '@/lib/ui';

interface Hit {
  shortcode: string;
  matched: { semantic?: number; keyword?: number };
}

export function ReelsGrid({ collectionId }: { collectionId?: string }) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [conf, setConf] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [cols, setCols] = useState<Collection[]>([]);
  const [stars, setStars] = useState<string[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncLocal = useCallback(() => {
    setCols(collections.all());
    setStars(starred.all());
  }, []);

  useEffect(() => {
    fetch('/api/reels', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
    syncLocal();
    window.addEventListener('reelbrain:store', syncLocal);
    return () => window.removeEventListener('reelbrain:store', syncLocal);
  }, [syncLocal]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) {
      setHits(null);
      return;
    }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=40`, {
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

  const activeCollection = cols.find((c) => c.id === collectionId);

  const shown = useMemo(() => {
    let list = items;
    if (activeCollection) {
      list = list.filter((i) => activeCollection.shortcodes.includes(i.shortcode));
    }
    if (cats.size) list = list.filter((i) => cats.has(i.category));
    if (conf.size) list = list.filter((i) => conf.has(i.confidence ?? 'low'));
    if (hits) {
      // Search decides the ORDER, filters decide membership — so a filtered
      // search still comes back ranked rather than in save order.
      const rank = new Map(hits.map((h, n) => [h.shortcode, n]));
      list = list
        .filter((i) => rank.has(i.shortcode))
        .sort((a, b) => rank.get(a.shortcode)! - rank.get(b.shortcode)!);
    } else {
      list = [...list].sort((a, b) => (b.saved_at ?? '').localeCompare(a.saved_at ?? ''));
    }
    return list;
  }, [items, cats, conf, hits, activeCollection]);

  const filterCount = cats.size + conf.size;

  function toggle(set: Set<string>, v: string, fn: (s: Set<string>) => void) {
    const next = new Set(set);
    next.has(v) ? next.delete(v) : next.add(v);
    fn(next);
  }

  function addPickedTo(id: string) {
    collections.addTo(id, [...picked]);
    setPicked(new Set());
    setSelecting(false);
  }

  return (
    <div>
      <div className="flex gap-2.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by meaning — that biryani place, cheap earphones"
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-5 py-3
                     text-sm outline-none placeholder:text-ink-faint focus:border-primary/50"
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          aria-label="Filters"
          className={`relative grid size-11 shrink-0 place-items-center rounded-full border
                      transition ${
                        filterCount || showFilters
                          ? 'border-primary/40 bg-primary-soft'
                          : 'border-line bg-surface hover:border-ink-faint'
                      }`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.7" strokeLinecap="round"
               className={filterCount || showFilters ? 'text-primary' : 'text-ink-muted'}>
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          {filterCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center
                             rounded-full bg-primary text-[9px] font-bold text-white">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <Card className="mt-3 p-4">
          <div className="flex flex-wrap gap-6">
            <div>
              <Eyebrow>Category</Eyebrow>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CATEGORY_ORDER.map((k) => (
                  <button
                    key={k}
                    onClick={() => toggle(cats, k, setCats)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      cats.has(k)
                        ? 'bg-primary text-white'
                        : 'border border-line text-ink-muted hover:text-ink'
                    }`}
                  >
                    {categoryOf(k).one}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Eyebrow>Confidence</Eyebrow>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {['high', 'medium', 'low'].map((k) => (
                  <button
                    key={k}
                    onClick={() => toggle(conf, k, setConf)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                      conf.has(k)
                        ? 'bg-primary text-white'
                        : 'border border-line text-ink-muted hover:text-ink'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {filterCount > 0 && (
            <button
              onClick={() => {
                setCats(new Set());
                setConf(new Set());
              }}
              className="mt-4 text-xs font-semibold text-primary"
            >
              Clear filters
            </button>
          )}
        </Card>
      )}

      {!collectionId && cols.length > 0 && (
        <section className="mt-8">
          <Eyebrow>Collections</Eyebrow>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {cols.map((c) => (
              <Link
                key={c.id}
                href={`/saved/${c.id}`}
                className="w-40 shrink-0"
              >
                <div className="flex h-24 gap-0.5 overflow-hidden rounded-xl bg-background">
                  {c.shortcodes.slice(0, 3).map((sc) => (
                    <div key={sc} className="relative flex-1">
                      <Thumb shortcode={sc} fill />
                    </div>
                  ))}
                  {c.shortcodes.length === 0 && (
                    <div className="grid flex-1 place-items-center text-xs text-ink-faint">
                      Empty
                    </div>
                  )}
                </div>
                <p className="mt-1.5 truncate text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-ink-faint">{c.shortcodes.length} reels</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Eyebrow>
          {searching
            ? 'Searching…'
            : activeCollection
              ? activeCollection.name
              : q
                ? `${shown.length} results`
                : `All reels · ${shown.length}`}
        </Eyebrow>

        {items.length > 0 && (
          <div className="flex items-center gap-3">
            {selecting && picked.size > 0 && (
              <select
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  if (v === '__new') {
                    const name = window.prompt('Collection name');
                    if (name) collections.create(name, [...picked]);
                    setPicked(new Set());
                    setSelecting(false);
                  } else addPickedTo(v);
                }}
                defaultValue=""
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs"
              >
                <option value="">Add {picked.size} to…</option>
                {cols.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__new">+ New collection</option>
              </select>
            )}
            <button
              onClick={() => {
                setSelecting((v) => !v);
                setPicked(new Set());
              }}
              className="text-xs font-semibold text-primary"
            >
              {selecting ? 'Cancel' : 'Select'}
            </button>
          </div>
        )}
      </div>

      {!loading && shown.length === 0 && (
        <div className="mt-4">
          <Empty
            title={q ? 'Nothing matched' : 'No reels yet'}
            body={
              q
                ? 'Try fewer words, or a different phrasing — search works on meaning, not exact terms.'
                : 'Analyze a reel and it will show up here.'
            }
          />
        </div>
      )}

      {/* Dense 9:16 grid: the photography IS the interface, so the chrome nearly
          disappears. A permanent caption block under every tile would kill it. */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {shown.map((item) => {
          const isPicked = picked.has(item.shortcode);
          const inner = (
            <>
              <Thumb shortcode={item.shortcode} category={item.category} fill />
              <span
                className="absolute left-2 top-2 size-2 rounded-full ring-2 ring-white/70"
                style={{ background: categoryOf(item.category).ink }}
              />
              {stars.includes(item.shortcode) && (
                <span className="absolute right-2 top-2 text-[13px] leading-none text-white drop-shadow">
                  ★
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8 opacity-0 transition group-hover:opacity-100">
                <span className="line-clamp-2 text-[11px] font-medium leading-tight text-white">
                  {item.title ?? 'Untitled'}
                </span>
              </span>
              {selecting && (
                <span
                  className={`absolute inset-0 border-[3px] transition ${
                    isPicked ? 'border-primary bg-primary/15' : 'border-transparent'
                  }`}
                />
              )}
            </>
          );

          return selecting ? (
            <button
              key={item.shortcode}
              onClick={() => toggle(picked, item.shortcode, setPicked)}
              className="group relative aspect-[9/16] overflow-hidden rounded-xl bg-background text-left"
            >
              {inner}
            </button>
          ) : (
            <Link
              key={item.shortcode}
              href={`/reel/${item.shortcode}`}
              className="group relative aspect-[9/16] overflow-hidden rounded-xl bg-background"
            >
              {inner}
            </Link>
          );
        })}
      </div>

      {/* Mobile has no hover, so titles need a list underneath the grid. */}
      {shown.length > 0 && (
        <div className="mt-8 space-y-2 sm:hidden">
          <Eyebrow>Titles</Eyebrow>
          {shown.slice(0, 12).map((i) => (
            <Link key={i.shortcode} href={`/reel/${i.shortcode}`}>
              <Card className="flex items-center gap-3 p-3">
                <Thumb shortcode={i.shortcode} category={i.category} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{i.title ?? 'Untitled'}</p>
                  <p className="truncate text-xs text-ink-muted">{detailLine(i)}</p>
                </div>
                <Pill>{categoryOf(i.category).one}</Pill>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
