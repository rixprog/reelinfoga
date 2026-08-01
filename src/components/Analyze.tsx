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

function Meta({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex gap-2">
      {k && <dt className="shrink-0 text-ink-faint">{k}:</dt>}
      <dd className={strong ? 'font-semibold' : 'text-ink-muted'}>{v}</dd>
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
                  className="absolute left-[8px] top-6 h-full w-[1.5px]"
                  style={{
                    background:
                      s.status === 'completed' ? 'var(--primary)' : 'var(--border)',
                  }}
                />
              )}
              <span className="relative z-10 mt-[2px] grid size-[18px] shrink-0 place-items-center">
                {s.status === 'completed' ? (
                  <span className="grid size-[18px] place-items-center rounded-full bg-primary">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                         stroke="#fff" strokeWidth="3.4" strokeLinecap="round"
                         strokeLinejoin="round">
                      <path d="M4 12.5 9.5 18 20 6.5" />
                    </svg>
                  </span>
                ) : s.status === 'processing' ? (
                  <>
                    <span className="absolute size-[18px] animate-ping rounded-full bg-primary/25" />
                    <span className="size-[18px] rounded-full border-[3px] border-primary bg-surface" />
                  </>
                ) : s.status === 'error' ? (
                  <span className="size-[13px] rounded-full bg-[#DC2626]" />
                ) : (
                  <span className="size-[16px] rounded-full border-[1.5px] border-[#D4D4D8] bg-surface" />
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
        <div className="mt-4">
          <div className="relative w-[210px] overflow-hidden rounded-2xl bg-background">
            <div className="aspect-[9/16]">
              <Thumb
                shortcode={result?.reel.shortcode ?? ''}
                category={result?.category}
                fill
              />
            </div>
            {result?.reel.video_duration ? (
              <span className="absolute right-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5
                               text-[11px] font-semibold tabular-nums text-white">
                {Math.floor(result.reel.video_duration / 60)}:
                {String(Math.round(result.reel.video_duration % 60)).padStart(2, '0')}
              </span>
            ) : null}
          </div>

          <dl className="mt-4 space-y-1.5 text-sm">
            {result ? (
              <>
                <Meta k="" v={`@${result.reel.owner}`} strong />
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
              </>
            ) : (
              <p className="text-ink-muted">Fetched — reading it now…</p>
            )}
          </dl>
        </div>
      )}

      {result && (
        <Card className="mt-6 p-5">
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

          <h2 className="mt-2 text-[22px] font-bold tracking-[-0.02em]">
            {title ?? 'Extracted'}
          </h2>
          {where && (
            <p className="mt-2 text-sm">
              <span className="text-ink-faint">Location: </span>
              <span className="text-ink-muted">{where}</span>
            </p>
          )}
          {(p.summary || p.description) && (
            <p className="mt-2 text-sm leading-relaxed">
              <span className="text-ink-faint">Summary: </span>
              <span className="text-ink-muted">{p.summary || p.description}</span>
            </p>
          )}

          <Link
            href={`/reel/${result.reel.shortcode}`}
            className="mt-5 flex w-full items-center justify-center rounded-xl bg-primary
                       px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#6D28D9]"
          >
            View details
          </Link>
        </Card>
      )}
    </div>
  );
}
