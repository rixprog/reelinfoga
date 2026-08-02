'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CategoryRows } from './CategoryRows';
import { Card, Pill } from './Shell';
import { Thumb } from './Thumb';
import { categoryOf, countdown, daysUntil } from '@/lib/ui';

/** Pull the shortcode out of a reel/post/tv URL. Null when it isn't one yet. */
function shortcodeFromUrl(u: string): string | null {
  return u.match(/instagram\.com\/(?:reel|reels|p|tv)\/([\w-]+)/)?.[1] ?? null;
}

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
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#FAF8FF] via-[#F4EFFF] to-[#F8F6FF] p-6 sm:p-10 lg:p-12 shadow-sm border border-purple-100/80">
        {/* Hero Content Grid */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          
          {/* Left Hero Column */}
          <div className="flex flex-col items-center text-center lg:col-span-6 lg:items-start lg:text-left">
            
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100/90 px-3.5 py-1 text-xs font-semibold text-violet-700 shadow-sm backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-violet-600 animate-pulse" />
              AI-Powered Instagram Intelligence
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl lg:text-5xl lg:leading-[1.12]">
              All your<br />
              Instagram feeds.<br />
              One smart place.
            </h1>

            <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-600">
              Collect, analyze and explore Instagram feeds effortlessly. Turn saved reels into searchable recipes, locations, transcripts, and deadlines.
            </p>

            <div className="mt-8 flex items-center justify-center lg:justify-start gap-4">
              <button
                onClick={scrollToAnalyze}
                className="inline-flex items-center gap-2.5 rounded-full bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-95 shadow-md shadow-zinc-900/10"
              >
                <span>Go to Feeds</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Hero Column: 3-Phone Mockup */}
          <div className="relative lg:col-span-6 flex justify-center items-center py-2">
            <div className="relative w-full max-w-[420px] sm:max-w-[460px] h-[450px] sm:h-[480px] flex items-center justify-center">
              
              {/* Phone 1: Left Phone */}
              <div className="absolute left-0 sm:left-2 top-6 z-10 w-[170px] sm:w-[195px] h-[350px] sm:h-[400px] -rotate-6 rounded-[36px] bg-zinc-950 p-2 shadow-xl shadow-purple-950/15 ring-1 ring-white/30 transition-transform duration-300 hover:rotate-0 hover:z-30">
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
              <div className="absolute z-20 w-[200px] sm:w-[230px] h-[410px] sm:h-[460px] rounded-[40px] bg-zinc-950 p-2.5 shadow-2xl shadow-purple-950/20 ring-2 ring-purple-300/40 transition-all duration-300 hover:scale-105">
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
              <div className="absolute right-0 sm:right-2 top-6 z-10 w-[170px] sm:w-[195px] h-[350px] sm:h-[400px] rotate-6 rounded-[36px] bg-zinc-950 p-2 shadow-xl shadow-purple-950/15 ring-1 ring-white/30 transition-transform duration-300 hover:rotate-0 hover:z-30">
                <div className="h-full w-full overflow-hidden rounded-[28px] bg-zinc-900 text-white flex flex-col justify-between p-2.5">
                  
                  <div className="flex items-center justify-between text-[9px] text-zinc-400 border-b border-zinc-800 pb-1">
                    <span className="font-semibold text-purple-300">ReelInfoga AI</span>
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
                    Saved to ReelInfoga
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

       {/* ═══════════════════════════════════════════════════════════════
          2. ANALYZE REEL — Premium workspace with glass card & AI illustration
         ═══════════════════════════════════════════════════════════════ */}
      <section id="analyze-section" className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
          {/* Left Column — Analyze card */}
          <div className="lg:col-span-7">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/90 px-4 py-1.5 text-xs font-semibold text-violet-700 shadow-sm backdrop-blur-sm mb-4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                AI Analysis Engine
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl lg:text-[42px] lg:leading-[1.1]">
                Analyze Any<br />Instagram Reel
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-500">
                Paste any public Instagram reel URL and let our AI extract transcripts, locations, recipes, products, and deadlines — all in seconds.
              </p>
            </div>

            {/* Glass card wrapper */}
            <div className="relative overflow-hidden rounded-[24px] bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-purple-900/5 border border-purple-100/50">
              {/* Subtle gradient corner accent */}
              <div className="pointer-events-none absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br from-violet-400/10 to-purple-500/5 blur-2xl" />
              
              <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
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
                  {busy ? 'Processing…' : 'Analyze'}
                </button>
              </form>

              <p className="mt-3 text-xs text-zinc-400 flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
                Paste any Instagram Reel URL to get started
              </p>

              {/* Feature pills */}
              <div className="mt-5 flex flex-wrap gap-2">
                {['Transcript', 'Location', 'Products', 'Recipe', 'Calendar', 'Shopping'].map((pill) => (
                  <span key={pill} className="rounded-full bg-violet-50 border border-violet-100/80 px-3 py-1 text-[11px] font-semibold text-violet-600">
                    {pill}
                  </span>
                ))}
              </div>

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
                            style={{ background: s.status === 'completed' ? '#8B5CF6' : '#E5E7EB' }}
                          />
                        )}
                        <span className="relative z-10 mt-[2px] grid size-5 shrink-0 place-items-center">
                          {s.status === 'completed' ? (
                            <span className="grid size-5 place-items-center rounded-full bg-[#8B5CF6] text-white">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
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
                          <span className={`text-sm ${s.status === 'pending' ? 'text-zinc-400' : s.status === 'processing' ? 'font-semibold text-[#8B5CF6]' : 'font-medium text-zinc-900'}`}>
                            {s.label}{s.status === 'processing' && '…'}
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
                    <div className="relative aspect-[9/16]">
                      {/* The download stage finishes before `result` exists, so
                          fall back to the shortcode in the pasted URL — asking
                          for /api/thumb/ with no shortcode just 404s. */}
                      {(result?.reel.shortcode ?? shortcodeFromUrl(url)) ? (
                        <Thumb
                          shortcode={result?.reel.shortcode ?? shortcodeFromUrl(url)!}
                          category={result?.category}
                          fill
                        />
                      ) : (
                        <div className="absolute inset-0 animate-pulse bg-zinc-800" />
                      )}
                    </div>
                    {result?.reel.video_duration ? (
                      <span className="absolute right-2 top-2 rounded-md bg-black/75 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                        {Math.floor(result.reel.video_duration / 60)}:{String(Math.round(result.reel.video_duration % 60)).padStart(2, '0')}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex-1 space-y-2">
                    {result ? (
                      <dl className="space-y-2 text-sm">
                        <Meta k="Creator" v={`@${result.reel.owner}`} strong />
                        {!!result.reel.likes && <Meta k="Likes" v={result.reel.likes.toLocaleString('en-IN')} />}
                        {!!result.reel.video_duration && <Meta k="Duration" v={`${Math.round(result.reel.video_duration)}s`} />}
                        {!!result.transcript.language && <Meta k="Language" v={result.transcript.language.toUpperCase()} />}
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
                  <h3 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">{title ?? 'Extracted Reel Data'}</h3>
                  {where && (
                    <p className="mt-2 text-sm text-zinc-600"><span className="text-zinc-400">Location: </span>{where}</p>
                  )}
                  {(p.summary || p.description) && (
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600"><span className="text-zinc-400">Summary: </span>{p.summary || p.description}</p>
                  )}
                  <Link
                    href={`/reel/${result.reel.shortcode}`}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#7C3AED]"
                  >
                    <span>View Full Breakdown</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Link>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column — AI Workflow Illustration */}
          <div className="hidden lg:flex lg:col-span-5 flex-col items-center justify-center pt-20">
            <div className="relative w-full max-w-[340px]">
              {/* Central hub */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-xl shadow-purple-500/30 grid place-items-center text-white">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>

              {/* SVG curved connectors */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 340 380" fill="none">
                <path d="M170 80 C170 120, 60 120, 60 160" stroke="#D8B4FE" strokeWidth="1.5" strokeDasharray="4 4" />
                <path d="M170 80 C170 120, 170 130, 170 160" stroke="#C4B5FD" strokeWidth="1.5" strokeDasharray="4 4" />
                <path d="M170 80 C170 120, 280 120, 280 160" stroke="#D8B4FE" strokeWidth="1.5" strokeDasharray="4 4" />
                <path d="M60 200 C60 240, 110 250, 110 280" stroke="#E9D5FF" strokeWidth="1.5" strokeDasharray="4 4" />
                <path d="M280 200 C280 240, 230 250, 230 280" stroke="#E9D5FF" strokeWidth="1.5" strokeDasharray="4 4" />
              </svg>

              {/* Workflow nodes — Row 1 */}
              <div className="mt-10 grid grid-cols-3 gap-4">
                {[
                  { icon: '📝', label: 'Transcript', bg: 'from-violet-50 to-purple-50', border: 'border-violet-200/60' },
                  { icon: '📍', label: 'Location', bg: 'from-blue-50 to-sky-50', border: 'border-blue-200/60' },
                  { icon: '🛒', label: 'Shopping', bg: 'from-amber-50 to-orange-50', border: 'border-amber-200/60' },
                ].map((node) => (
                  <div key={node.label} className={`rounded-2xl bg-gradient-to-b ${node.bg} border ${node.border} p-3 text-center shadow-sm hover:-translate-y-1 transition-transform duration-300`}>
                    <span className="text-xl">{node.icon}</span>
                    <p className="mt-1 text-[10px] font-semibold text-zinc-600">{node.label}</p>
                  </div>
                ))}
              </div>

              {/* Workflow nodes — Row 2 */}
              <div className="mt-6 grid grid-cols-3 gap-4 px-8">
                {[
                  { icon: '🍳', label: 'Recipe', bg: 'from-rose-50 to-pink-50', border: 'border-rose-200/60' },
                  { icon: '📅', label: 'Calendar', bg: 'from-green-50 to-emerald-50', border: 'border-green-200/60' },
                ].map((node) => (
                  <div key={node.label} className={`rounded-2xl bg-gradient-to-b ${node.bg} border ${node.border} p-3 text-center shadow-sm hover:-translate-y-1 transition-transform duration-300`}>
                    <span className="text-xl">{node.icon}</span>
                    <p className="mt-1 text-[10px] font-semibold text-zinc-600">{node.label}</p>
                  </div>
                ))}
              </div>

              {/* Output badge */}
              <div className="mt-8 mx-auto max-w-[200px] rounded-2xl bg-white/90 backdrop-blur-sm border border-purple-100/80 p-3 shadow-lg text-center">
                <p className="text-[10px] font-semibold text-violet-600">✨ AI Processed</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">All data extracted & categorized</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          3. FEED CATEGORIES — Minimalist with subtle decorations
         ═══════════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute right-12 top-8 h-16 w-16 rounded-full bg-purple-100/30 blur-xl animate-float" />

        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3.5 py-1.5 text-[11px] font-semibold text-orange-600 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            Browse by Category
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Feed Categories
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 max-w-md mx-auto">
            Choose a category to explore curated Instagram feeds across food, travel, events, and recipes.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {[
            {
              title: 'Foodspots',
              desc: 'Restaurants & cafes',
              icon: '🍔',
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
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
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

      {/* ═══════════════════════════════════════════════════════════════
          3b. LIBRARY — a row of reel cards per category. Renders nothing
          until something has been analyzed, so a first run still reads as
          a landing page rather than a wall of empty shelves.
         ═══════════════════════════════════════════════════════════════ */}
      <CategoryRows />

      {/* ═══════════════════════════════════════════════════════════════
          4. MAP PREVIEW — Dashboard layout with illustration
         ═══════════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-dots-light opacity-20" />
        
        <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left — Text */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1.5 text-[11px] font-semibold text-blue-600 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              Discover Places
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              Every Reel on<br />Your Map
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-500">
              Automatically pin every restaurant, café, hotel, and landmark from your analyzed reels onto an interactive map. Plan visits, discover nearby spots, and never lose a location again.
            </p>
            
            {/* Floating badges */}
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> 24 Places
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-100 px-3.5 py-1.5 text-xs font-semibold text-violet-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6.5 3.6h11a1 1 0 0 1 1 1v15.2l-6.5-4-6.5 4V4.6a1 1 0 0 1 1-1Z" /></svg>
                Saved
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-3.5 py-1.5 text-xs font-semibold text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Nearby
              </span>
            </div>

            <Link href="/map" className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-95 shadow-lg shadow-black/10">
              Explore Map
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </Link>
          </div>

          {/* Right — Map Illustration */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#F0F9FF] via-[#E8F4FD] to-[#F0EBFF] border border-blue-100/50 p-1 shadow-xl shadow-blue-900/5">
              <div className="rounded-[24px] bg-white/60 backdrop-blur-sm p-6 min-h-[320px] relative overflow-hidden">
                {/* Abstract map grid */}
                <div className="absolute inset-0 opacity-[0.08]">
                  <svg width="100%" height="100%" viewBox="0 0 400 320">
                    {/* Horizontal lines */}
                    {[40,80,120,160,200,240,280].map((y) => (
                      <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#8B5CF6" strokeWidth="0.5" />
                    ))}
                    {/* Vertical lines */}
                    {[50,100,150,200,250,300,350].map((x) => (
                      <line key={`v${x}`} x1={x} y1="0" x2={x} y2="320" stroke="#8B5CF6" strokeWidth="0.5" />
                    ))}
                    {/* Roads */}
                    <path d="M80 0 Q120 160, 300 200" stroke="#A78BFA" strokeWidth="2" fill="none" opacity="0.5" />
                    <path d="M0 100 Q200 80, 400 180" stroke="#93C5FD" strokeWidth="2" fill="none" opacity="0.5" />
                  </svg>
                </div>

                {/* Map pins */}
                {[
                  { x: '20%', y: '30%', color: 'bg-rose-500', label: 'Café Mocha', size: 'w-4 h-4' },
                  { x: '45%', y: '20%', color: 'bg-violet-500', label: 'Pasta Roma', size: 'w-5 h-5' },
                  { x: '70%', y: '45%', color: 'bg-blue-500', label: 'Sunset Point', size: 'w-4 h-4' },
                  { x: '35%', y: '65%', color: 'bg-emerald-500', label: 'Green Garden', size: 'w-3.5 h-3.5' },
                  { x: '80%', y: '25%', color: 'bg-amber-500', label: 'Market St', size: 'w-3.5 h-3.5' },
                  { x: '55%', y: '70%', color: 'bg-pink-500', label: 'Beach Club', size: 'w-4 h-4' },
                ].map((pin) => (
                  <div key={pin.label} className="absolute group" style={{ left: pin.x, top: pin.y }}>
                    <div className={`${pin.size} ${pin.color} rounded-full shadow-lg ring-2 ring-white animate-pulse cursor-pointer`} />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg">
                      {pin.label}
                    </div>
                  </div>
                ))}

                {/* Route line */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M20 30 Q32 40, 45 20 Q55 35, 70 45" stroke="#8B5CF6" strokeWidth="0.4" fill="none" strokeDasharray="2 2" opacity="0.5" />
                </svg>

                {/* Floating popup */}
                <div className="absolute right-4 top-4 rounded-2xl bg-white/95 backdrop-blur-md border border-purple-100/60 p-3 shadow-lg max-w-[160px]">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 grid place-items-center text-white text-xs">📍</div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-900">Pasta Roma</p>
                      <p className="text-[9px] text-zinc-500">Italian • ⭐ 4.8</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom location cards */}
            <div className="mt-5 grid grid-cols-4 gap-3">
              {[
                { name: 'Café Mocha', city: 'Mumbai', rating: '4.7', img: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=200&q=80' },
                { name: 'Sunset Point', city: 'Goa', rating: '4.9', img: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=200&q=80' },
                { name: 'Green Garden', city: 'Bangalore', rating: '4.5', img: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=200&q=80' },
                { name: 'Beach Club', city: 'Kerala', rating: '4.8', img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=200&q=80' },
              ].map((loc) => (
                <div key={loc.name} className="rounded-xl bg-white border border-zinc-100 overflow-hidden shadow-sm hover:-translate-y-0.5 transition-transform duration-200">
                  <div className="h-14 overflow-hidden">
                    <img src={loc.img} alt={loc.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-bold text-zinc-900 truncate">{loc.name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[9px] text-zinc-500">{loc.city}</p>
                      <p className="text-[9px] text-amber-600 font-semibold">⭐ {loc.rating}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          5. SAVED PREVIEW — Pinterest + Notion masonry grid
         ═══════════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 overflow-hidden">
        <div className="pointer-events-none absolute -right-20 top-1/4 h-40 w-40 rounded-full bg-gradient-to-br from-pink-100/40 to-purple-100/30 blur-3xl" />

        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3.5 py-1.5 text-[11px] font-semibold text-pink-600 mb-4">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6.5 3.6h11a1 1 0 0 1 1 1v15.2l-6.5-4-6.5 4V4.6a1 1 0 0 1 1-1Z" /></svg>
            Your Collection
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Save &amp; Organize Reels
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 max-w-md mx-auto">
            Build your personal library of analyzed reels, organized by category. Never lose a recommendation again.
          </p>

          {/* Floating category chips */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              { label: 'Food', color: 'bg-orange-50 text-orange-600 border-orange-100' },
              { label: 'Travel', color: 'bg-sky-50 text-sky-600 border-sky-100' },
              { label: 'Recipes', color: 'bg-rose-50 text-rose-600 border-rose-100' },
              { label: 'Shopping', color: 'bg-amber-50 text-amber-600 border-amber-100' },
              { label: 'Events', color: 'bg-purple-50 text-purple-600 border-purple-100' },
            ].map((chip) => (
              <span key={chip.label} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${chip.color}`}>{chip.label}</span>
            ))}
          </div>
        </div>

        {/* Masonry Grid */}
        <div className="columns-2 sm:columns-3 gap-4 space-y-4">
          {[
            { title: 'Best Pasta in Bandra', cat: 'Food', catColor: 'bg-orange-500', loc: 'Mumbai, India', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80', h: 'h-52' },
            { title: 'Hidden Beach Paradise', cat: 'Travel', catColor: 'bg-sky-500', loc: 'Bali, Indonesia', img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80', h: 'h-72' },
            { title: 'Sourdough Bread Recipe', cat: 'Recipe', catColor: 'bg-rose-500', loc: 'Home Kitchen', img: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=400&q=80', h: 'h-56' },
            { title: 'Summer Collection 2026', cat: 'Shopping', catColor: 'bg-amber-500', loc: 'Milan, Italy', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80', h: 'h-64' },
            { title: 'Sunset Rooftop Café', cat: 'Food', catColor: 'bg-orange-500', loc: 'Santorini, Greece', img: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=400&q=80', h: 'h-48' },
            { title: 'Music Festival 2026', cat: 'Events', catColor: 'bg-purple-500', loc: 'Goa, India', img: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80', h: 'h-60' },
          ].map((card) => (
            <div key={card.title} className="break-inside-avoid group relative overflow-hidden rounded-[20px] bg-white border border-zinc-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className={`${card.h} relative overflow-hidden`}>
                <img src={card.img} alt={card.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                
                {/* Category badge */}
                <span className={`absolute top-3 left-3 ${card.catColor} text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm`}>
                  {card.cat}
                </span>

                {/* Save icon */}
                <button className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-white/90 backdrop-blur-sm text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white hover:text-violet-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.5 3.6h11a1 1 0 0 1 1 1v15.2l-6.5-4-6.5 4V4.6a1 1 0 0 1 1-1Z" /></svg>
                </button>

                {/* Bottom overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-sm font-bold text-white truncate">{card.title}</h3>
                  <p className="text-[10px] text-white/80 flex items-center gap-1 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 21s6.5-6.1 6.5-10.5A6.5 6.5 0 0 0 5.5 10.5C5.5 14.9 12 21 12 21Z" /></svg>
                    {card.loc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/saved" className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-6 py-3 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 hover:shadow-md">
            View All Saved
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          6. HISTORY TIMELINE — Modern vertical timeline + stats
         ═══════════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-purple-200/40 to-transparent hidden lg:block" />

        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-[11px] font-semibold text-emerald-600 mb-4">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="8.4" /><path d="M12 7.2V12l3.2 2" /></svg>
            Analysis History
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Your Analysis Timeline
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 max-w-md mx-auto">
            Track every reel you&apos;ve analyzed with AI-powered categorization and processing history.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Timeline */}
          <div className="lg:col-span-8 space-y-0">
            {[
              { date: 'Today, 2:30 PM', title: 'Best Pizza in Mumbai', cat: 'Food', catColor: 'bg-orange-100 text-orange-700', status: 'Completed', time: '4.2s', confidence: '98%', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80' },
              { date: 'Today, 11:15 AM', title: 'Santorini Travel Guide', cat: 'Travel', catColor: 'bg-sky-100 text-sky-700', status: 'Completed', time: '6.1s', confidence: '95%', img: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=200&q=80' },
              { date: 'Yesterday', title: 'Homemade Pasta Recipe', cat: 'Recipe', catColor: 'bg-rose-100 text-rose-700', status: 'Completed', time: '3.8s', confidence: '97%', img: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=200&q=80' },
              { date: '2 days ago', title: 'Summer Fashion Haul', cat: 'Shopping', catColor: 'bg-amber-100 text-amber-700', status: 'Completed', time: '5.4s', confidence: '91%', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=200&q=80' },
            ].map((entry, i) => (
              <div key={entry.title} className="relative flex gap-5 pb-8 last:pb-0">
                {/* Connector */}
                {i < 3 && (
                  <span className="absolute left-[19px] top-12 h-[calc(100%-48px)] w-[2px] bg-gradient-to-b from-violet-300 to-purple-100" />
                )}
                {/* Node */}
                <div className="relative z-10 mt-1">
                  <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-violet-100 to-purple-50 border-2 border-violet-200 shadow-sm">
                    <div className="size-3 rounded-full bg-violet-500" />
                  </div>
                </div>
                {/* Card */}
                <div className="flex-1 rounded-[20px] bg-white border border-zinc-100 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-zinc-400 font-medium">{entry.date}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${entry.catColor}`}>{entry.cat}</span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="h-16 w-12 shrink-0 rounded-xl overflow-hidden">
                      <img src={entry.img} alt={entry.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-zinc-900 truncate">{entry.title}</h4>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {entry.status}
                        </span>
                        <span className="text-zinc-400 font-mono">{entry.time}</span>
                        <span className="text-violet-600 font-semibold">{entry.confidence} match</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-4 text-center">
              <Link href="/history" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700 transition">
                View Full History
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 rounded-[24px] bg-gradient-to-b from-[#F8F5FF] to-white border border-purple-100/50 p-6 shadow-sm">
              <h3 className="text-base font-bold text-zinc-900 mb-6">Statistics</h3>

              <div className="space-y-5">
                {[
                  { label: 'Total Reels', value: '847', pct: 85, color: '#8B5CF6' },
                  { label: 'Places Found', value: '234', pct: 72, color: '#3B82F6' },
                  { label: 'Recipes', value: '156', pct: 58, color: '#F43F5E' },
                  { label: 'Products', value: '89', pct: 40, color: '#F59E0B' },
                  { label: 'Deadlines', value: '42', pct: 25, color: '#10B981' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-4">
                    {/* Circular progress */}
                    <div className="relative shrink-0">
                      <svg width="48" height="48" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="#F3F4F6" strokeWidth="3" />
                        <circle
                          cx="24" cy="24" r="20"
                          fill="none"
                          stroke={stat.color}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${stat.pct * 1.256} 125.6`}
                          transform="rotate(-90 24 24)"
                          style={{ animation: 'progress-fill 1.5s ease-out both' }}
                        />
                      </svg>
                      <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-zinc-700">
                        {stat.pct}%
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">{stat.label}</p>
                      <p className="text-lg font-extrabold text-zinc-900">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          7. FEATURES — Alternating left/right with illustrations
         ═══════════════════════════════════════════════════════════════ */}
      <section id="features-section" className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/90 px-3.5 py-1.5 text-[11px] font-semibold text-violet-700 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
            Powerful Features
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Everything You Need to<br />Unlock Reel Intelligence
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 max-w-md mx-auto">
            Six powerful AI tools that transform every Instagram reel into actionable, searchable knowledge.
          </p>
        </div>

        <div className="space-y-20">
          {[
            {
              title: 'AI Transcript',
              desc: 'Automatically transcribe audio from any reel into text. Supports 50+ languages with native and English translations. Search through transcripts to find exactly what you need.',
              icon: '📝',
              gradient: 'from-violet-50 to-purple-50',
              border: 'border-violet-200/60',
              accentColor: 'text-violet-600',
              pillColor: 'bg-violet-100 text-violet-700',
              illustration: (
                <div className="relative p-6">
                  <div className="rounded-2xl bg-white border border-violet-100/60 p-4 shadow-md">
                    <div className="flex items-center gap-2 mb-3"><span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" /><span className="text-[10px] font-bold text-violet-600">Live Transcription</span></div>
                    <div className="space-y-2">
                      <div className="h-2 rounded-full bg-violet-100 w-full" /><div className="h-2 rounded-full bg-violet-100 w-4/5" /><div className="h-2 rounded-full bg-violet-100 w-3/5" />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-600">English</span>
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-semibold text-purple-600">Hindi</span>
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 rounded-xl bg-violet-500 text-white p-2 text-[10px] font-bold shadow-lg">50+ Languages</div>
                </div>
              ),
            },
            {
              title: 'Location Detection',
              desc: 'Extract restaurants, cafés, landmarks, and hotels from reels and pin them on an interactive map. Get addresses, ratings, and nearby recommendations automatically.',
              icon: '📍',
              gradient: 'from-blue-50 to-sky-50',
              border: 'border-blue-200/60',
              accentColor: 'text-blue-600',
              pillColor: 'bg-blue-100 text-blue-700',
              illustration: (
                <div className="relative p-6">
                  <div className="rounded-2xl bg-white border border-blue-100/60 p-4 shadow-md">
                    <div className="flex items-center gap-2 mb-3"><span className="text-sm">📍</span><span className="text-[10px] font-bold text-blue-600">Detected Locations</span></div>
                    <div className="space-y-2">
                      {['Café Mocha, Mumbai', 'Sunset Bistro, Goa', 'Sky Lounge, Bangalore'].map((loc) => (
                        <div key={loc} className="flex items-center gap-2 rounded-lg bg-blue-50 p-2 text-[10px] text-zinc-700"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />{loc}</div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute -top-2 -left-2 rounded-xl bg-blue-500 text-white p-2 text-[10px] font-bold shadow-lg">Auto-Pin 📌</div>
                </div>
              ),
            },
            {
              title: 'Shopping Detection',
              desc: 'Identify products, brands, prices, and purchase links mentioned in reels. Track deals, compare prices, and never miss a sale from your favorite creators.',
              icon: '🛒',
              gradient: 'from-amber-50 to-orange-50',
              border: 'border-amber-200/60',
              accentColor: 'text-amber-600',
              pillColor: 'bg-amber-100 text-amber-700',
              illustration: (
                <div className="relative p-6">
                  <div className="rounded-2xl bg-white border border-amber-100/60 p-4 shadow-md">
                    <div className="flex items-center gap-2 mb-3"><span className="text-sm">🛒</span><span className="text-[10px] font-bold text-amber-600">Products Found</span></div>
                    <div className="space-y-2">
                      {[{ name: 'Summer Dress', price: '₹1,299' }, { name: 'Sneakers', price: '₹4,999' }, { name: 'Sunglasses', price: '₹899' }].map((item) => (
                        <div key={item.name} className="flex items-center justify-between rounded-lg bg-amber-50 p-2 text-[10px]">
                          <span className="text-zinc-700 font-medium">{item.name}</span><span className="text-amber-700 font-bold">{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -left-2 rounded-xl bg-amber-500 text-white p-2 text-[10px] font-bold shadow-lg">Price Alerts</div>
                </div>
              ),
            },
            {
              title: 'Recipe Detection',
              desc: 'Extract full recipes including ingredients, steps, cooking time, and serving size from food reels. Save them to your personal cookbook for easy access anytime.',
              icon: '🍳',
              gradient: 'from-rose-50 to-pink-50',
              border: 'border-rose-200/60',
              accentColor: 'text-rose-600',
              pillColor: 'bg-rose-100 text-rose-700',
              illustration: (
                <div className="relative p-6">
                  <div className="rounded-2xl bg-white border border-rose-100/60 p-4 shadow-md">
                    <div className="flex items-center gap-2 mb-3"><span className="text-sm">🍳</span><span className="text-[10px] font-bold text-rose-600">Recipe Extracted</span></div>
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-zinc-800">Butter Chicken</div>
                      <div className="flex gap-3 text-[9px] text-zinc-500"><span>⏱ 45 min</span><span>👥 4 servings</span></div>
                      <div className="flex flex-wrap gap-1 mt-1">{['Chicken', 'Butter', 'Tomato', 'Cream'].map((ing) => (<span key={ing} className="rounded-full bg-rose-50 px-2 py-0.5 text-[8px] font-medium text-rose-600">{ing}</span>))}</div>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 rounded-xl bg-rose-500 text-white p-2 text-[10px] font-bold shadow-lg">Save Recipe 📖</div>
                </div>
              ),
            },
            {
              title: 'Travel Planner',
              desc: 'Turn travel reels into full itineraries with day-by-day plans, maps, estimated budgets, and booking links. Plan your next trip from the reels that inspired you.',
              icon: '✈️',
              gradient: 'from-emerald-50 to-green-50',
              border: 'border-emerald-200/60',
              accentColor: 'text-emerald-600',
              pillColor: 'bg-emerald-100 text-emerald-700',
              illustration: (
                <div className="relative p-6">
                  <div className="rounded-2xl bg-white border border-emerald-100/60 p-4 shadow-md">
                    <div className="flex items-center gap-2 mb-3"><span className="text-sm">✈️</span><span className="text-[10px] font-bold text-emerald-600">Trip Itinerary</span></div>
                    <div className="space-y-1.5">
                      {['Day 1: Arrive at Bali', 'Day 2: Temple Tour', 'Day 3: Beach Day'].map((day, i) => (
                        <div key={day} className="flex items-center gap-2 text-[10px] text-zinc-700">
                          <span className={`h-5 w-5 rounded-full grid place-items-center text-[8px] font-bold text-white ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-emerald-400' : 'bg-emerald-300'}`}>{i + 1}</span>
                          {day}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 rounded-xl bg-emerald-500 text-white p-2 text-[10px] font-bold shadow-lg">Est. ₹25K</div>
                </div>
              ),
            },
            {
              title: 'Deadline Finder',
              desc: 'Never miss a limited-time offer, event date, or registration deadline mentioned in reels. Get smart reminders before deadlines expire so you can act in time.',
              icon: '📅',
              gradient: 'from-indigo-50 to-blue-50',
              border: 'border-indigo-200/60',
              accentColor: 'text-indigo-600',
              pillColor: 'bg-indigo-100 text-indigo-700',
              illustration: (
                <div className="relative p-6">
                  <div className="rounded-2xl bg-white border border-indigo-100/60 p-4 shadow-md">
                    <div className="flex items-center gap-2 mb-3"><span className="text-sm">📅</span><span className="text-[10px] font-bold text-indigo-600">Upcoming Deadlines</span></div>
                    <div className="space-y-2">
                      {[{ event: 'Flash Sale', days: '2 days left', status: 'bg-red-100 text-red-700' }, { event: 'Event Registration', days: '5 days left', status: 'bg-amber-100 text-amber-700' }, { event: 'Early Bird Offer', days: '12 days left', status: 'bg-emerald-100 text-emerald-700' }].map((dl) => (
                        <div key={dl.event} className="flex items-center justify-between rounded-lg bg-indigo-50 p-2 text-[10px]">
                          <span className="text-zinc-700 font-medium">{dl.event}</span><span className={`rounded-full px-2 py-0.5 font-bold ${dl.status}`}>{dl.days}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute -top-2 -left-2 rounded-xl bg-indigo-500 text-white p-2 text-[10px] font-bold shadow-lg">🔔 Smart Alerts</div>
                </div>
              ),
            },
          ].map((feature, i) => (
            <div key={feature.title} className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 ${i % 2 === 1 ? 'lg:direction-rtl' : ''}`}>
              {/* Content */}
              <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold mb-4 ${feature.pillColor}`}>
                  {feature.icon} {feature.title}
                </span>
                <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500 max-w-md">
                  {feature.desc}
                </p>
              </div>
              {/* Illustration */}
              <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
                <div className={`rounded-[24px] bg-gradient-to-br ${feature.gradient} border ${feature.border} p-4 shadow-sm`}>
                  {feature.illustration}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          8. PRICING — Glass cards + trust section
         ═══════════════════════════════════════════════════════════════ */}
      <section id="pricing-section" className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative text-center max-w-xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/90 px-3.5 py-1.5 text-[11px] font-semibold text-violet-700 mb-4">
            💎 Simple Pricing
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Choose Your Plan
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            Start free, upgrade when you need more. Cancel anytime.
          </p>
        </div>

        <div className="relative mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-center">
          {/* Basic */}
          <div className="rounded-[24px] bg-white border border-zinc-200/80 p-7 sm:p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <span className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-lg">🌱</span>
              <h3 className="text-lg font-bold text-zinc-900">Basic</h3>
            </div>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-extrabold text-zinc-900">₹0</span>
              <span className="text-sm text-zinc-400">/month</span>
            </div>
            <ul className="space-y-3 text-sm text-zinc-600 mb-8">
              {[
                { icon: '🔗', text: '5 Feed Extractions / month' },
                { icon: '📊', text: 'Basic Insights' },
                { icon: '💬', text: 'Community Support' },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-2.5">
                  <span className="text-xs">{item.icon}</span>
                  <span className="text-xs">{item.text}</span>
                </li>
              ))}
            </ul>
            <button onClick={scrollToAnalyze} className="w-full rounded-2xl border border-zinc-200 bg-white py-3.5 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition shadow-sm">
              Get Started Free
            </button>
          </div>

          {/* Pro — highlighted */}
          <div className="relative rounded-[24px] bg-white border-2 border-violet-600 p-7 sm:p-8 shadow-md lg:-translate-y-2">
            <span className="absolute -top-3.5 right-6 rounded-full bg-violet-600 px-4 py-1 text-[10px] font-bold text-white shadow-sm">
              ✨ Most Popular
            </span>
            <div className="flex items-center gap-3 mb-6">
              <span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-lg">🚀</span>
              <h3 className="text-lg font-bold text-zinc-900">Pro</h3>
            </div>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-extrabold text-zinc-900">₹299</span>
              <span className="text-sm text-zinc-400">/month</span>
            </div>
            <ul className="space-y-3 text-sm text-zinc-700 mb-8">
              {[
                { icon: '♾️', text: 'Unlimited Extractions' },
                { icon: '🧠', text: 'Advanced AI Insights' },
                { icon: '⚡', text: 'Priority Processing' },
                { icon: '📤', text: 'Export All Data' },
                { icon: '🔔', text: 'Smart Reminders' },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-2.5">
                  <span className="text-xs">{item.icon}</span>
                  <span className="text-xs font-medium">{item.text}</span>
                </li>
              ))}
            </ul>
            <button onClick={scrollToAnalyze} className="w-full rounded-2xl bg-violet-600 py-3.5 text-center text-sm font-semibold text-white shadow-md hover:bg-violet-700 transition">
              Upgrade to Pro
            </button>
          </div>

          {/* Premium */}
          <div className="rounded-[24px] bg-white border border-zinc-200/80 p-7 sm:p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-lg">👑</span>
              <h3 className="text-lg font-bold text-zinc-900">Premium</h3>
            </div>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-extrabold text-zinc-900">₹599</span>
              <span className="text-sm text-zinc-400">/month</span>
            </div>
            <ul className="space-y-3 text-sm text-zinc-600 mb-8">
              {[
                { icon: '🚀', text: 'All Pro Features' },
                { icon: '🔌', text: 'API Access' },
                { icon: '📋', text: 'Custom Reports' },
                { icon: '🎯', text: 'Dedicated Support' },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-2.5">
                  <span className="text-xs">{item.icon}</span>
                  <span className="text-xs">{item.text}</span>
                </li>
              ))}
            </ul>
            <button onClick={scrollToAnalyze} className="w-full rounded-2xl border border-zinc-200 bg-white py-3.5 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition shadow-sm">
              Contact Sales
            </button>
          </div>
        </div>

        {/* Trust Section */}
        <div className="relative mt-16 flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-12">
          {[
            { label: 'Trusted by 2,400+ Students', color: 'bg-violet-100 border-violet-200' },
            { label: 'Trusted by 1,800+ Creators', color: 'bg-pink-100 border-pink-200' },
            { label: 'Trusted by 3,100+ Travelers', color: 'bg-sky-100 border-sky-200' },
          ].map((group) => (
            <div key={group.label} className="flex items-center gap-3">
              {/* Overlapping avatars */}
              <div className="flex -space-x-2">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className={`h-8 w-8 rounded-full ${group.color} border-2 border-white grid place-items-center text-[10px] font-bold text-zinc-600`}>
                    {['A', 'B', 'C', '+'][j]}
                  </div>
                ))}
              </div>
              <span className="text-xs font-semibold text-zinc-600">{group.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          9. CTA — Full-width rounded banner
         ═══════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#FAF8FF] via-[#F4EFFF] to-[#FAF6FF] p-10 sm:p-14 text-center shadow-sm border border-purple-100">
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl lg:text-4xl">
              Ready to Organize<br />Every Reel?
            </h2>
            <p className="mt-3 max-w-lg mx-auto text-base leading-relaxed text-zinc-600">
              Let AI remember every place, recipe, deal, and deadline from your saved reels. Start analyzing for free — no credit card required.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={scrollToAnalyze}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-95 shadow-md shadow-zinc-900/10"
              >
                Analyze a Reel
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
              <button
                onClick={scrollToFeatures}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-8 py-3.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                View Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          10. FOOTER — Premium multi-column
         ═══════════════════════════════════════════════════════════════ */}
      <footer className="relative mt-10 overflow-hidden">
        {/* Gradient top border */}
        <div className="h-px bg-gradient-to-r from-transparent via-purple-300/60 to-transparent" />
        
        <div className="bg-gradient-to-b from-[#FAFAFF] to-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
              {/* Brand column */}
              <div className="col-span-2 sm:col-span-4 lg:col-span-2 pr-4">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                  </span>
                  <span className="text-lg font-bold tracking-tight text-zinc-900">ReelInfoga</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-500 max-w-xs">
                  AI-powered Instagram intelligence. Turn saved reels into searchable recipes, locations, transcripts, and actionable deadlines.
                </p>
                {/* Social icons */}
                <div className="mt-6 flex gap-3">
                  {[
                    { label: 'GitHub', path: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22' },
                    { label: 'Twitter', path: 'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z' },
                    { label: 'Instagram', path: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01M2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2 10 10 0 0 0 2 12z' },
                  ].map((social) => (
                    <a key={social.label} href="#" aria-label={social.label} className="grid size-9 place-items-center rounded-xl border border-zinc-100 bg-white text-zinc-400 transition hover:border-purple-200 hover:text-violet-600 hover:shadow-sm">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={social.path} /></svg>
                    </a>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-4">Navigate</h4>
                <ul className="space-y-2.5">
                  {[{ label: 'Analyze', href: '/' }, { label: 'Reels', href: '/reels' }, { label: 'Map', href: '/map' }, { label: 'Saved', href: '/saved' }, { label: 'History', href: '/history' }].map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-zinc-500 hover:text-violet-600 transition">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-4">Resources</h4>
                <ul className="space-y-2.5">
                  {['Documentation', 'API Reference', 'Changelog', 'Status'].map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-zinc-500 hover:text-violet-600 transition">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-4">Legal</h4>
                <ul className="space-y-2.5">
                  {['Privacy Policy', 'Terms of Service', 'Contact Us'].map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-zinc-500 hover:text-violet-600 transition">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Divider + copyright */}
            <div className="mt-12 pt-6 border-t border-zinc-100">
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-xs text-zinc-400">
                  © 2026 ReelInfoga. All rights reserved.
                </p>
                <p className="text-xs text-zinc-400">
                  Made with <span className="text-rose-500">❤️</span> by Team Yukti
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
