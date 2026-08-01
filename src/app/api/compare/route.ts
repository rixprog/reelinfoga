import { readIndex } from '@/lib/store';

export const dynamic = 'force-dynamic';

interface Spec { label: string; value: string }
interface Product {
  name: string;
  brand: string | null;
  price_inr: number | null;
  price_text: string | null;
  specs: Spec[];
  pros: string[];
  cons: string[];
  best_for: string | null;
}

/**
 * Merge products across every reel sharing a product_category.
 *
 * The comparison the user actually wants spans reels — they saved four
 * headphone reviews from four creators, not one comparison video. Grouping on
 * product_category is what makes that possible, which is why the extractor is
 * told to keep that key broad and repeatable.
 */
export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get('category');
  const items = (await readIndex()).filter((i) => i.category === 'product');

  const categories = [
    ...new Set(
      items
        .map((i) => (i.payload as { product_category?: string })?.product_category)
        .filter(Boolean) as string[],
    ),
  ];

  if (!category) return Response.json({ categories, products: [], specLabels: [] });

  const rows: (Product & { source_url: string; source_owner: string | null })[] = [];
  for (const item of items) {
    const payload = item.payload as {
      product_category?: string;
      products?: Product[];
    };
    if (payload?.product_category !== category) continue;
    for (const p of payload.products ?? []) {
      // Same product reviewed in two reels: keep the first, but prefer a row
      // that actually has a price over one that does not.
      const existing = rows.find(
        (r) => r.name.toLowerCase() === p.name.toLowerCase(),
      );
      if (existing) {
        if (existing.price_inr == null && p.price_inr != null) {
          Object.assign(existing, p);
        }
        continue;
      }
      rows.push({ ...p, source_url: item.url, source_owner: item.owner });
    }
  }

  // Union of spec labels, so the table has one column per attribute and a blank
  // cell where a reel never mentioned it.
  const specLabels = [
    ...new Set(rows.flatMap((r) => r.specs.map((s) => s.label))),
  ];

  rows.sort((a, b) => (a.price_inr ?? Infinity) - (b.price_inr ?? Infinity));

  return Response.json({ categories, category, products: rows, specLabels });
}
