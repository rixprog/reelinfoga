'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

import type { RouteStop } from './ItineraryMap';

// Leaflet touches `window` at import time, so this can never be server rendered.
const ItineraryMap = dynamic(() => import('./ItineraryMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] items-center justify-center rounded-2xl border border-line bg-surface text-sm text-ink-faint">
      Loading map…
    </div>
  ),
});

const DAY_COLOURS = ['#38bdf8', '#f472b6', '#4ade80', '#fbbf24', '#a78bfa'];
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

interface SuggestedPlace {
  name: string;
  place_type: string;
  why: string;
  duration_minutes: number | null;
  typical_entry_fee_inr: number | null;
}

interface Rough {
  destination: string;
  overview: string;
  suggested_days: number;
  best_season: string | null;
  nearest_transport_hub: string | null;
  reel_covers_specific_places: boolean;
  suggested_places: SuggestedPlace[];
  from_reel_places: string[];
  reel_stated_prices: string[];
  rough_cost: {
    per_person_low_inr: number;
    per_person_high_inr: number;
    excludes_long_distance_travel: boolean;
    note: string;
  };
}

interface CostItem {
  category: string;
  label: string;
  amount_inr: number;
  basis: string;
  source: 'reel' | 'estimate';
}

interface FullPlan {
  destination: string;
  plan: {
    title: string;
    overview: string;
    days: {
      day: number;
      theme: string;
      items: { time: string; stop_name: string; note: string; cost_inr: number | null }[];
    }[];
    costs: CostItem[];
    total_inr: number;
    per_person_inr: number;
    within_budget: boolean | null;
    budget_delta_inr: number | null;
    budget_advice: string;
    assumptions: string[];
    tips: string[];
  };
  route: RouteStop[];
  unlocated: string[];
}

