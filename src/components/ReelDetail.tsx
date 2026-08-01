'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Card, Eyebrow, Pill } from './Shell';
import type { SavedItem } from '@/lib/store-client';
import { SOURCE_LABEL, categoryOf, countdown, daysUntil, inr } from '@/lib/ui';

const CONFIDENCE = {
  high: { label: 'High confidence', tone: 'ok' as const, hint: 'Place and city identified.' },
  medium: {
    label: 'Needs confirming',
    tone: 'warn' as const,
    hint: 'Found it, but the exact location is ambiguous.',
  },
  low: { label: 'Not identified', tone: 'flat' as const, hint: 'Nothing here pins a place.' },
};

export function ReelDetail({ shortcode }: { shortcode: string }) {
  const [item, setItem] = useState<SavedItem | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<'native' | 'english' | 'roman'>('english');

  useEffect(() => {
    fetch('/api/reels', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const found = (d.items ?? []).find(
          (i: SavedItem) => i.shortcode === shortcode,
        );
        found ? setItem(found) : setMissing(true);
      })
      .catch(() => setMissing(true));
  }, [shortcode]);

  if (missing) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="font-medium">That reel isn&apos;t in the library.</p>
        <Link href="/" className="mt-3 inline-block text-sm font-semibold text-primary">
          ← Back to library
        </Link>
      </main>
    );
  }
  if (!item) {
    return <main className="mx-auto max-w-3xl px-5 py-16 text-sm text-ink-muted">Loading…</main>;
  }

  const p = item.payload as Record<string, any>;
  const cat = categoryOf(item.category);
  const conf = CONFIDENCE[(item.confidence ?? 'low') as keyof typeof CONFIDENCE];
  const evidence: { field: string; source: string; quote: string }[] = p.evidence ?? [];
  const t = (p.transcript ?? {}) as Record<string, string>;
  const where = [p.area, p.city, p.state].filter(Boolean).join(', ');
  const d = daysUntil(item.deadline_date);
  const cd = countdown(d, item.deadline_passed);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8">
      <Link href="/" className="text-sm font-semibold text-primary">
        ← Library
      </Link>

      {/* Hero: portrait thumbnail beside the facts on desktop, stacked on phones. */}
      <div className="mt-5 flex flex-col gap-6 sm:flex-row">
        <div
          className="w-full shrink-0 overflow-hidden rounded-2xl sm:w-44"
          style={{ background: cat.tint }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/thumb/${shortcode}`}
            alt=""
            className="h-56 w-full object-cover sm:h-60"
            onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="violet">{cat.one}</Pill>
            {item.category !== 'other' && <Pill tone={conf.tone}>{conf.label}</Pill>}
            {item.category === 'deadline' && <Pill tone={cd.tone}>{cd.text}</Pill>}
          </div>

          <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.02em]">
            {item.title ?? 'Untitled'}
          </h1>
          {where && <p className="mt-1 text-ink-muted">{where}</p>}
          {p.organisation && <p className="mt-1 text-ink-muted">{p.organisation}</p>}
          {p.summary && <p className="mt-3 text-sm leading-relaxed text-ink-muted">{p.summary}</p>}
          {p.description && !p.summary && (
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{p.description}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {/* Directions only at high confidence: a medium result means the
                city is unresolved, and navigating would send someone to the
                wrong branch of a chain. */}
            {item.category === 'food_spot' && item.confidence === 'high' && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  [p.place_name, p.area, p.city].filter(Boolean).join(', '),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9]"
              >
                Get directions
              </a>
            )}
            {item.category === 'deadline' && item.deadline_date && (
              <a
                href={`/api/reels/${shortcode}/ics`}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9]"
              >
                Add to calendar
              </a>
            )}
            {(item.registration_links ?? []).slice(0, 1).map((l) => (
              <a
                key={l}
                href={/^https?:\/\//i.test(l) ? l : `https://${l}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-primary hover:border-primary/40"
              >
                Register ↗
              </a>
            ))}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-ink-muted hover:text-ink"
            >
              Original reel ↗
            </a>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-8">
        {item.category === 'deadline' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card className="p-4">
              <Eyebrow>Apply before</Eyebrow>
              <p className="tnum mt-1 text-lg font-semibold">
                {item.deadline_date ?? 'Not stated'}
              </p>
              {p.date_confidence === 'inferred' && (
                <p className="mt-1 text-xs text-[var(--amber)]">
                  Year inferred — worth double-checking
                </p>
              )}
            </Card>
            {p.event_date && (
              <Card className="p-4">
                <Eyebrow>Event date</Eyebrow>
                <p className="tnum mt-1 text-lg font-semibold">{p.event_date}</p>
              </Card>
            )}
          </div>
        )}

        <Facts p={p} />

        {Array.isArray(p.dishes) && p.dishes.length > 0 && (
          <Chips label="Dishes" values={p.dishes} />
        )}
        {Array.isArray(p.tags) && p.tags.length > 0 && (
          <Chips label="Tags" values={p.tags.map((x: string) => `#${x}`)} />
        )}

        {Array.isArray(p.offers) && p.offers.length > 0 && (
          <section>
            <Eyebrow>Offers</Eyebrow>
            <ul className="mt-3 space-y-1.5">
              {p.offers.map((o: string) => (
                <li key={o} className="flex gap-2.5 text-sm">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#16A34A]" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {Array.isArray(p.ingredients) && p.ingredients.length > 0 && (
          <section>
            <Eyebrow>Ingredients</Eyebrow>
            <ul className="mt-3 space-y-1.5">
              {p.ingredients.map((i: any, n: number) => (
                <li key={n} className="flex gap-3 text-sm">
                  <span className="tnum w-24 shrink-0 font-semibold">
                    {[i.quantity, i.unit].filter(Boolean).join(' ') || '—'}
                  </span>
                  <span className="text-ink-muted">
                    {i.item}
                    {i.notes && <span className="text-ink-faint"> — {i.notes}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {Array.isArray(p.steps) && p.steps.length > 0 && (
          <section>
            <Eyebrow>Method</Eyebrow>
            <ol className="mt-3 space-y-3">
              {p.steps.map((s: any) => (
                <li key={s.order} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {s.order}
                  </span>
                  <span>
                    {s.instruction}
                    {s.duration_minutes ? (
                      <span className="ml-2 text-xs text-[var(--amber)]">
                        {s.duration_minutes} min
                      </span>
                    ) : null}
                    {s.tip && (
                      <span className="mt-0.5 block text-xs text-[#16A34A]">
                        Tip: {s.tip}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {Array.isArray(p.products) && p.products.length > 0 && (
          <section>
            <Eyebrow>Products</Eyebrow>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {p.products.map((pr: any) => (
                <Card key={pr.name} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{pr.name}</p>
                    <span className="tnum shrink-0 text-sm font-semibold text-[#16A34A]">
                      {pr.price_inr ? inr(pr.price_inr) : pr.price_text ?? '—'}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-1 text-xs">
                    {(pr.specs ?? []).map((s: any) => (
                      <div key={s.label} className="flex justify-between gap-2">
                        <dt className="text-ink-faint">{s.label}</dt>
                        <dd className="text-right">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {(pr.pros ?? []).map((x: string) => (
                    <p key={x} className="mt-1 text-xs text-[#16A34A]">+ {x}</p>
                  ))}
                  {(pr.cons ?? []).map((x: string) => (
                    <p key={x} className="mt-1 text-xs text-[#DC2626]">− {x}</p>
                  ))}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[
                      ['Amazon', `https://www.amazon.in/s?k=${encodeURIComponent(pr.name)}`],
                      ['Flipkart', `https://www.flipkart.com/search?q=${encodeURIComponent(pr.name)}`],
                    ].map(([store, href]) => (
                      <a
                        key={store}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-primary"
                      >
                        {store} ↗
                      </a>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              Store buttons open a search for that model — we don&apos;t guess product URLs.
            </p>
          </section>
        )}

        {Array.isArray(p.key_points) && p.key_points.length > 0 && (
          <section>
            <Eyebrow>Key points</Eyebrow>
            <ul className="mt-3 space-y-1.5">
              {p.key_points.map((k: string, n: number) => (
                <li key={n} className="flex gap-2.5 text-sm">
                  <span className="text-ink-faint">·</span>
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {Array.isArray(p.places) && p.places.length > 0 && (
          <section>
            <Eyebrow>Places</Eyebrow>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {p.places.map((pl: any) => (
                <Card key={pl.name} className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold">{pl.name}</p>
                    <span className="shrink-0 text-xs text-ink-faint">
                      {pl.place_type}
                    </span>
                  </div>
                  {pl.description && (
                    <p className="mt-1 text-sm text-ink-muted">{pl.description}</p>
                  )}
                </Card>
              ))}
            </div>
            <Link
              href="/trips"
              className="mt-3 inline-block text-sm font-semibold text-primary"
            >
              Plan a trip with these →
            </Link>
          </section>
        )}

        {/* The point of the product: every claim is traceable. A hero element,
            not an accordion. */}
        {evidence.length > 0 && (
          <section>
            <Eyebrow>How we know</Eyebrow>
            <Card className="mt-3 divide-y divide-line">
              {evidence.map((e, n) => (
                <div key={n} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-4">
                  <span className="w-fit shrink-0 rounded-md bg-background px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                    {SOURCE_LABEL[e.source] ?? e.source}
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="text-ink-faint">{e.field}: </span>
                    &ldquo;{e.quote}&rdquo;
                  </span>
                </div>
              ))}
            </Card>
            {p.reasoning && (
              <p className="mt-2 text-xs text-ink-faint">{p.reasoning}</p>
            )}
          </section>
        )}

        {t.native && (
          <section>
            <Eyebrow>Transcript</Eyebrow>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ['native', (t.language ?? 'Original').toUpperCase()],
                  ['english', 'English'],
                  ['roman', 'Romanised'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    tab === k
                      ? 'bg-primary text-white'
                      : 'border border-line text-ink-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Card className="mt-3 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {t[tab] || <span className="text-ink-faint">Nothing for this view.</span>}
              </p>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}

function Chips({ label, values }: { label: string; values: string[] }) {
  return (
    <section>
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((v) => (
          <span
            key={v}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs"
          >
            {v}
          </span>
        ))}
      </div>
    </section>
  );
}

function Facts({ p }: { p: Record<string, any> }) {
  const facts = [
    ['Cuisine', p.cuisine],
    ['Price', p.price_band],
    ['Veg', p.veg_status],
    ['Phone', p.contact],
    ['Serves', p.servings],
    ['Total time', p.total_time_minutes && `${p.total_time_minutes} min`],
    ['Difficulty', p.difficulty],
    ['Eligibility', p.eligibility],
    ['Fee', p.fee],
    ['Prize', p.prize],
    ['Stipend', p.stipend],
    ['Location', p.location],
    ['Best season', p.best_season],
    ['Topic', p.topic],
  ].filter(([, v]) => v) as [string, string][];

  if (!facts.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
      {facts.map(([k, v]) => (
        <div key={k}>
          <dt className="eyebrow">{k}</dt>
          <dd className="mt-1 text-sm capitalize">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
