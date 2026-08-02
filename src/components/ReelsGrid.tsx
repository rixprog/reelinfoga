'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ReelPlayerModal } from './ReelPlayer';
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
  const [playing, setPlaying] = useState<string | null>(null);
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

  function toggleStar(shortcode: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    starred.toggle(shortcode);
    syncLocal();
  }

  function addPickedTo(id: string) {
    collections.addTo(id, [...picked]);
    setPicked(new Set());
    setSelecting(false);
  }

  const totalReels = items.length;
  const categoriesCount = useMemo(() => new Set(items.map((i) => i.category)).size, [items]);
  const placesCount = useMemo(() => items.filter((i) => {
    const p = i.payload as Record<string, any>;
    return p?.lat || p?.place_name || p?.location;
  }).length, [items]);
  const productsCount = useMemo(() => items.filter((i) => {
    const p = i.payload as Record<string, any>;
    return p?.product_category || p?.products?.length;
  }).length, [items]);

  const mostCommonCat = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
    let top = 'food_spot';
    let max = 0;
    Object.entries(counts).forEach(([k, v]) => { if (v > max) { max = v; top = k; } });
    return categoryOf(top).one;
  }, [items]);

  return (
    <div className="w-full space-y-8 text-zinc-900 font-sans pb-12">
      <ReelPlayerModal shortcode={playing} onClose={() => setPlaying(null)} />

      {/* 1. HERO BANNER & STATS CARDS */}
      {!collectionId && (
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#FAF8FF] via-[#F4EFFF] to-[#F8F6FF] p-6 sm:p-10 shadow-sm border border-purple-100/80">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/90 px-4 py-1.5 text-xs font-semibold text-violet-700 shadow-sm backdrop-blur-sm mb-3">
              <span className="h-2 w-2 rounded-full bg-violet-600 animate-pulse" />
              Instagram Reel Library
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900">
              Reel Collection Dashboard
            </h1>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-600">
              Search by meaning, filter by AI confidence, organize into custom collections, and explore your analyzed reels.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 relative z-10">
            {[
              { label: 'Total Reels', value: totalReels, icon: '🎬' },
              { label: 'Categories', value: categoriesCount, icon: '🏷️' },
              { label: 'Saved Places', value: placesCount, icon: '📍' },
              { label: 'Products Found', value: productsCount, icon: '🛒' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-purple-100 bg-white/80 p-4 backdrop-blur-md shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500">{stat.label}</span>
                  <span className="text-base">{stat.icon}</span>
                </div>
                <p className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 tnum">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. FLOATING GLASS SEARCH & FILTER BAR */}
      <section className="relative z-20">
        <div className="rounded-2xl bg-white/90 backdrop-blur-xl border border-purple-100/80 p-2.5 shadow-lg shadow-purple-900/5 flex items-center gap-2.5">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by meaning — that biryani place, cheap earphones, Bali resort..."
              className="w-full rounded-xl bg-slate-50/70 pl-11 pr-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Filters"
            className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold transition shadow-sm ${
              filterCount || showFilters
                ? 'bg-violet-600 text-white shadow-purple-500/20'
                : 'bg-slate-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            <span>Filters</span>
            {filterCount > 0 && (
              <span className="grid size-4 place-items-center rounded-full bg-white text-[9px] font-extrabold text-violet-700">
                {filterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 rounded-2xl bg-white border border-purple-100 p-5 shadow-xl animate-fade-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Eyebrow>Category</Eyebrow>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {CATEGORY_ORDER.map((k) => (
                    <button
                      key={k}
                      onClick={() => toggle(cats, k, setCats)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        cats.has(k)
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-violet-50/80 border border-violet-100 text-violet-700 hover:bg-violet-100'
                      }`}
                    >
                      {categoryOf(k).one}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Eyebrow>AI Confidence</Eyebrow>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {['high', 'medium', 'low'].map((k) => (
                    <button
                      key={k}
                      onClick={() => toggle(conf, k, setConf)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        conf.has(k)
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-slate-50 border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      {k} confidence
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {filterCount > 0 && (
              <div className="mt-4 pt-3 border-t border-zinc-100 flex justify-end">
                <button
                  onClick={() => {
                    setCats(new Set());
                    setConf(new Set());
                  }}
                  className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. COLLECTIONS CAROUSEL */}
      {!collectionId && cols.length > 0 && (
        <section className="relative">
          <div className="flex items-center justify-between mb-3">
            <Eyebrow>Collections ({cols.length})</Eyebrow>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {cols.map((c) => (
              <Link
                key={c.id}
                href={`/reels/collection/${c.id}`}
                className="group w-44 shrink-0 rounded-2xl bg-white border border-zinc-100 p-2.5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-24 gap-0.5 overflow-hidden rounded-xl bg-slate-100">
                  {c.shortcodes.slice(0, 3).map((sc) => (
                    <div key={sc} className="relative flex-1">
                      <Thumb shortcode={sc} fill />
                    </div>
                  ))}
                  {c.shortcodes.length === 0 && (
                    <div className="grid flex-1 place-items-center text-xs text-zinc-400">
                      Empty
                    </div>
                  )}
                </div>
                <div className="mt-2 px-1">
                  <p className="truncate text-xs font-bold text-zinc-900 group-hover:text-violet-600">{c.name}</p>
                  <p className="text-[10px] text-zinc-400">{c.shortcodes.length} reels</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. MAIN CONTENT & SIDEBAR GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Dense 9:16 Grid */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between">
            <Eyebrow>
              {searching
                ? 'Searching…'
                : activeCollection
                  ? activeCollection.name
                  : q
                    ? `${shown.length} results found`
                    : `All Reels (${shown.length})`}
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
                    className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm"
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
                  className="text-xs font-semibold text-violet-600 hover:text-violet-700"
                >
                  {selecting ? 'Cancel' : 'Select'}
                </button>
              </div>
            )}
          </div>

          {!loading && shown.length === 0 && (
            <div className="mt-4">
              <Empty
                title={q ? 'Nothing matched' : 'No reels saved yet'}
                body={
                  q
                    ? 'Try typing keywords like pizza, beach resort, or recipe — search works on meaning!'
                    : 'Analyze any Instagram reel URL on the Home page and it will show up here.'
                }
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {shown.map((item) => {
              const isPicked = picked.has(item.shortcode);
              const isStarred = stars.includes(item.shortcode);
              const cat = categoryOf(item.category);

              const inner = (
                <>
                  <Thumb shortcode={item.shortcode} category={item.category} fill />
                  
                  <span
                    className="absolute left-2.5 top-2.5 size-2.5 rounded-full ring-2 ring-white/80 shadow-sm"
                    style={{ background: cat.ink }}
                  />

                  <button
                    onClick={(e) => toggleStar(item.shortcode, e)}
                    className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/40 backdrop-blur-sm text-white transition hover:scale-110 hover:bg-black/60"
                  >
                    <span className={`text-[12px] ${isStarred ? 'text-amber-400' : 'text-white/80'}`}>
                      {isStarred ? '★' : '☆'}
                    </span>
                  </button>

                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <span className="line-clamp-2 text-xs font-bold leading-snug text-white">
                      {item.title ?? 'Untitled Reel'}
                    </span>
                    <span className="mt-1 flex items-center justify-between text-[10px] text-zinc-300">
                      <span className="rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 font-medium text-white">
                        {cat.one}
                      </span>
                      {item.confidence && (
                        <span className="capitalize text-purple-300 font-medium">
                          {item.confidence}
                        </span>
                      )}
                    </span>
                  </span>

                  {!selecting && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Play reel"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPlaying(item.shortcode);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setPlaying(item.shortcode);
                        }
                      }}
                      className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    >
                      <span className="grid size-11 place-items-center rounded-full bg-white/95 text-violet-600 shadow-xl shadow-black/20 hover:scale-110 transition-transform">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5.2v13.6a.6.6 0 0 0 .92.5l10.6-6.8a.6.6 0 0 0 0-1l-10.6-6.8a.6.6 0 0 0-.92.5Z" />
                        </svg>
                      </span>
                    </span>
                  )}

                  {selecting && (
                    <span
                      className={`absolute inset-0 border-4 transition-all ${
                        isPicked ? 'border-violet-600 bg-violet-600/20' : 'border-transparent'
                      }`}
                    />
                  )}
                </>
              );

              return selecting ? (
                <button
                  key={item.shortcode}
                  onClick={() => toggle(picked, item.shortcode, setPicked)}
                  className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-900 text-left shadow-sm hover:shadow-md transition-all"
                >
                  {inner}
                </button>
              ) : (
                <Link
                  key={item.shortcode}
                  href={`/reel/${item.shortcode}`}
                  className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-900 shadow-sm hover:shadow-md transition-all"
                >
                  {inner}
                </Link>
              );
            })}
          </div>

          {shown.length > 0 && (
            <div className="mt-8 space-y-2 sm:hidden">
              <Eyebrow>Title Directory</Eyebrow>
              {shown.slice(0, 10).map((i) => (
                <Link key={i.shortcode} href={`/reel/${i.shortcode}`}>
                  <Card className="flex items-center gap-3 p-3">
                    <Thumb shortcode={i.shortcode} category={i.category} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-zinc-900">{i.title ?? 'Untitled'}</p>
                      <p className="truncate text-[10px] text-zinc-500">{detailLine(i)}</p>
                    </div>
                    <Pill tone="violet">{categoryOf(i.category).one}</Pill>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Desktop Summary Panel */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="sticky top-20 rounded-[24px] bg-gradient-to-b from-[#F8F5FF] to-white border border-purple-100 p-5 shadow-sm space-y-5">
            <div>
              <Eyebrow>Library Summary</Eyebrow>
              <h3 className="mt-1 text-base font-bold text-zinc-900">AI Intelligence Overview</h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-white border border-zinc-100">
                <span className="text-zinc-500">Total Analyzed</span>
                <span className="font-bold text-zinc-900 tnum">{totalReels} reels</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-white border border-zinc-100">
                <span className="text-zinc-500">Top Category</span>
                <span className="font-bold text-violet-700">{mostCommonCat}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-white border border-zinc-100">
                <span className="text-zinc-500">Starred Reels</span>
                <span className="font-bold text-amber-600 tnum">{stars.length}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-purple-100">
              <Eyebrow>Quick Insights</Eyebrow>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 bg-violet-50/70 p-3 rounded-xl border border-violet-100">
                ✨ Search supports semantic meaning. Type &quot;cheapest hotels in Goa&quot; or &quot;healthy breakfast&quot; to query your library!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
