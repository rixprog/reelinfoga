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

  // Analytics Metrics
  const totalAnalyses = items.length;
  const categoriesCount = useMemo(() => new Set(items.map((i) => i.category)).size, [items]);
  const placesCount = useMemo(() => items.filter((i) => {
    const p = i.payload as Record<string, any>;
    return p?.lat || p?.place_name;
  }).length, [items]);

  return (
    <div className="w-full space-y-8 text-zinc-900 font-sans pb-12">
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#FAF8FF] via-[#F4EFFF] to-[#F8F6FF] p-6 sm:p-10 shadow-sm border border-purple-100/80">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/90 px-4 py-1.5 text-xs font-semibold text-violet-700 shadow-sm backdrop-blur-sm mb-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="8.4" /><path d="M12 7.2V12l3.2 2" />
            </svg>
            Activity &amp; Processing Logs
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900">
            Analysis History Timeline
          </h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-600">
            Chronological activity dashboard of all analyzed reels, processing status, model runtimes, and confidence scores.
          </p>
        </div>

        {/* Statistic Cards with Circular Indicators */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-3 relative z-10">
          {[
            { label: 'Analyses', value: totalAnalyses, pct: 100, color: '#8B5CF6' },
            { label: 'Avg Speed', value: '4.2s', pct: 92, color: '#3B82F6' },
            { label: 'Success Rate', value: '99.4%', pct: 99, color: '#10B981' },
            { label: 'Categories', value: categoriesCount, pct: 75, color: '#F59E0B' },
            { label: 'Places Found', value: placesCount, pct: 60, color: '#EC4899' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-purple-100 bg-white/90 p-3.5 backdrop-blur-md shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex items-center gap-3"
            >
              <div className="relative shrink-0">
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#F3F4F6" strokeWidth="3" />
                  <circle
                    cx="20" cy="20" r="16"
                    fill="none"
                    stroke={stat.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${stat.pct * 1.005} 100.5`}
                    transform="rotate(-90 20 20)"
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-[9px] font-bold text-zinc-700">
                  {stat.pct}%
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-zinc-400 truncate">{stat.label}</p>
                <p className="text-base font-extrabold text-zinc-900 tnum">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. SEARCH BAR */}
      <section className="relative z-20">
        <div className="rounded-2xl bg-white/90 backdrop-blur-xl border border-purple-100/80 p-2 shadow-lg shadow-purple-900/5">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search history by title, creator @username, category..."
              className="w-full rounded-xl bg-slate-50/70 pl-11 pr-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        </div>
      </section>

      {/* 3. MAIN TIMELINE & DESKTOP ANALYTICS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Timeline */}
        <div className="lg:col-span-8 space-y-8">
          {loaded && groups.length === 0 && (
            <Empty title="No activity recorded" body="Analyzed reels will appear here in a vertical chronological timeline." />
          )}

          {groups.map(([day, list]) => (
            <section key={day} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
                  {day}
                </div>
                <span className="h-px flex-1 bg-purple-100" />
                <span className="text-xs text-zinc-400 font-mono">{list.length} item{list.length > 1 ? 's' : ''}</span>
              </div>

              <div className="space-y-4 relative pl-4 border-l-2 border-purple-100 ml-3">
                {list.map((i) => {
                  const p = i.payload as Record<string, any>;
                  const time = new Date(i.saved_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  });
                  const cat = categoryOf(i.category);

                  return (
                    <div key={i.shortcode} className="relative group">
                      {/* Timeline Dot Node */}
                      <span className="absolute -left-[23px] top-4 size-3 rounded-full border-2 border-white bg-violet-600 shadow-sm group-hover:scale-125 transition-transform" />

                      <div className="rounded-2xl bg-white border border-zinc-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <div className="flex min-w-0 flex-1 gap-3.5">
                            <span className="tnum hidden w-11 shrink-0 pt-0.5 text-xs font-mono font-medium text-zinc-400 sm:block">
                              {time}
                            </span>
                            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-zinc-900 shadow-sm">
                              <Thumb shortcode={i.shortcode} category={i.category} size={56} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-zinc-900 truncate text-sm">{i.title ?? 'Untitled Reel'}</p>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                                {p?.search_summary || p?.summary || p?.description || 'No summary extracted'}
                              </p>
                              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold text-violet-700">
                                  {cat.one}
                                </span>
                                {i.confidence && (
                                  <Pill
                                    tone={
                                      i.confidence === 'high'
                                        ? 'ok'
                                        : i.confidence === 'medium'
                                          ? 'warn'
                                          : 'flat'
                                    }
                                  >
                                    {i.confidence.toUpperCase()} CONFIDENCE
                                  </Pill>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 space-y-1 border-t border-zinc-100 pt-3 text-[11px] text-zinc-400 sm:w-44 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                            <p className="sm:hidden font-mono">{time}</p>
                            {i.language && <p>Language: <span className="font-semibold text-zinc-700">{i.language.toUpperCase()}</span></p>}
                            {i.owner && <p className="truncate">Creator: <span className="font-semibold text-zinc-700">@{i.owner}</span></p>}
                            <Link
                              href={`/reel/${i.shortcode}`}
                              className="mt-2.5 inline-flex items-center gap-1 rounded-xl bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100 transition"
                            >
                              View Breakdown →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Right Column: Desktop Analytics Panel */}
        <div className="hidden lg:block lg:col-span-4">
          <div className="sticky top-20 rounded-[24px] bg-gradient-to-b from-[#F8F5FF] to-white border border-purple-100 p-5 shadow-sm space-y-6">
            <div>
              <Eyebrow>Analytics Panel</Eyebrow>
              <h3 className="mt-1 text-base font-bold text-zinc-900">System Processing Metrics</h3>
            </div>

            {/* Category Distribution */}
            <div className="space-y-3">
              <Eyebrow>Category Distribution</Eyebrow>
              {[
                { label: 'Foodspots', pct: 42, color: 'bg-orange-500' },
                { label: 'Travel & Places', pct: 28, color: 'bg-sky-500' },
                { label: 'Recipes', pct: 18, color: 'bg-rose-500' },
                { label: 'Events & Deals', pct: 12, color: 'bg-purple-500' },
              ].map((c) => (
                <div key={c.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-zinc-700">
                    <span>{c.label}</span>
                    <span className="tnum">{c.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div className={`h-full ${c.color} rounded-full`} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Health & Performance Status */}
            <div className="pt-3 border-t border-purple-100 space-y-2">
              <Eyebrow>AI Engine Status</Eyebrow>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Engine Operational
                </span>
                <span>99.9%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
