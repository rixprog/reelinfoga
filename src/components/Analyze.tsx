'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Card, Pill } from './Shell';
import { Thumb } from './Thumb';
import { categoryOf, countdown, daysUntil } from '@/lib/ui';

interface Stage {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  detail?: string;
}

interface Result {
  category: string;
  reel: {
    shortcode: string;
    owner: string;
    caption: string;
    likes: number;
    video_duration: number | null;
    hashtags: string[];
  };
  transcript: { language: string | null; english: string; native: string };
  food_spot: Record<string, any>;
}

function Meta({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex gap-2 text-sm">
      {k && <dt className="shrink-0 text-zinc-400">{k}:</dt>}
      <dd className={strong ? 'font-semibold text-zinc-900' : 'text-zinc-600'}>{v}</dd>
    </div>
  );
}

export function Analyze() {
  const [url, setUrl] = useState('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (tick.current) clearInterval(tick.current);
    },
    [],
  );

  const poll = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/analyze/${id}`, { cache: 'no-store' });
      const d = await r.json();
      setStages(d.stages ?? []);
      if (d.status === 'running') {
        timer.current = setTimeout(() => poll(id), 800);
      } else {
        if (tick.current) clearInterval(tick.current);
        setBusy(false);
        if (d.status === 'error') setError(d.error ?? 'Processing failed');
        else setResult(d.result);
      }
    } catch {
      if (tick.current) clearInterval(tick.current);
      setBusy(false);
      setError('Lost contact with the server.');
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setStages([]);
    setElapsed(0);
    started.current = Date.now();
    tick.current = setInterval(
      () => setElapsed(Math.round((Date.now() - started.current) / 100) / 10),
      100,
    );

    const r = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });
    const d = await r.json();
    if (!r.ok) {
      if (tick.current) clearInterval(tick.current);
      setError(d.error ?? 'Something went wrong.');
      setBusy(false);
      return;
    }
    poll(d.id);
  }

  const scrollToAnalyze = () => {
    const el = document.getElementById('analyze-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  };

  const scrollToFeatures = () => {
    const el = document.getElementById('features-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetched = stages.find((s) => s.id === 'downloading')?.status === 'completed';
  const p = result?.food_spot ?? {};
  const cat = categoryOf(result?.category);
  const title =
    p.place_name ?? p.title ?? p.dish_name ?? p.destination ?? p.product_category;
  const where = [p.area, p.city, p.state].filter(Boolean).join(', ');
  const d = daysUntil(p.deadline_date);

  return (
    <div className="w-full space-y-12 text-zinc-900 font-sans pb-12">
      
      {/* 1. HERO CARD BANNER CONTAINER */}
      <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-b from-[#F2EAFF] via-[#EBE0FF] to-[#F4EEFF] p-6 sm:p-10 lg:p-14 shadow-sm border border-purple-200/50">
        
        {/* Floating 3D Orbs */}
        {/* Left Pink Torus / Donut */}
        <div className="pointer-events-none absolute -left-4 top-1/2 hidden h-20 w-20 -translate-y-1/2 animate-float sm:block">
          <div className="h-full w-full rounded-full bg-gradient-to-tr from-[#FF7BB0] to-[#FFA6C9] p-4 shadow-xl shadow-pink-500/20 ring-4 ring-white/60">
            <div className="h-full w-full rounded-full bg-[#F2EAFF]" />
          </div>
        </div>
        {/* Top Right Violet Sphere */}
        <div className="pointer-events-none absolute right-8 top-8 hidden h-20 w-20 animate-float-slow rounded-full bg-gradient-to-tr from-[#8B5CF6] via-[#A78BFA] to-[#C4B5FD] shadow-2xl shadow-purple-500/30 ring-4 ring-white/60 sm:block" />
        {/* Bottom Pearl Sphere */}
        <div className="pointer-events-none absolute right-16 bottom-6 hidden h-14 w-14 animate-float-reverse rounded-full bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 shadow-lg ring-2 ring-white/80 sm:block" />

        {/* Hero Content Grid */}
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          
          {/* Left Hero Column */}
          <div className="flex flex-col items-center text-center lg:col-span-6 lg:items-start lg:text-left">
            
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100/90 px-4 py-1.5 text-xs font-semibold text-violet-700 shadow-sm backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-violet-600 animate-pulse" />
              AI-Powered Instagram Intelligence
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl lg:leading-[1.12]">
              All your<br />
              Instagram feeds.<br />
              One smart place.
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-600 sm:text-lg">
              Collect, analyze and explore Instagram feeds effortlessly. Turn saved reels into searchable recipes, locations, transcripts, and deadlines.
            </p>

            <div className="mt-8 flex items-center justify-center lg:justify-start gap-4">
              <button
                onClick={scrollToAnalyze}
                className="inline-flex items-center gap-3 rounded-full bg-black px-8 py-4 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-95 shadow-xl shadow-black/10"
              >
                <span>Go to Feeds</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Hero Column: 3-Phone Mockup */}
          <div className="relative lg:col-span-6 flex justify-center items-center py-4">
            <div className="relative w-full max-w-[420px] sm:max-w-[460px] h-[460px] sm:h-[500px] flex items-center justify-center">
              
              {/* Phone 1: Left Phone */}
              <div className="absolute left-0 sm:left-2 top-6 z-10 w-[170px] sm:w-[195px] h-[350px] sm:h-[400px] -rotate-12 rounded-[36px] bg-zinc-950 p-2 shadow-2xl shadow-purple-900/20 ring-1 ring-white/30 transition-all duration-300 hover:rotate-0 hover:z-30 animate-float-slow">
                <div className="h-full w-full overflow-hidden rounded-[28px] bg-zinc-900 text-white flex flex-col justify-between p-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold opacity-90 px-1 border-b border-zinc-800 pb-1 text-zinc-300">
                    <span className="font-bold tracking-tight">Instagram</span>
                    <span>💬 2</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 my-auto">
                    <div className="relative h-20 rounded-xl overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80"
                        alt="Food reel"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1">
                        <span className="text-[8px] font-bold text-white">🍕 4.8k</span>
                      </div>
                    </div>

                    <div className="relative h-20 rounded-xl overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=300&q=80"
                        alt="Santorini travel"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1">
                        <span className="text-[8px] font-bold text-white">✈️ 12k</span>
                      </div>
                    </div>

                    <div className="relative h-20 rounded-xl overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=300&q=80"
                        alt="Recipe"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1">
                        <span className="text-[8px] font-bold text-white">🍳 8.4k</span>
                      </div>
                    </div>

                    <div className="relative h-20 rounded-xl overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80"
                        alt="Coffee"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1">
                        <span className="text-[8px] font-bold text-white">☕ 3.1k</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-around items-center pt-1 border-t border-zinc-800 text-[10px] text-zinc-400">
                    <span>🏠</span>
                    <span>🔍</span>
                    <span>🎬</span>
                    <span>👤</span>
                  </div>
                </div>
              </div>

              {/* Phone 2: Center Phone */}
              <div className="absolute z-20 w-[200px] sm:w-[230px] h-[410px] sm:h-[460px] rounded-[40px] bg-zinc-950 p-2.5 shadow-2xl shadow-purple-600/30 ring-2 ring-purple-300/60 transition-all duration-300 hover:scale-105 animate-float">
                <div className="h-full w-full overflow-hidden rounded-[32px] bg-black text-white relative flex flex-col justify-between p-2">
                  
                  <div className="mx-auto h-3.5 w-16 rounded-full bg-zinc-900 z-20" />

                  <div className="relative my-0.5 h-[345px] sm:h-[390px] rounded-2xl overflow-hidden flex flex-col justify-between p-3 text-left">
                    
                    <img
                      src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=500&q=80"
                      alt="Instagram Reel Player"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

                    <div className="relative z-10 flex justify-between items-center text-[10px] text-white">
                      <span className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full font-semibold">
                        Reels
                      </span>
                      <span className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md font-mono text-[9px]">
                        0:45
                      </span>
                    </div>

                    <div className="relative z-10 flex flex-col items-end gap-3.5 self-end text-[10px]">
                      <div className="flex flex-col items-center">
                        <div className="grid size-7 place-items-center rounded-full bg-black/40 backdrop-blur-md text-white">❤️</div>
                        <span className="text-[8px] font-medium mt-0.5">14.8k</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="grid size-7 place-items-center rounded-full bg-black/40 backdrop-blur-md text-white">💬</div>
                        <span className="text-[8px] font-medium mt-0.5">932</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="grid size-7 place-items-center rounded-full bg-black/40 backdrop-blur-md text-white">✈️</div>
                        <span className="text-[8px] font-medium mt-0.5">3.4k</span>
                      </div>
                    </div>

                    <div className="relative z-10 space-y-1.5">
                      <div className="bg-black/60 backdrop-blur-md rounded-xl p-2 text-left border border-white/10">
                        <div className="flex items-center gap-1.5">
                          <span className="h-4 w-4 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 text-[8px] grid place-items-center">✨</span>
                          <p className="text-[10px] font-bold text-white">@fashion_influencer</p>
                        </div>
                        <p className="text-[8px] text-zinc-200 mt-0.5 line-clamp-1">Summer outfit collection 2026 💖</p>
                      </div>
                      
                      <div className="bg-violet-600/90 backdrop-blur-md py-1 px-2 rounded-lg text-center text-[9px] font-semibold text-white shadow-sm flex items-center justify-center gap-1">
                        <span>📍 Milan, Italy</span>
                        <span>·</span>
                        <span>🛒 3 Products Found</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Phone 3: Right Phone */}
              <div className="absolute right-0 sm:right-2 top-6 z-10 w-[170px] sm:w-[195px] h-[350px] sm:h-[400px] rotate-12 rounded-[36px] bg-zinc-950 p-2 shadow-2xl shadow-purple-900/20 ring-1 ring-white/30 transition-all duration-300 hover:rotate-0 hover:z-30 animate-float-reverse">
                <div className="h-full w-full overflow-hidden rounded-[28px] bg-zinc-900 text-white flex flex-col justify-between p-2.5">
                  
                  <div className="flex items-center justify-between text-[9px] text-zinc-400 border-b border-zinc-800 pb-1">
                    <span className="font-semibold text-purple-300">ReelBrain AI</span>
                    <span className="text-emerald-400 font-bold">100% Analyzed</span>
                  </div>

                  <div className="relative h-28 rounded-xl overflow-hidden my-1">
                    <img
                      src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=300&q=80"
                      alt="Saved resort reel"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-1.5 flex flex-col justify-end">
                      <p className="text-[9px] font-bold text-white truncate">Luxury Bali Resort</p>
                      <p className="text-[7px] text-zinc-300">Extracted location & booking deadline</p>
                    </div>
                  </div>

                  <div className="bg-zinc-800/80 rounded-xl p-2 space-y-1 text-[8px]">
                    <div className="flex justify-between text-zinc-300">
                      <span>Transcript:</span>
                      <span className="text-purple-300">English</span>
                    </div>
                    <div className="flex justify-between text-zinc-300">
                      <span>Category:</span>
                      <span className="text-emerald-300">Travel</span>
                    </div>
                  </div>

                  <div className="bg-[#8B5CF6] py-1.5 rounded-xl text-center text-[9px] font-semibold text-white">
                    Saved to ReelBrain
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 2. FETCH INSTAGRAM FEED (ANALYZE REEL SECTION) */}
      <section id="analyze-section" className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-10 shadow-lg shadow-purple-900/5 border border-purple-100/80">
          
          <div className="flex items-center gap-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#F3E8FF] text-[#8B5CF6]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                Fetch Instagram Feed & Reel
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                Paste any public Instagram reel URL to get started with ReelBrain AI.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <input
              ref={inputRef}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="flex-1 rounded-2xl border border-zinc-200 bg-slate-50/50 px-5 py-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#8B5CF6] focus:bg-white focus:ring-4 focus:ring-[#8B5CF6]/15"
            />
            <button
              type="submit"
              disabled={busy || !url.trim()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#8B5CF6] px-8 py-4 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition hover:bg-[#7C3AED] active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none"
            >
              {busy ? 'Processing…' : 'Process'}
            </button>
          </form>

          {error && (
            <div className="mt-5 rounded-2xl bg-rose-50 p-4 border border-rose-200 text-sm text-rose-700">
              {error}
            </div>
          )}

          {stages.length > 0 && (
            <div className="mt-8 rounded-2xl bg-slate-50/80 p-5 border border-zinc-100">
              <ol className="space-y-4">
                {stages.map((s, i) => (
                  <li key={s.id} className="relative flex gap-4 pb-1 last:pb-0">
                    {i < stages.length - 1 && (
                      <span
                        className="absolute left-[9px] top-6 h-full w-[2px]"
                        style={{
                          background:
                            s.status === 'completed' ? '#8B5CF6' : '#E5E7EB',
                        }}
                      />
                    )}
                    <span className="relative z-10 mt-[2px] grid size-5 shrink-0 place-items-center">
                      {s.status === 'completed' ? (
                        <span className="grid size-5 place-items-center rounded-full bg-[#8B5CF6] text-white">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12.5 9.5 18 20 6.5" />
                          </svg>
                        </span>
                      ) : s.status === 'processing' ? (
                        <>
                          <span className="absolute size-5 animate-ping rounded-full bg-purple-500/30" />
                          <span className="size-5 rounded-full border-[3px] border-[#8B5CF6] bg-white" />
                        </>
                      ) : s.status === 'error' ? (
                        <span className="size-4 rounded-full bg-rose-600" />
                      ) : (
                        <span className="size-4 rounded-full border-2 border-zinc-300 bg-white" />
                      )}
                    </span>

                    <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                      <span
                        className={`text-sm ${
                          s.status === 'pending'
                            ? 'text-zinc-400'
                            : s.status === 'processing'
                              ? 'font-semibold text-[#8B5CF6]'
                              : 'font-medium text-zinc-900'
                        }`}
                      >
                        {s.label}
                        {s.status === 'processing' && '…'}
                      </span>
                      <span className="tnum shrink-0 text-xs font-mono text-zinc-400">
                        {s.detail ?? (s.status === 'processing' ? `${elapsed.toFixed(1)}s` : '')}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {(fetched || result) && (
            <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row gap-6 items-start">
              <div className="relative w-full sm:w-[200px] shrink-0 overflow-hidden rounded-2xl bg-zinc-900 shadow-md">
                <div className="aspect-[9/16]">
                  <Thumb
                    shortcode={result?.reel.shortcode ?? ''}
                    category={result?.category}
                    fill
                  />
                </div>
                {result?.reel.video_duration ? (
                  <span className="absolute right-2 top-2 rounded-md bg-black/75 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                    {Math.floor(result.reel.video_duration / 60)}:
                    {String(Math.round(result.reel.video_duration % 60)).padStart(2, '0')}
                  </span>
                ) : null}
              </div>

              <div className="flex-1 space-y-2">
                {result ? (
                  <dl className="space-y-2 text-sm">
                    <Meta k="Creator" v={`@${result.reel.owner}`} strong />
                    {!!result.reel.likes && (
                      <Meta k="Likes" v={result.reel.likes.toLocaleString('en-IN')} />
                    )}
                    {!!result.reel.video_duration && (
                      <Meta k="Duration" v={`${Math.round(result.reel.video_duration)}s`} />
                    )}
                    {!!result.transcript.language && (
                      <Meta k="Language" v={result.transcript.language.toUpperCase()} />
                    )}
                    {!!result.reel.caption && <Meta k="Caption" v={result.reel.caption} />}
                  </dl>
                ) : (
                  <p className="text-sm text-zinc-500 py-4">Fetched — reading reel now…</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <Card className="mt-8 p-6 bg-purple-50/40 border-purple-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow">Category</span>
                <Pill tone="violet">{cat.one}</Pill>
                {p.confidence && (
                  <Pill tone={p.confidence === 'high' ? 'ok' : p.confidence === 'medium' ? 'warn' : 'flat'}>
                    {p.confidence} confidence
                  </Pill>
                )}
                {d !== null && <Pill tone={countdown(d, p.deadline_passed).tone}>{countdown(d, p.deadline_passed).text}</Pill>}
              </div>

              <h3 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">
                {title ?? 'Extracted Reel Data'}
              </h3>
              {where && (
                <p className="mt-2 text-sm text-zinc-600">
                  <span className="text-zinc-400">Location: </span>
                  {where}
                </p>
              )}
              {(p.summary || p.description) && (
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  <span className="text-zinc-400">Summary: </span>
                  {p.summary || p.description}
                </p>
              )}

              <Link
                href={`/reel/${result.reel.shortcode}`}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#7C3AED]"
              >
                <span>View Full Breakdown</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </Card>
          )}

        </div>
      </section>

      {/* 3. MINIMALIST FEED CATEGORIES GRID */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Feed Categories
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Choose a category to explore curated Instagram feeds.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
          {[
            {
              title: 'Foodspots',
              desc: 'Restaurants & cafes',
              icon: '🍔',
              // Reel-portrait art in /public/categories, one per category.
              image: '/categories/foodspots.jpg',
              href: '/reels?category=food_spot',
            },
            {
              title: 'Travel',
              desc: 'Places & stays',
              icon: '✈️',
              image: '/categories/travel.jpg',
              href: '/reels?category=travel',
            },
            {
              title: 'Events',
              desc: 'Concerts & shows',
              icon: '🎟️',
              image: '/categories/events.jpg',
              href: '/reels?category=deadline',
            },
            {
              title: 'Recipe',
              desc: 'Dishes & baking',
              icon: '🍳',
              image: '/categories/recipe.jpg',
              href: '/reels?category=recipe',
            },
          ].map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-zinc-200/80 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <Image
                src={cat.image}
                alt=""
                fill
                // Two across on phones, four on desktop — matches the grid so
                // the browser never fetches a wider source than it paints.
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* The prompts keep each photo's lower third calm, but the scrim
                  guarantees the label holds up on the brighter ones. */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-4">
                <span className="grid size-9 place-items-center rounded-xl bg-white/95 text-base shadow-sm">
                  {cat.icon}
                </span>
                <h3 className="mt-2.5 text-base font-bold text-white drop-shadow-sm">{cat.title}</h3>
                <p className="mt-0.5 text-xs text-white/80">{cat.desc}</p>
              </div>

              <svg
                className="absolute right-3 top-3 w-4 h-4 text-white opacity-0 transition-opacity group-hover:opacity-100"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section id="features-section" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Our Amazing Features
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Powerful tools to help you discover, analyze and manage Instagram feeds.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Smart Feed Extraction',
              desc: 'Extract any public Instagram feed instantly using our powerful engine.',
              icon: '🔗',
              color: 'bg-[#F3E8FF] text-[#8B5CF6]',
            },
            {
              title: 'AI-Powered Insights',
              desc: 'Get valuable insights, trends, and analytics from your feed data.',
              icon: '📊',
              color: 'bg-blue-100 text-blue-600',
            },
            {
              title: 'Multi-Category Support',
              desc: 'Explore feeds across food, travel, events, recipes and more.',
              icon: '🎛️',
              color: 'bg-amber-100 text-amber-600',
            },
            {
              title: 'Secure & Reliable',
              desc: 'Your data is safe with enterprise-grade security and privacy.',
              icon: '🛡️',
              color: 'bg-pink-100 text-pink-600',
            },
          ].map((feat) => (
            <div
              key={feat.title}
              className="rounded-2xl border border-purple-100/60 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <span className={`grid size-11 place-items-center rounded-xl text-lg ${feat.color}`}>
                {feat.icon}
              </span>
              <h3 className="mt-4 text-base font-bold text-zinc-900">{feat.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. PRICING PLANS */}
      <section id="pricing-section" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Pricing Plans
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Choose the plan that&apos;s perfect for you.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-center">
          {/* Basic Plan */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900">Basic</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-zinc-900">₹0</span>
              <span className="text-xs text-zinc-400">/month</span>
            </div>
            <ul className="mt-6 space-y-3 text-xs text-zinc-600">
              {['5 Feed Extractions / month', 'Basic Insights', 'Standard Support'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-[#8B5CF6] font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={scrollToAnalyze}
              className="mt-8 w-full rounded-2xl border border-zinc-200 bg-slate-50 py-3 text-center text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Get Started
            </button>
          </div>

          {/* Pro Plan */}
          <div className="relative rounded-3xl border-2 border-[#8B5CF6] bg-gradient-to-b from-[#F5EEFF] to-white p-7 shadow-xl shadow-purple-500/10 lg:-translate-y-1">
            <span className="absolute -top-3 right-6 rounded-full bg-[#8B5CF6] px-3.5 py-1 text-[10px] font-bold text-white shadow-sm">
              Most Popular
            </span>
            <h3 className="text-lg font-bold text-zinc-900">Pro</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-zinc-900">₹299</span>
              <span className="text-xs text-zinc-400">/month</span>
            </div>
            <ul className="mt-6 space-y-3 text-xs text-zinc-700">
              {['Unlimited Feed Extractions', 'Advanced Insights', 'Priority Support', 'Export Data'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-[#8B5CF6] font-bold">✓</span>
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={scrollToAnalyze}
              className="mt-8 w-full rounded-2xl bg-[#8B5CF6] py-3 text-center text-xs font-semibold text-white shadow-md shadow-purple-500/20 hover:bg-[#7C3AED]"
            >
              Get Started
            </button>
          </div>

          {/* Premium Plan */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900">Premium</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-zinc-900">₹599</span>
              <span className="text-xs text-zinc-400">/month</span>
            </div>
            <ul className="mt-6 space-y-3 text-xs text-zinc-600">
              {['All Pro Features', 'API Access', 'Custom Reports', 'Dedicated Support'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-[#8B5CF6] font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={scrollToAnalyze}
              className="mt-8 w-full rounded-2xl border border-zinc-200 bg-slate-50 py-3 text-center text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="mt-12 border-t border-purple-100 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-[#8B5CF6] text-white text-xs font-bold">
                RB
              </span>
              <span className="text-base font-bold text-zinc-900">ReelBrain</span>
            </div>

            <p className="text-xs text-zinc-400">
              © 2026 ReelBrain / Team Yukti. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
