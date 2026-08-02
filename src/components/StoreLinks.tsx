'use client';

/**
 * Where to buy a product the reel talked about.
 *
 * These are searches, not product pages. The reels carry no URLs — nothing in
 * the caption, comments or payload — so a real product link would have to be
 * guessed, and a guessed Amazon URL that 404s in front of someone is worse
 * than an honest search.
 *
 * Marks are drawn as monograms rather than fetched logos: the artifact CSP and
 * offline demos both rule out remote images, and store logos are trademarks we
 * have no licence to embed.
 */
const STORES = [
  {
    id: 'amazon',
    name: 'Amazon',
    hint: 'amazon.in',
    mark: 'a',
    fg: '#7C2D12',
    bg: '#FFEDD5',
    search: (q: string) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
  },
  {
    id: 'flipkart',
    name: 'Flipkart',
    hint: 'flipkart.com',
    mark: 'F',
    fg: '#1E40AF',
    bg: '#DBEAFE',
    search: (q: string) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'google',
    name: 'Google Shopping',
    hint: 'compare prices',
    mark: 'G',
    fg: '#166534',
    bg: '#DCFCE7',
    search: (q: string) =>
      `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`,
  },
];

export function StoreLinks({ query }: { query: string }) {
  return (
    // flex-wrap, not a grid: these sit inside a product card that is itself
    // half-width on desktop, and a viewport breakpoint cannot see that. A
    // three-column grid in that space shrank each card until the labels
    // truncated to "A…". min-w lets them wrap on actual available width.
    <div className="flex flex-wrap gap-2">
      {STORES.map((s) => (
        <a
          key={s.id}
          href={s.search(query)}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex min-w-[148px] flex-1 items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-2.5 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm"
        >
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold"
            style={{ background: s.bg, color: s.fg }}
            aria-hidden
          >
            {s.mark}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-zinc-900">{s.name}</span>
            <span className="block truncate text-[10px] text-zinc-400">{s.hint}</span>
          </span>
          <span className="shrink-0 text-xs text-zinc-300 transition group-hover:text-zinc-500">
            ↗
          </span>
        </a>
      ))}
    </div>
  );
}
