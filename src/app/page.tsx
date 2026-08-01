'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { DeadlineCard } from '@/components/DeadlineCard';
import { SavedList } from '@/components/SavedList';
import { TravelCard } from '@/components/TravelCard';
import { TripPlanner } from '@/components/TripPlanner';
import type { Opportunity, TravelExtraction } from '@/lib/deadline';
import {
  AnalyzeResult,
  CONFIDENCE_UI,
  SOURCE_LABEL,
  mapsUrl,
  whereLine,
} from '@/lib/food-spot';

interface Stage {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  detail?: string;
}

interface JobView {
  id: string;
  status: 'running' | 'done' | 'error';
  stages: Stage[];
  result: AnalyzeResult | null;
  error: string | null;
  elapsedMs: number;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [job, setJob] = useState<JobView | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll while the job runs. Cleared on unmount so a hot reload during dev
  // doesn't leave an orphaned timer hammering the route.
  const poll = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/analyze/${id}`, { cache: 'no-store' });
      const data: JobView = await res.json();
      setJob(data);
      if (data.status === 'running') {
        timer.current = setTimeout(() => poll(id), 900);
      } else {
        setBusy(false);
      }
    } catch {
      setSubmitError('Lost contact with the server.');
      setBusy(false);
    }
  }, []);

  // Deep-link support: /?job=<id> re-attaches to an existing job, so a reload
  // mid-analysis doesn't lose the run and a finished result stays shareable.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('job');
    if (id) {
      setBusy(true);
      poll(id);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poll]);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setSubmitError(null);
    setJob(null);
    setBusy(true);

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setSubmitError(data.error ?? 'Something went wrong.');
      setBusy(false);
      return;
    }
    window.history.replaceState(null, '', `/?job=${data.id}`);
    poll(data.id);
  }

  const result = job?.result;
  const category = result?.category ?? 'food_spot';
  const isDeadline = category === 'deadline';
  const isTravel = category === 'travel';
  // The pipeline returns each vertical's payload under the same `food_spot`
  // key; `category` is what says which shape it actually is.
  const fs = !isDeadline && !isTravel ? result?.food_spot : undefined;
  const op = isDeadline ? (result?.food_spot as unknown as Opportunity) : undefined;
  const tr = isTravel ? (result?.food_spot as unknown as TravelExtraction) : undefined;
  const conf = fs ? CONFIDENCE_UI[fs.confidence] : null;
  const evidence = (op?.evidence ?? tr?.evidence ?? fs?.evidence) ?? [];
  const reasoning = (op?.reasoning ?? tr?.reasoning ?? fs?.reasoning) ?? '';

  return (
    // flex-1, not min-h-full: body is `min-h-full flex flex-col`, so a min-height
    // child stops at content height and leaves the body's own (slightly different)
    // background showing below it as a seam.
    <div className="flex-1 bg-zinc-950 text-zinc-100">
      <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:py-20">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            ReelBrain
          </h1>
          <p className="mt-3 max-w-xl text-zinc-400">
            Paste any saved reel. We read the frames, listen to the audio, and pull
            out what actually matters — the restaurant, or the deadline you were
            going to forget.
          </p>
        </header>

        <form onSubmit={analyze} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3
                       text-sm outline-none placeholder:text-zinc-600
                       focus:border-zinc-600"
          />
          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="rounded-xl bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-900
                       transition hover:bg-white disabled:cursor-not-allowed
                       disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {busy ? 'Analysing…' : 'Analyse'}
          </button>
        </form>

        {submitError && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {submitError}
          </p>
        )}

        {/* Live stages. Watching these tick is what makes a 60s wait read as
            capability rather than lag. */}
        {job && job.stages.length > 0 && (
          <ol className="mt-8 space-y-2">
            {job.stages.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-900
                           bg-zinc-900/40 px-4 py-3 text-sm"
              >
                <StageDot status={s.status} />
                <span
                  className={s.status === 'pending' ? 'text-zinc-600' : 'text-zinc-200'}
                >
                  {s.label}
                </span>
                {s.detail && (
                  <span className="ml-auto truncate pl-3 text-xs text-zinc-500">
                    {s.detail}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}

        {job?.status === 'error' && (
          <div className="mt-6 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <p className="font-medium">Analysis failed</p>
            <p className="mt-1 text-red-400/80">{job.error}</p>
          </div>
        )}

        {result && isDeadline && op && (
          <section className="mt-10">
            <DeadlineCard op={op} shortcode={result.reel.shortcode} />
            <EvidencePanel evidence={evidence} reasoning={reasoning} />
            <TranscriptPanel result={result} />
            <p className="mt-4 text-xs text-zinc-600">
              {result.model} · {result.usage.input_tokens} in /{' '}
              {result.usage.output_tokens} out ·{' '}
              {(job!.elapsedMs / 1000).toFixed(1)}s
            </p>
          </section>
        )}

        {result && isTravel && tr && (
          <section className="mt-10">
            <TravelCard t={tr} />
            <EvidencePanel evidence={evidence} reasoning={reasoning} />
            <TranscriptPanel result={result} />
          </section>
        )}

        {result && !isDeadline && !isTravel && fs && conf && (
          <section className="mt-10">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">
                    {fs.place_name ?? 'No place identified'}
                  </h2>
                  {whereLine(fs) && (
                    <p className="mt-1 text-zinc-400">{whereLine(fs)}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${conf.className}`}
                >
                  {conf.label}
                </span>
              </div>

              <p className="mt-2 text-sm text-zinc-500">{conf.hint}</p>

              {/* Only offer directions when we actually know where it is. A
                  Directions button on an unresolved chain sends people to the
                  wrong branch. */}
              {fs.place_name && fs.confidence === 'high' && (
                <a
                  href={mapsUrl(fs)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex rounded-lg bg-zinc-100 px-4 py-2 text-sm
                             font-medium text-zinc-900 hover:bg-white"
                >
                  Directions →
                </a>
              )}

              <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Cuisine" value={fs.cuisine} />
                <Field label="Price" value={fs.price_band} />
                <Field label="Veg / non-veg" value={fs.veg_status} />
                <Field label="Phone" value={fs.contact} />
              </dl>

              {fs.dishes.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Dishes</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fs.dishes.map((d) => (
                      <span
                        key={d}
                        className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {fs.offers.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Offers</p>
                  <ul className="mt-2 space-y-1">
                    {fs.offers.map((o) => (
                      <li key={o} className="text-sm text-emerald-400">
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <EvidencePanel evidence={evidence} reasoning={reasoning} />
            <TranscriptPanel result={result} />

            <p className="mt-4 text-xs text-zinc-600">
              {result.model} · {result.usage.input_tokens} in /{' '}
              {result.usage.output_tokens} out ·{' '}
              {(job!.elapsedMs / 1000).toFixed(1)}s
            </p>
          </section>
        )}

        <SavedList refreshKey={job?.status === 'done' ? job.id : null} />

        <TripPlanner refreshKey={job?.status === 'done' ? job.id : null} />
      </main>
    </div>
  );
}

/* The evidence panel is the point of the product: every claim is traceable to
   something we actually saw or heard. Shared by both verticals. */
function EvidencePanel({
  evidence,
  reasoning,
}: {
  evidence: { field: string; source: string; quote: string }[];
  reasoning: string;
}) {
  if (evidence.length === 0) return null;
  return (
    <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
      <p className="text-xs uppercase tracking-wide text-zinc-500">How we know</p>
      <ul className="mt-3 space-y-2">
        {evidence.map((e, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="mt-0.5 shrink-0 rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">
              {SOURCE_LABEL[e.source as keyof typeof SOURCE_LABEL] ?? e.source}
            </span>
            <span className="text-zinc-300">
              <span className="text-zinc-500">{e.field}: </span>
              &ldquo;{e.quote}&rdquo;
            </span>
          </li>
        ))}
      </ul>
      {reasoning && (
        <p className="mt-4 border-t border-zinc-800 pt-3 text-sm text-zinc-500">
          {reasoning}
        </p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-200">{value}</dd>
    </div>
  );
}

function StageDot({ status }: { status: Stage['status'] }) {
  if (status === 'completed')
    return <span className="size-2 shrink-0 rounded-full bg-emerald-400" />;
  if (status === 'processing')
    return <span className="size-2 shrink-0 animate-pulse rounded-full bg-sky-400" />;
  if (status === 'error')
    return <span className="size-2 shrink-0 rounded-full bg-red-400" />;
  return <span className="size-2 shrink-0 rounded-full bg-zinc-700" />;
}

function TranscriptPanel({ result }: { result: AnalyzeResult }) {
  const [tab, setTab] = useState<'native' | 'english' | 'roman'>('english');
  const t = result.transcript;
  if (!t.native) return null;

  const tabs = [
    ['native', t.language ? t.language.toUpperCase() : 'Original'],
    ['english', 'English'],
    ['roman', 'Romanised'],
  ] as const;

  return (
    <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              tab === key
                ? 'bg-zinc-100 text-zinc-900'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
        {t.low_confidence && (
          <span className="ml-auto text-[11px] text-amber-500/80">
            low-confidence audio
          </span>
        )}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
        {t[tab] || <span className="text-zinc-600">(nothing for this view)</span>}
      </p>
    </div>
  );
}
