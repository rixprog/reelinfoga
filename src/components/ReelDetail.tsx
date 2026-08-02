'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { PlaceMap } from './PlaceMap';
import { Card, Empty, Eyebrow, Pill } from './Shell';
import { StoreLinks } from './StoreLinks';
import { ReelPlayer } from './ReelPlayer';
import { Thumb } from './Thumb';
import { starred } from '@/lib/collections';
import type { SavedItem } from '@/lib/store-client';
import { SOURCE_LABEL, categoryOf, countdown, daysUntil, inr } from '@/lib/ui';

const CONFIDENCE = {
  high: { label: 'HIGH', tone: 'ok' as const },
  medium: { label: 'MEDIUM', tone: 'warn' as const },
  low: { label: 'LOW', tone: 'flat' as const },
};

export function ReelDetail({ shortcode }: { shortcode: string }) {
  const [item, setItem] = useState<SavedItem | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<'native' | 'english' | 'roman'>('english');
  const [isStar, setIsStar] = useState(false);

  const sync = useCallback(() => setIsStar(starred.has(shortcode)), [shortcode]);

  useEffect(() => {
    fetch('/api/reels', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const found = (d.items ?? []).find((i: SavedItem) => i.shortcode === shortcode);
        found ? setItem(found) : setMissing(true);
      })
      .catch(() => setMissing(true));
    sync();
    window.addEventListener('reelbrain:store', sync);
    return () => window.removeEventListener('reelbrain:store', sync);
  }, [shortcode, sync]);

  if (missing) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <Empty
          title="Not in the library"
          body="That reel isn't saved. Analyze it and it will appear here."
        />
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

  const facts: [string, string][] = (
    [
      ['Area', where],
      ['Cuisine', p.cuisine],
      ['Price band', p.price_band],
      ['Veg / Non-veg', p.veg_status],
      ['Phone number', p.contact],
      ['Organisation', p.organisation],
      ['Eligibility', p.eligibility],
      ['Fee', p.fee],
      ['Prize', p.prize],
      ['Stipend', p.stipend],
      ['Serves', p.servings],
      ['Total time', p.total_time_minutes && `${p.total_time_minutes} min`],
      ['Difficulty', p.difficulty],
      ['Destination', p.destination],
      ['Best season', p.best_season],
      ['Topic', p.topic],
    ] as [string, any][]
  ).filter(([, v]) => v) as [string, string][];

  const mapsQuery = encodeURIComponent(
    [p.place_name ?? item.title, p.area, p.city].filter(Boolean).join(', '),
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-6 sm:pb-12">
      <div className="flex items-center justify-between gap-4">
        <Link href="/reels" className="text-sm font-semibold text-primary">
          ← Reels
        </Link>
        <button
          onClick={() => setIsStar(starred.toggle(shortcode))}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
            isStar
              ? 'border-primary/40 bg-primary-soft text-primary'
              : 'border-line text-ink-muted hover:text-ink'
          }`}
        >
          {isStar ? '★ Saved' : '☆ Save'}
        </button>
      </div>

      <h1 className="mt-4 text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">
        {cat.one}
      </h1>

      {/* Facts left, hero + evidence right — the layout from the approved design.
          Stacks on phones. */}
      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-7">
          <div>
            <Eyebrow>{item.category === 'food_spot' ? 'Restaurant name' : 'Title'}</Eyebrow>
            <h2 className="mt-1.5 text-[22px] font-bold leading-tight">
              {item.title ?? 'Untitled'}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {item.category !== 'other' && item.confidence && (
                <Pill tone={conf.tone}>{conf.label} confidence</Pill>
              )}
              {item.category === 'deadline' && <Pill tone={cd.tone}>{cd.text}</Pill>}
              {/* Skipped when it just repeats the title, which it often does. */}
              {p.product_category &&
                String(p.product_category).toLowerCase() !==
                  String(item.title ?? '').toLowerCase() && (
                  <Pill>{String(p.product_category)}</Pill>
                )}
              {p.cuisine && <Pill>{String(p.cuisine)}</Pill>}
              {item.language && <Pill>{item.language.toUpperCase()}</Pill>}
            </div>

            {/* The model already writes a one-line summary of every reel for the
                search index; it was never shown, which left the top of the page
                a title and nothing else. */}
            {typeof p.search_summary === 'string' && p.search_summary && (
              <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">
                {p.search_summary}
              </p>
            )}
          </div>

          {facts.length > 0 && (
            <dl className="space-y-3">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="eyebrow">{k}</dt>
                  <dd className="mt-0.5 text-[15px] capitalize">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* Food spots only. Travel reels get the richer itinerary map from
              TripPlanner, and everything else has nothing to plot. */}
          {item.category === 'food_spot' && (
            <div>
              <Eyebrow>Where it is</Eyebrow>
              <div className="mt-2">
                <PlaceMap shortcode={shortcode} />
              </div>
            </div>
          )}

          {item.category === 'deadline' && item.deadline_date && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Card className="p-4">
                <Eyebrow>Apply before</Eyebrow>
                <p className="tnum mt-1 text-lg font-semibold">{item.deadline_date}</p>
                {p.date_confidence === 'inferred' && (
                  <p className="mt-1 text-xs text-[#B45309]">
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

          {Array.isArray(p.dishes) && p.dishes.length > 0 && (
            <Chips label="Dish list" values={p.dishes} />
          )}
          {Array.isArray(p.tags) && p.tags.length > 0 && (
            <Chips label="Tags" values={p.tags.map((x: string) => `#${x}`)} />
          )}

          {Array.isArray(p.offers) && p.offers.length > 0 && (
            <div>
              <Eyebrow>Offers</Eyebrow>
              <ul className="mt-2.5 space-y-2">
                {p.offers.map((o: string) => (
                  <li key={o} className="flex gap-2.5 text-[15px]">
                    <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[#16A34A]" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(p.ingredients) && p.ingredients.length > 0 && (
            <div>
              <Eyebrow>Ingredients</Eyebrow>
              <ul className="mt-2.5 space-y-2">
                {p.ingredients.map((i: any, n: number) => (
                  <li key={n} className="flex gap-3 text-[15px]">
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
            </div>
          )}

          {Array.isArray(p.steps) && p.steps.length > 0 && (
            <div>
              <Eyebrow>Method</Eyebrow>
              <ol className="mt-2.5 space-y-3.5">
                {p.steps.map((s: any) => (
                  <li key={s.order} className="flex gap-3 text-[15px]">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                      {s.order}
                    </span>
                    <span>
                      {s.instruction}
                      {s.duration_minutes ? (
                        <span className="ml-2 text-xs text-[#B45309]">
                          {s.duration_minutes} min
                        </span>
                      ) : null}
                      {s.tip && (
                        <span className="mt-0.5 block text-xs text-[#15803D]">Tip: {s.tip}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {Array.isArray(p.products) && p.products.length > 0 && (
            <div>
              <Eyebrow>Products</Eyebrow>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {p.products.map((pr: any) => (
                  <Card key={pr.name} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {pr.brand && (
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                            {pr.brand}
                          </p>
                        )}
                        <p className="font-semibold">{pr.name}</p>
                      </div>
                      <span className="tnum shrink-0 text-sm font-semibold text-[#15803D]">
                        {pr.price_inr ? inr(pr.price_inr) : (pr.price_text ?? '—')}
                      </span>
                    </div>

                    {typeof pr.rating_out_of_5 === 'number' && (
                      <p className="mt-1.5 text-xs text-[#B45309]">
                        {'★'.repeat(Math.round(pr.rating_out_of_5))}
                        <span className="text-zinc-300">
                          {'★'.repeat(5 - Math.round(pr.rating_out_of_5))}
                        </span>
                        <span className="ml-1.5 text-zinc-500">{pr.rating_out_of_5}/5</span>
                      </p>
                    )}
                    <dl className="mt-3 space-y-1 text-xs">
                      {(pr.specs ?? []).map((sp: any) => (
                        <div key={sp.label} className="flex justify-between gap-2">
                          <dt className="text-ink-faint">{sp.label}</dt>
                          <dd className="text-right">{sp.value}</dd>
                        </div>
                      ))}
                    </dl>
                    {(pr.pros ?? []).map((x: string) => (
                      <p key={x} className="mt-1 text-xs text-[#15803D]">+ {x}</p>
                    ))}
                    {(pr.cons ?? []).map((x: string) => (
                      <p key={x} className="mt-1 text-xs text-[#B91C1C]">− {x}</p>
                    ))}
                    {pr.best_for && (
                      <p className="mt-3 rounded-lg bg-zinc-50 p-2.5 text-xs leading-relaxed text-zinc-600">
                        <span className="font-semibold text-zinc-500">Best for: </span>
                        {pr.best_for}
                      </p>
                    )}

                    <div className="mt-3 border-t border-zinc-100 pt-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                        Where to buy
                      </p>
                      <StoreLinks
                        query={[pr.brand, pr.name].filter(Boolean).join(' ')}
                      />
                    </div>
                  </Card>
                ))}
              </div>
              {typeof p.verdict === 'string' && p.verdict && (
                <Card className="mt-3 p-4" edge="#7C3AED">
                  <Eyebrow>The verdict</Eyebrow>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">{p.verdict}</p>
                </Card>
              )}

              <p className="mt-2 text-xs text-ink-faint">
                Store links open a search for that model — the reels carry no URLs, and a
                guessed product link that 404s is worse than an honest search.
              </p>
            </div>
          )}

          {Array.isArray(p.key_points) && p.key_points.length > 0 && (
            <div>
              <Eyebrow>Key points</Eyebrow>
              <ul className="mt-2.5 space-y-2">
                {p.key_points.map((k: string, n: number) => (
                  <li key={n} className="flex gap-2.5 text-[15px]">
                    <span className="text-ink-faint">·</span>
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(p.places) && p.places.length > 0 && (
            <div>
              <Eyebrow>Places</Eyebrow>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {p.places.map((pl: any) => (
                  <Card key={pl.name} className="p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold">{pl.name}</p>
                      <span className="shrink-0 text-xs text-ink-faint">{pl.place_type}</span>
                    </div>
                    {pl.description && (
                      <p className="mt-1 text-sm text-ink-muted">{pl.description}</p>
                    )}
                  </Card>
                ))}
              </div>
              {/* Carry the destination through, so the planner opens on this
                  trip instead of asking again with a dropdown. */}
              <Link
                href={
                  p.destination
                    ? `/trips?destination=${encodeURIComponent(String(p.destination))}`
                    : '/trips'
                }
                className="mt-3 inline-block text-sm font-semibold text-primary"
              >
                Plan a trip with these →
              </Link>
            </div>
          )}

          {t.native && (
            <div>
              <Eyebrow>Transcript</Eyebrow>
              <div className="mt-2.5 flex flex-wrap gap-2">
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
              <Card className="mt-2.5 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {t[tab] || <span className="text-ink-faint">Nothing for this view.</span>}
                </p>
              </Card>
            </div>
          )}

          {p.reasoning && <p className="text-xs leading-relaxed text-ink-faint">{p.reasoning}</p>}
        </div>

        {/* Hero + evidence, sticky on desktop. */}
        <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-[76px] lg:w-[360px] lg:self-start">
          <ReelPlayer shortcode={shortcode} category={item.category} />

          <div className="flex flex-wrap gap-2">
            {/* Directions only at high confidence: medium means the city is
                unresolved, and navigating would send someone to the wrong branch. */}
            {item.category === 'food_spot' && item.confidence === 'high' && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#6D28D9]"
              >
                Open in Google Maps
              </a>
            )}
            {item.category === 'deadline' && item.deadline_date && (
              <a
                href={`/api/reels/${shortcode}/ics`}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#6D28D9]"
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
                className="flex-1 rounded-xl border border-line px-4 py-2.5 text-center text-sm font-semibold text-primary hover:border-primary/40"
              >
                Register ↗
              </a>
            ))}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl border border-line px-4 py-2.5 text-center text-sm font-semibold text-ink-muted hover:text-ink"
            >
              Original reel ↗
            </a>
          </div>

          {/* The point of the product: every claim is traceable. Receipts, not
              debug output — so it sits beside the hero, not in an accordion. */}
          {evidence.length > 0 && (
            <Card className="p-4">
              <Eyebrow>How we know</Eyebrow>
              <div className="mt-3 space-y-2.5">
                {evidence.slice(0, 7).map((e, n) => (
                  <div key={n} className="text-[13px] leading-snug">
                    <span className="mr-1.5 rounded bg-background px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                      {SOURCE_LABEL[e.source] ?? e.source}
                    </span>
                    <span className="text-ink-muted">{e.quote}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-line pt-3">
                <Pill tone="ok">From reel</Pill>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </main>
  );
}

function Chips({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {values.map((v) => (
          <span
            key={v}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs"
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
