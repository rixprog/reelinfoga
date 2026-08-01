'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Card } from './Shell';

interface Stage {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  detail?: string;
}

/**
 * Paste a URL and watch it process.
 *
 * On the web the user waits, so the stages ARE the feedback — unlike the phone,
 * where the share is fire-and-forget. Worth keeping visible here.
 */
export function Analyse({ onDone }: { onDone: () => void }) {
  const [url, setUrl] = useState('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const poll = useCallback(
    async (id: string) => {
      try {
        const r = await fetch(`/api/analyze/${id}`, { cache: 'no-store' });
        const d = await r.json();
        setStages(d.stages ?? []);
        if (d.status === 'running') {
          timer.current = setTimeout(() => poll(id), 900);
        } else {
          setBusy(false);
          if (d.status === 'error') setError(d.error ?? 'Processing failed');
          else {
            setUrl('');
            onDone();
            // Leave the finished stages up briefly so it reads as completion
            // rather than the panel just vanishing.
            setTimeout(() => setStages([]), 2500);
          }
        }
      } catch {
        setBusy(false);
        setError('Lost contact with the server.');
      }
    },
    [onDone],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    setStages([]);
    const r = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error ?? 'Something went wrong.');
      setBusy(false);
      return;
    }
    poll(d.id);
  }

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-2.5 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste an Instagram reel link"
          className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm
                     outline-none placeholder:text-ink-faint focus:border-primary/50"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white
                     transition hover:bg-[#6D28D9] disabled:bg-[#E4E4E7]
                     disabled:text-ink-faint"
        >
          {busy ? 'Analysing…' : 'Analyse'}
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-xl bg-[#FEE2E2] px-4 py-3 text-sm text-[#DC2626]">
          {error}
        </p>
      )}

      {stages.length > 0 && (
        <Card className="mt-3 p-4">
          <ol className="flex flex-wrap gap-x-6 gap-y-2">
            {stages.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`size-2 shrink-0 rounded-full ${
                    s.status === 'completed'
                      ? 'bg-[#16A34A]'
                      : s.status === 'processing'
                        ? 'animate-pulse bg-primary'
                        : s.status === 'error'
                          ? 'bg-[#DC2626]'
                          : 'bg-[#E4E4E7]'
                  }`}
                />
                <span
                  className={s.status === 'pending' ? 'text-ink-faint' : 'text-ink'}
                >
                  {s.label}
                </span>
                {s.detail && (
                  <span className="text-xs text-ink-faint">{s.detail}</span>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
