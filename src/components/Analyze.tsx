'use client';

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

const CTA: Record<string, string> = {
  food_spot: 'Open food spot view',
  deadline: 'Open deadline view',
  travel: 'Open travel view',
  recipe: 'Open recipe view',
  product: 'Open comparison view',
  other: 'Open full breakdown',
};

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

  // The metadata card appears as soon as the reel has been fetched — roughly
  // 15s in rather than 40s. It's the first proof to the user that this is real.
  const fetched = stages.find((s) => s.id === 'downloading')?.status === 'completed';
  const p = result?.food_spot ?? {};
  const cat = categoryOf(result?.category);
  const title =
    p.place_name ?? p.title ?? p.dish_name ?? p.destination ?? p.product_category;
  const where = [p.area, p.city, p.state].filter(Boolean).join(', ');
  const d = daysUntil(p.deadline_date);

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <h1 className="text-[28px] font-bold tracking-[-0.02em] sm:text-[32px]">
        Analyze a reel
      </h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">
        We watch the video, read the on-screen text, listen to the audio, and pull out
        what actually matters.
      </p>

      <form onSubmit={submit} className="mt-7 flex flex-col gap-2.5 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste an Instagram reel link"
          className="flex-1 rounded-xl border border-line bg-surface px-4 py-3.5 text-sm
                     outline-none placeholder:text-ink-faint focus:border-primary/50"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-white
                     transition hover:bg-[#6D28D9] disabled:bg-[#E4E4E7] disabled:text-ink-faint"
        >
          {busy ? 'Analyzing…' : 'Analyze'}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl bg-[#FEE2E2] px-4 py-3 text-sm text-[#B91C1C]">
          {error}
        </p>
      )}

      {stages.length > 0 && (
        <ol className="mt-9">
          {stages.map((s, i) => (
            <li key={s.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Connecting rail. A vertical stepper reads as a log; a horizontal
                  one truncates its labels and reads as a checkout wizard. */}
              {i < stages.length - 1 && (
                <span
                  className="absolute left-[7px] top-5 h-full w-px"
                  style={{
                    background:
                      s.status === 'completed' ? 'var(--primary)' : 'var(--border)',
                  }}
                />
              )}
              <span className="relative z-10 mt-[3px] grid size-[15px] shrink-0 place-items-center">
                {s.status === 'completed' ? (
                  <span className="size-[13px] rounded-full bg-primary" />
                ) : s.status === 'processing' ? (
                  <>
                    <span className="absolute size-[15px] animate-ping rounded-full bg-primary/30" />
                    <span className="size-[13px] rounded-full border-[3px] border-primary bg-surface" />
                  </>
                ) : s.status === 'error' ? (
                  <span className="size-[13px] rounded-full bg-[#DC2626]" />
                ) : (
                  <span className="size-[11px] rounded-full border-[1.5px] border-line bg-surface" />
                )}
              </span>

              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                <span
                  className={`text-[15px] ${
                    s.status === 'pending'
                      ? 'text-ink-faint'
                      : s.status === 'processing'
                        ? 'font-medium text-ink'
                        : 'text-ink'
                  }`}
                >
                  {s.label}
                  {s.status === 'processing' && '…'}
                </span>
                <span className="tnum shrink-0 text-xs text-ink-faint">
                  {s.detail ?? (s.status === 'processing' ? `${elapsed.toFixed(1)}s` : '')}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}

      {(fetched || result) && (
        <Card className="mt-2 flex gap-4 p-4">
          <Thumb
            shortcode={result?.reel.shortcode ?? ''}
            category={result?.category}
            size={64}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-muted">
              {result
                ? [
                    `@${result.reel.owner}`,
                    result.reel.likes ? `${result.reel.likes.toLocaleString('en-IN')} likes` : null,
                    result.reel.video_duration ? `${Math.round(result.reel.video_duration)}s` : null,
                    result.transcript.language?.toUpperCase(),
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'Fetched — reading it now'}
            </p>
            <p className="mt-1 line-clamp-2 text-sm">
              {result?.reel.caption || 'No caption'}
            </p>
          </div>
        </Card>
      )}

      {result && (
        <div className="mt-8 border-t border-line pt-8">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="violet">{cat.one}</Pill>
            {p.confidence && (
              <Pill tone={p.confidence === 'high' ? 'ok' : p.confidence === 'medium' ? 'warn' : 'flat'}>
                {p.confidence} confidence
              </Pill>
            )}
            {d !== null && <Pill tone={countdown(d, p.deadline_passed).tone}>{countdown(d, p.deadline_passed).text}</Pill>}
          </div>

          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.02em]">
            {title ?? 'Extracted'}
          </h2>
          {where && <p className="mt-1 text-ink-muted">{where}</p>}
          {(p.summary || p.description) && (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
              {p.summary || p.description}
            </p>
          )}

          <Link
            href={`/reel/${result.reel.shortcode}`}
            className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold
                       text-white transition hover:bg-[#6D28D9]"
          >
            {CTA[result.category] ?? 'Open full view'} →
          </Link>
        </div>
      )}
    </div>
  );
}