export function TripPlanner({ refreshKey }: { refreshKey: string | null }) {
  const [destinations, setDestinations] = useState<{ name: string; stops: number }[]>([]);
  const [selected, setSelected] = useState('');
  const [rough, setRough] = useState<Rough | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [full, setFull] = useState<FullPlan | null>(null);
  const [stage, setStage] = useState<'idle' | 'rough' | 'planning'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [days, setDays] = useState(2);
  const [travellers, setTravellers] = useState(2);
  const [groupType, setGroupType] = useState('couple');
  const [origin, setOrigin] = useState('');
  const [budget, setBudget] = useState('');
  const [pace, setPace] = useState('balanced');
  const [stayType, setStayType] = useState('mid');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/itinerary', { cache: 'no-store' });
      const d = await r.json();
      setDestinations(d.destinations ?? []);
      setSelected((cur) => cur || d.destinations?.[0]?.name || '');
    } catch {
      /* nothing saved yet is a normal state */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function getRough() {
    if (!selected) return;
    setStage('rough');
    setError(null);
    setRough(null);
    setFull(null);
    setChosen(new Set());
    try {
      const r = await fetch('/api/trip/rough', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: selected }),
      });
      const d = await r.json();
      if (!r.ok) setError(d.error ?? 'Could not build a rough plan.');
      else {
        setRough(d);
        setDays(Math.min(Math.max(d.suggested_days || 2, 1), 7));
        // When the reel named nothing, its suggestions ARE the trip — so they
        // start ticked. When the reel named places, suggestions are extras and
        // start unticked so the user's own saves stay the default.
        if (!d.reel_covers_specific_places) {
          setChosen(new Set(d.suggested_places.map((p: SuggestedPlace) => p.name)));
        }
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setStage('idle');
    }
  }

  async function buildPlan() {
    if (!selected) return;
    setStage('planning');
    setError(null);
    setFull(null);
    try {
      const r = await fetch('/api/trip/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: selected,
          days,
          travellers,
          group_type: groupType,
          origin: origin || undefined,
          budget_total: budget ? Number(budget) : undefined,
          pace,
          stay_type: stayType,
          extra_places: [...chosen],
        }),
      });
      const d = await r.json();
      if (!r.ok) setError(d.error ?? 'Could not build the plan.');
      else setFull(d);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setStage('idle');
    }
  }

  if (destinations.length === 0) return null;
  const p = full?.plan;

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setRough(null);
            setFull(null);
          }}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        >
          {destinations.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name} ({d.stops} place{d.stops === 1 ? '' : 's'} from your reels)
            </option>
          ))}
        </select>
        <button
          onClick={getRough}
          disabled={stage !== 'idle'}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white
                     hover:bg-[#6D28D9] disabled:bg-[#E4E4E7] disabled:text-ink-faint"
        >
          {stage === 'rough' ? 'Thinking…' : 'Rough plan'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-[#FEE2E2] px-4 py-3 text-sm text-[#DC2626]">
          {error}
        </p>
      )}

      {rough && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="text-xl font-semibold">{rough.destination}</h3>
            <span className="rounded-full bg-background px-3 py-1 text-xs text-ink">
              ~{inr(rough.rough_cost.per_person_low_inr)}–
              {inr(rough.rough_cost.per_person_high_inr)} per person
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{rough.overview}</p>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-faint">
            <span>Suggested: {rough.suggested_days} days</span>
            {rough.best_season && <span>Season: {rough.best_season}</span>}
            {rough.nearest_transport_hub && (
              <span>Nearest hub: {rough.nearest_transport_hub}</span>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-faint">{rough.rough_cost.note}</p>

          {rough.from_reel_places.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wide text-ink-faint">
                From your reels ({rough.from_reel_places.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {rough.from_reel_places.map((n) => (
                  <span
                    key={n}
                    className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-[#16A34A] "
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {rough.suggested_places.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wide text-ink-faint">
                {rough.reel_covers_specific_places
                  ? 'You could also add'
                  : 'Your reel only named the destination — here’s what we suggest'}
              </p>
              <ul className="mt-2 space-y-2">
                {rough.suggested_places.map((sp) => (
                  <li key={sp.name}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-background/50 p-3">
                      <input
                        type="checkbox"
                        checked={chosen.has(sp.name)}
                        onChange={(e) => {
                          const next = new Set(chosen);
                          e.target.checked ? next.add(sp.name) : next.delete(sp.name);
                          setChosen(next);
                        }}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="text-sm font-medium">{sp.name}</span>
                        <span className="ml-2 text-xs text-ink-faint">
                          {sp.place_type}
                          {sp.typical_entry_fee_inr
                            ? ` · ~${inr(sp.typical_entry_fee_inr)}`
                            : ''}
                        </span>
                        <p className="mt-0.5 text-xs text-ink-faint">{sp.why}</p>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rough.reel_stated_prices.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wide text-ink-faint">
                Prices stated in your reels
              </p>
              <ul className="mt-1 text-xs text-ink-muted">
                {rough.reel_stated_prices.map((s) => (
                  <li key={s}>· {s}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 border-t border-line pt-5">
            <p className="text-sm font-medium">Now tell us about the trip</p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Num label="Days" value={days} onChange={setDays} min={1} max={7} />
              <Num
                label="Travellers"
                value={travellers}
                onChange={setTravellers}
                min={1}
                max={20}
              />
              <Choice
                label="Who's going"
                value={groupType}
                onChange={setGroupType}
                options={['solo', 'couple', 'family', 'friends']}
              />
              <Choice
                label="Pace"
                value={pace}
                onChange={setPace}
                options={['relaxed', 'balanced', 'packed']}
              />
              <Choice
                label="Stay"
                value={stayType}
                onChange={setStayType}
                options={['budget', 'mid', 'premium']}
              />
              <Text
                label="Starting from"
                value={origin}
                onChange={setOrigin}
                placeholder="e.g. Kochi — needed to cost travel"
              />
              <Text
                label="Total budget (₹, optional)"
                value={budget}
                onChange={setBudget}
                placeholder="whole group, whole trip"
                numeric
              />
            </div>

            <button
              onClick={buildPlan}
              disabled={stage !== 'idle'}
              className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold
                         text-white hover:bg-[#6D28D9] disabled:bg-[#E4E4E7]
                         disabled:text-ink-faint"
            >
              {stage === 'planning' ? 'Planning and costing…' : 'Plan my trip'}
            </button>
            {stage === 'planning' && (
              <p className="mt-2 text-xs text-ink-faint">
                Geocoding each place against OpenStreetMap (1/sec, as their policy
                requires), then routing and costing.
              </p>
            )}
          </div>
        </div>
      )}

      {full && p && (
        <div className="mt-6 space-y-4">
          <ItineraryMap stops={full.route} />

          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h3 className="text-xl font-semibold">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.overview}</p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Total" value={inr(p.total_inr)} />
              <Stat label={`Per person (${travellers})`} value={inr(p.per_person_inr)} />
              {p.within_budget !== null && (
                <Stat
                  label={p.within_budget ? 'Under budget by' : 'Over budget by'}
                  value={inr(Math.abs(p.budget_delta_inr ?? 0))}
                  tone={p.within_budget ? 'good' : 'bad'}
                />
              )}
            </div>

            {p.budget_advice && (
              <p className="mt-3 text-sm text-ink-muted">{p.budget_advice}</p>
            )}

            {p.days.map((d) => (
              <div key={d.day} className="mt-6">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ background: DAY_COLOURS[(d.day - 1) % DAY_COLOURS.length] }}
                  />
                  <p className="text-sm font-medium">
                    Day {d.day} — {d.theme}
                  </p>
                </div>
                <ul className="mt-3 space-y-3 border-l border-line pl-4">
                  {d.items.map((it, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="w-12 shrink-0 tabular-nums text-ink-faint">
                        {it.time}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3">
                          <span className="text-ink">{it.stop_name}</span>
                          {it.cost_inr ? (
                            <span className="shrink-0 tabular-nums text-xs text-ink-faint">
                              {inr(it.cost_inr)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-ink-faint">{it.note}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Provenance again: a price the reel stated is data; ours is an
                estimate. Money is where a mislabelled claim actually costs
                the user something. */}
            <div className="mt-7 border-t border-line pt-4">
              <p className="text-xs uppercase tracking-wide text-ink-faint">
                Cost breakdown
              </p>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {p.costs.map((c, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="py-2 pr-2 align-top">
                        <span
                          className={`mr-2 rounded px-1.5 py-0.5 text-[10px] ${
                            c.source === 'reel'
                              ? 'bg-emerald-500/15 text-[#16A34A]'
                              : 'bg-background text-ink-faint'
                          }`}
                        >
                          {c.source === 'reel' ? 'FROM REEL' : 'ESTIMATE'}
                        </span>
                        <span className="text-ink">{c.label}</span>
                        <p className="mt-0.5 text-xs text-ink-faint">{c.basis}</p>
                      </td>
                      <td className="py-2 text-right align-top tabular-nums text-ink">
                        {inr(c.amount_inr)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-3 font-medium">Total</td>
                    <td className="pt-3 text-right font-medium tabular-nums">
                      {inr(p.total_inr)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {p.assumptions.length > 0 && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wide text-ink-faint">
                  What these numbers assume
                </p>
                <ul className="mt-2 space-y-1">
                  {p.assumptions.map((a, i) => (
                    <li key={i} className="text-xs text-ink-faint">
                      · {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.tips.length > 0 && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wide text-ink-faint">Tips</p>
                <ul className="mt-2 space-y-1">
                  {p.tips.map((t, i) => (
                    <li key={i} className="text-sm text-ink-muted">
                      · {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {full.unlocated.length > 0 && (
              <p className="mt-5 text-xs text-[var(--amber)]">
                Not on the map (not found in OpenStreetMap):{' '}
                {full.unlocated.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad';
}) {
  const colour =
    tone === 'good' ? 'text-[#16A34A]' : tone === 'bad' ? 'text-[#DC2626]' : '';
  return (
    <div className="rounded-xl border border-line bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${colour}`}>{value}</p>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-ink-faint">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(Math.min(Math.max(Number(e.target.value) || min, min), max))
        }
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
      />
    </label>
  );
}

function Text({
  label,
  value,
  onChange,
  placeholder,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-ink-faint">{label}</span>
      <input
        inputMode={numeric ? 'numeric' : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(numeric ? e.target.value.replace(/[^\d]/g, '') : e.target.value)
        }
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2
                   text-sm placeholder:text-ink-faint"
      />
    </label>
  );
}

function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-ink-faint">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm capitalize"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
