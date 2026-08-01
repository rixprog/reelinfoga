'use client';

import {
  type Generic,
  type ProductExtraction,
  type Recipe,
  buyLinks,
  inr,
} from '@/lib/cards';

const shell = 'rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6';

export function RecipeCard({ r }: { r: Recipe }) {
  if (!r.is_recipe) {
    return (
      <div className={shell}>
        <h2 className="text-xl font-semibold">Not a recipe</h2>
        <p className="mt-2 text-sm text-zinc-500">{r.reasoning}</p>
      </div>
    );
  }

  const times = [
    r.prep_time_minutes && `Prep ${r.prep_time_minutes}m`,
    r.cook_time_minutes && `Cook ${r.cook_time_minutes}m`,
    r.total_time_minutes && `Total ${r.total_time_minutes}m`,
  ].filter(Boolean) as string[];

  return (
    <div className={shell}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-2xl font-semibold">
          👨‍🍳 {r.dish_name ?? 'Untitled dish'}
        </h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {r.veg_status && <Pill>{r.veg_status}</Pill>}
          {r.difficulty && <Pill>{r.difficulty}</Pill>}
          {r.servings && <Pill>serves {r.servings}</Pill>}
        </div>
      </div>
      {r.cuisine && <p className="mt-1 text-zinc-400">{r.cuisine}</p>}
      {r.description && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{r.description}</p>
      )}

      {times.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {times.map((t) => {
            const [label, value] = t.split(' ');
            return (
              <div
                key={t}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-center"
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
                <p className="mt-0.5 text-lg font-medium">{value}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Ingredients ({r.ingredients.length})
          </p>
          <ul className="mt-3 space-y-1.5">
            {r.ingredients.map((i, n) => (
              <li key={n} className="text-sm">
                <span className="tabular-nums text-zinc-100">
                  {[i.quantity, i.unit].filter(Boolean).join(' ') || '—'}
                </span>{' '}
                <span className="text-zinc-300">{i.item}</span>
                {i.notes && (
                  <span className="text-zinc-600"> — {i.notes}</span>
                )}
              </li>
            ))}
          </ul>
          {r.equipment.length > 0 && (
            <>
              <p className="mt-5 text-xs uppercase tracking-wide text-zinc-500">
                Equipment
              </p>
              <p className="mt-1 text-sm text-zinc-400">{r.equipment.join(', ')}</p>
            </>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Method ({r.steps.length} steps)
          </p>
          <ol className="mt-3 space-y-3">
            {r.steps.map((s) => (
              <li key={s.order} className="flex gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs">
                  {s.order}
                </span>
                <div>
                  <p className="text-zinc-200">
                    {s.instruction}
                    {s.duration_minutes ? (
                      <span className="ml-2 text-xs text-amber-500/80">
                        {s.duration_minutes}m
                      </span>
                    ) : null}
                  </p>
                  {s.tip && (
                    <p className="mt-0.5 text-xs text-emerald-400/80">Tip: {s.tip}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export function ProductCard({ p }: { p: ProductExtraction }) {
  if (!p.is_product_content) {
    return (
      <div className={shell}>
        <h2 className="text-xl font-semibold">No products found</h2>
        <p className="mt-2 text-sm text-zinc-500">{p.reasoning}</p>
      </div>
    );
  }

  const labels = [...new Set(p.products.flatMap((x) => x.specs.map((s) => s.label)))];

  return (
    <div className={shell}>
      <h2 className="text-2xl font-semibold">🛍️ {p.product_category ?? 'Products'}</h2>
      {p.verdict && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{p.verdict}</p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {p.products.map((prod) => (
          <div
            key={prod.name}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{prod.name}</p>
              <span className="shrink-0 text-sm tabular-nums text-emerald-400">
                {prod.price_inr ? inr(prod.price_inr) : prod.price_text ?? '—'}
              </span>
            </div>
            {prod.brand && <p className="text-xs text-zinc-500">{prod.brand}</p>}

            {prod.specs.length > 0 && (
              <dl className="mt-3 space-y-1 text-xs">
                {prod.specs.map((s) => (
                  <div key={s.label} className="flex justify-between gap-2">
                    <dt className="text-zinc-500">{s.label}</dt>
                    <dd className="text-right text-zinc-300">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {prod.pros.map((x) => (
              <p key={x} className="mt-1 text-xs text-emerald-400">+ {x}</p>
            ))}
            {prod.cons.map((x) => (
              <p key={x} className="mt-1 text-xs text-red-400">− {x}</p>
            ))}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {buyLinks(prod.name, prod.brand).map((l) => (
                <a
                  key={l.store}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-900"
                  style={{ background: l.colour }}
                >
                  {l.store} ↗
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Side-by-side only helps once there is something to line up. */}
      {p.products.length > 1 && labels.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Side by side</p>
          <table className="mt-2 w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="py-2 text-left font-normal text-zinc-500" />
                {p.products.map((x) => (
                  <th key={x.name} className="py-2 text-left font-medium">
                    {x.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-900">
                <td className="py-2 text-zinc-500">Price</td>
                {p.products.map((x) => (
                  <td key={x.name} className="py-2 tabular-nums text-emerald-400">
                    {x.price_inr ? inr(x.price_inr) : '—'}
                  </td>
                ))}
              </tr>
              {labels.map((label) => (
                <tr key={label} className="border-b border-zinc-900 last:border-0">
                  <td className="py-2 text-zinc-500">{label}</td>
                  {p.products.map((x) => (
                    <td key={x.name} className="py-2 text-zinc-300">
                      {x.specs.find((s) => s.label === label)?.value ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Buy links are searches, not deep links — say so once rather than
              implying we know the exact listing. */}
          <p className="mt-3 text-xs text-zinc-600">
            Store buttons open a search for that model — we don&rsquo;t guess
            product URLs.
          </p>
        </div>
      )}
    </div>
  );
}

export function GenericCard({ g }: { g: Generic }) {
  const entities = Object.entries(g.entities ?? {}).filter(([, v]) => v?.length);

  return (
    <div className={shell}>
      <h2 className="text-2xl font-semibold">📌 {g.title}</h2>
      <p className="mt-1 text-sm text-zinc-500">{g.topic}</p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">{g.summary}</p>

      {g.key_points.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Key points</p>
          <ul className="mt-2 space-y-1.5">
            {g.key_points.map((k, i) => (
              <li key={i} className="text-sm text-zinc-300">
                · {k}
              </li>
            ))}
          </ul>
        </div>
      )}

      {g.actionable_items.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">To do</p>
          <ul className="mt-2 space-y-1.5">
            {g.actionable_items.map((a, i) => (
              <li key={i} className="text-sm text-emerald-400">
                → {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entities.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {entities.map(([label, values]) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {label.replace(/_/g, ' ')}
              </p>
              <p className="mt-0.5 text-sm text-zinc-300">{values.join(', ')}</p>
            </div>
          ))}
        </div>
      )}

      {g.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {g.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-800 px-2.5 py-1 capitalize text-zinc-300">
      {children}
    </span>
  );
}
