'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { CATEGORY_META, inr } from '@/lib/cards';

interface Result {
  shortcode: string;
  title: string | null;
  category: string;
  owner: string | null;
  url: string;
  snippet: string;
  score: number;
  matched: { semantic?: number; keyword?: number };
}

interface CompareProduct {
  name: string;
  brand: string | null;
  price_inr: number | null;
  specs: { label: string; value: string }[];
  pros: string[];
  cons: string[];
  source_url: string;
}

export function SearchPanel({ refreshKey }: { refreshKey: string | null }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [compareCats, setCompareCats] = useState<string[]>([]);
  const [compareCat, setCompareCat] = useState('');
  const [compare, setCompare] = useState<{
    products: CompareProduct[];
    specLabels: string[];
  } | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCompareCats = useCallback(async () => {
    try {
      const r = await fetch('/api/compare', { cache: 'no-store' });
      const d = await r.json();
      setCompareCats(d.categories ?? []);
    } catch {
      /* no product reels yet is normal */
    }
  }, []);

  useEffect(() => {
    loadCompareCats();
  }, [loadCompareCats, refreshKey]);

  // Debounced, because every keystroke would otherwise embed the query and
  // shell out to Python.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) {
      setResults(null);
      return;
    }
    debounce.current = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, {
          cache: 'no-store',
        });
        const d = await r.json();
        setResults(d.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 550);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q]);

  async function runCompare(cat: string) {
    setCompareCat(cat);
    if (!cat) return setCompare(null);
    const r = await fetch(`/api/compare?category=${encodeURIComponent(cat)}`, {
      cache: 'no-store',
    });
    setCompare(await r.json());
  }

  return (
    <section className="mt-14 border-t border-zinc-900 pt-10">
      <h2 className="text-lg font-semibold">Search everything you&rsquo;ve saved</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Searches the transcript, caption and every extracted field — by meaning,
        not just keywords.
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="e.g. that dsa study reel · the biryani recipe · cheap earphones"
        className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3
                   text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
      />

      {busy && <p className="mt-3 text-xs text-zinc-600">Searching…</p>}

      {results && results.length === 0 && !busy && (
        <p className="mt-4 text-sm text-zinc-600">Nothing matched.</p>
      )}

      {results && results.length > 0 && (
        <ul className="mt-4 space-y-2">
          {results.map((r) => {
            const meta = CATEGORY_META[r.category] ?? CATEGORY_META.other;
            return (
              <li
                key={r.shortcode}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">
                    <span className="mr-2">{meta.icon}</span>
                    {r.title ?? 'Untitled'}
                  </p>
                  <span className="shrink-0 rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-400">
                    {meta.label}
                  </span>
                </div>
                {r.snippet && (
                  <p className="mt-1 text-sm text-zinc-500">{r.snippet}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-600">
                  {r.owner && <span>@{r.owner}</span>}
                  {/* Showing which arm matched makes the hybrid legible instead
                      of magic — and explains why a keyword-free query still hit. */}
                  {r.matched.semantic !== undefined && (
                    <span>meaning {r.matched.semantic.toFixed(2)}</span>
                  )}
                  {r.matched.keyword !== undefined && (
                    <span>keyword {r.matched.keyword.toFixed(1)}</span>
                  )}
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    Reel ↗
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {compareCats.length > 0 && (
        <div className="mt-10">
          <h3 className="text-sm font-medium">Compare products across reels</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Merges every product reel you saved in the same category.
          </p>
          <select
            value={compareCat}
            onChange={(e) => runCompare(e.target.value)}
            className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
          >
            <option value="">Pick a category…</option>
            {compareCats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {compare && compare.products.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="py-2 text-left font-normal text-zinc-500" />
                    {compare.products.map((p) => (
                      <th key={p.name} className="py-2 text-left font-medium">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-900">
                    <td className="py-2 text-zinc-500">Price</td>
                    {compare.products.map((p) => (
                      <td key={p.name} className="py-2 tabular-nums text-emerald-400">
                        {p.price_inr ? inr(p.price_inr) : '—'}
                      </td>
                    ))}
                  </tr>
                  {compare.specLabels.map((label) => (
                    <tr key={label} className="border-b border-zinc-900">
                      <td className="py-2 text-zinc-500">{label}</td>
                      {compare.products.map((p) => (
                        <td key={p.name} className="py-2 text-zinc-300">
                          {p.specs.find((s) => s.label === label)?.value ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 align-top text-zinc-500">Verdict</td>
                    {compare.products.map((p) => (
                      <td key={p.name} className="py-2 align-top text-xs">
                        {p.pros.map((x) => (
                          <div key={x} className="text-emerald-400">
                            + {x}
                          </div>
                        ))}
                        {p.cons.map((x) => (
                          <div key={x} className="text-red-400">
                            − {x}
                          </div>
                        ))}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
