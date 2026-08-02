'use client';

import { useCallback, useEffect, useState } from 'react';

import { Card, Eyebrow, Pill } from './Shell';

interface Status {
  channels: string[];
  telegram: boolean;
  email: boolean;
}

export function Settings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    fetch('/api/notify', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ channels: [], telegram: false, email: false }));
  }, []);

  useEffect(load, [load]);

  async function test() {
    setTesting(true);
    setResult(null);
    try {
      const r = await fetch('/api/notify', { method: 'POST' });
      const d = await r.json();
      const lines = (d.results ?? [])
        .map((x: { channel: string; ok: boolean; detail: string }) =>
          `${x.channel}: ${x.ok ? 'sent' : x.detail}`,
        )
        .join(' · ');
      setResult({ ok: !!d.ok, text: d.error ?? lines ?? 'No channels configured' });
    } catch {
      setResult({ ok: false, text: 'Could not reach the server.' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <Eyebrow>Notifications</Eyebrow>
        <Card className="mt-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Telegram</span>
            {status ? (
              <Pill tone={status.telegram ? 'ok' : 'flat'}>
                {status.telegram ? 'Connected' : 'Not configured'}
              </Pill>
            ) : (
              <Pill>Checking…</Pill>
            )}
            <span className="ml-4 text-sm font-semibold">Email</span>
            {status && (
              <Pill tone={status.email ? 'ok' : 'flat'}>
                {status.email ? 'Connected' : 'Not configured'}
              </Pill>
            )}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            You get a message whenever a reel finishes analyzing, and again before a
            saved deadline closes.
          </p>

          <button
            onClick={test}
            disabled={testing}
            className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white
                       transition hover:bg-[#6D28D9] disabled:bg-[#E4E4E7] disabled:text-ink-faint"
          >
            {testing ? 'Sending…' : 'Send a test message'}
          </button>

          {result && (
            <p
              className={`mt-3 rounded-xl px-4 py-3 text-sm ${
                result.ok ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#B91C1C]'
              }`}
            >
              {result.text}
            </p>
          )}
        </Card>
      </section>

      {/* Config lives in .env on the server, so the UI can report and test but
          cannot set it. Saying so beats a form that silently does nothing. */}
      <section>
        <Eyebrow>Setting up Telegram</Eyebrow>
        <Card className="mt-3 p-5">
          <p className="text-sm text-ink-muted">
            Free, no approval and no business account — unlike WhatsApp. Three steps,
            then restart the dev server.
          </p>
          <ol className="mt-4 space-y-3 text-sm">
            <li>
              <span className="font-semibold">1.</span> Message{' '}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary"
              >
                @BotFather
              </a>{' '}
              on Telegram, send <Code>/newbot</Code>, and copy the token it gives you.
            </li>
            <li>
              <span className="font-semibold">2.</span> Send your new bot any message,
              then open{' '}
              <Code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</Code> and copy{' '}
              <Code>chat.id</Code>.
            </li>
            <li>
              <span className="font-semibold">3.</span> Put both in{' '}
              <Code>.env</Code>:
              <pre className="mt-2 overflow-x-auto rounded-xl bg-background p-3 font-mono text-xs">
{`TELEGRAM_BOT_TOKEN=123456:ABC-your-token
TELEGRAM_CHAT_ID=987654321`}
              </pre>
            </li>
          </ol>
        </Card>
      </section>

      <section>
        <Eyebrow>Event reminders</Eyebrow>
        <Card className="mt-3 p-5">
          <p className="text-sm leading-relaxed text-ink-muted">
            Reminders fire at 7 days, 2 days and the morning of a deadline — each one
            exactly once, so a daily job never re-sends the same alert. Run it from
            cron:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-background p-3 font-mono text-xs">
{`0 9 * * *  cd ~/projects/reelbrain && .venv/bin/python reminders.py`}
          </pre>
          <p className="mt-3 text-xs text-ink-faint">
            Try it now without sending anything:{' '}
            <Code>.venv/bin/python reminders.py --dry-run</Code>
          </p>
        </Card>
      </section>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">
      {children}
    </code>
  );
}
