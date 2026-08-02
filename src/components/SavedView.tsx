'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ReelPlayerModal } from './ReelPlayer';
import { Card, Empty, Eyebrow, Pill } from './Shell';
import { Thumb } from './Thumb';
import { type Collection, collections, starred } from '@/lib/collections';
import type { SavedItem } from '@/lib/store-client';
import { categoryOf } from '@/lib/ui';

export function SavedView() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [cols, setCols] = useState<Collection[]>([]);
  const [stars, setStars] = useState<string[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'starred' | 'folders'>('all');
  const [loading, setLoading] = useState(true);

  const syncLocal = () => {
    setCols(collections.all());
    setStars(starred.all());
  };

  useEffect(() => {
    fetch('/api/reels', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
    syncLocal();
    window.addEventListener('reelbrain:store', syncLocal);
    return () => window.removeEventListener('reelbrain:store', syncLocal);
  }, []);

  const starredItems = useMemo(
    () => items.filter((i) => stars.includes(i.shortcode)),
    [items, stars]
  );

  const placesCount = useMemo(
    () => items.filter((i) => (i.payload as any)?.lat || (i.payload as any)?.place_name).length,
    [items]
  );

  const recipesCount = useMemo(
    () => items.filter((i) => i.category === 'recipe' || (i.payload as any)?.dish_name).length,
    [items]
  );

  const productsCount = useMemo(
    () => items.filter((i) => i.category === 'product' || (i.payload as any)?.product_category).length,
    [items]
  );

  return (
    <div className="w-full space-y-8 text-zinc-900 font-sans pb-12">
      <ReelPlayerModal shortcode={playing} onClose={() => setPlaying(null)} />

      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#FAF5F8] via-[#FAF0F9] to-[#F8F4FF] p-6 sm:p-10 shadow-sm border border-pink-100/60">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-pink-100/90 px-4 py-1.5 text-xs font-semibold text-pink-700 shadow-sm backdrop-blur-sm mb-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.5 3.6h11a1 1 0 0 1 1 1v15.2l-6.5-4-6.5 4V4.6a1 1 0 0 1 1-1Z" />
            </svg>
            Personal Library
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900">
            Saved Collections &amp; Shortlist
          </h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-600">
            Your personal library of starred reels, curated folders, and favorite spots.
          </p>
        </div>

        {/* Statistic Cards */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 relative z-10">
          {[
            { label: 'Starred Reels', value: stars.length, icon: '⭐', bg: 'bg-white/80 border-pink-100' },
            { label: 'Favorite Places', value: placesCount, icon: '📍', bg: 'bg-white/80 border-pink-100' },
            { label: 'Products', value: productsCount, icon: '🛍️', bg: 'bg-white/80 border-pink-100' },
            { label: 'Saved Recipes', value: recipesCount, icon: '🍳', bg: 'bg-white/80 border-pink-100' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl border ${stat.bg} p-4 backdrop-blur-md shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
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

      {/* 2. COLLECTION FOLDERS */}
      <section className="relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Eyebrow>Folder System</Eyebrow>
            <h2 className="text-2xl font-extrabold text-zinc-900">Collection Folders</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { title: 'Foodspots', icon: '🍔', cat: 'food_spot', bg: 'from-orange-50 to-amber-50', border: 'border-orange-100', text: 'text-orange-700' },
            { title: 'Travel Stays', icon: '✈️', cat: 'travel', bg: 'from-sky-50 to-blue-50', border: 'border-sky-100', text: 'text-sky-700' },
            { title: 'Recipes', icon: '🍳', cat: 'recipe', bg: 'from-rose-50 to-pink-50', border: 'border-rose-100', text: 'text-rose-700' },
            { title: 'Events', icon: '🎟️', cat: 'deadline', bg: 'from-purple-50 to-indigo-50', border: 'border-purple-100', text: 'text-purple-700' },
          ].map((folder) => {
            const folderItems = items.filter((i) => i.category === folder.cat);
            return (
              <Link
                key={folder.title}
                href={`/reels?category=${folder.cat}`}
                className={`group rounded-2xl bg-gradient-to-b ${folder.bg} border ${folder.border} p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
              >
                <div className="flex justify-between items-start">
                  <span className="grid size-10 place-items-center rounded-xl bg-white shadow-sm text-lg">
                    {folder.icon}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 ${folder.text}`}>
                    {folderItems.length} reels
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-bold text-zinc-900 group-hover:text-violet-700">{folder.title}</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Category folder</p>
              </Link>
            );
          })}
        </div>

        {/* User Created Collections */}
        {cols.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {cols.map((c) => (
              <Link
                key={c.id}
                href={`/reels/collection/${c.id}`}
                className="group rounded-2xl bg-white border border-zinc-100 p-3 shadow-sm hover:shadow-md transition"
              >
                <div className="flex h-20 gap-0.5 overflow-hidden rounded-xl bg-slate-100">
                  {c.shortcodes.slice(0, 3).map((sc) => (
                    <div key={sc} className="relative flex-1">
                      <Thumb shortcode={sc} fill />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs font-bold text-zinc-900 group-hover:text-violet-600 truncate">{c.name}</p>
                <p className="text-[10px] text-zinc-400">{c.shortcodes.length} items</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3. MASONRY STARRED & SAVED REELS GRID */}
      <section className="relative space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-50 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              All Saved ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('starred')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                activeTab === 'starred'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-50 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              ⭐ Starred ({stars.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-400">Loading saved library…</div>
        ) : (activeTab === 'starred' ? starredItems : items).length === 0 ? (
          <Empty
            title={activeTab === 'starred' ? 'No starred reels yet' : 'No saved reels'}
            body="Star any reel card in your library to add it to your shortlist!"
          />
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
            {(activeTab === 'starred' ? starredItems : items).map((item) => {
              const cat = categoryOf(item.category);
              const isStarred = stars.includes(item.shortcode);

              return (
                <div
                  key={item.shortcode}
                  className="break-inside-avoid group relative overflow-hidden rounded-2xl bg-zinc-900 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative aspect-[9/16] overflow-hidden">
                    <Thumb shortcode={item.shortcode} category={item.category} fill />

                    <span
                      className="absolute left-2.5 top-2.5 size-2.5 rounded-full ring-2 ring-white/80"
                      style={{ background: cat.ink }}
                    />

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        starred.toggle(item.shortcode);
                        syncLocal();
                      }}
                      className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:scale-110 transition"
                    >
                      <span className={`text-xs ${isStarred ? 'text-amber-400' : 'text-white'}`}>
                        {isStarred ? '★' : '☆'}
                      </span>
                    </button>

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 pt-8">
                      <p className="text-xs font-bold text-white line-clamp-2">{item.title ?? 'Untitled'}</p>
                      <div className="mt-1 flex items-center justify-between text-[9px] text-zinc-300">
                        <span className="rounded-full bg-white/20 px-2 py-0.5 font-medium text-white">
                          {cat.one}
                        </span>
                        <Link href={`/reel/${item.shortcode}`} className="font-semibold text-purple-300 hover:text-white">
                          Open →
                        </Link>
                      </div>
                    </div>

                    <button
                      onClick={() => setPlaying(item.shortcode)}
                      className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="grid size-10 place-items-center rounded-full bg-white/95 text-violet-600 shadow-lg">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5.2v13.6a.6.6 0 0 0 .92.5l10.6-6.8a.6.6 0 0 0 0-1l-10.6-6.8a.6.6 0 0 0-.92.5Z" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
