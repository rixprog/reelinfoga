/** Shared presentation constants for the light theme. */

export const CATEGORY = {
  food_spot: { label: 'Food Spots', one: 'Food spot', tint: '#FFEDD5', ink: '#EA580C' },
  deadline: { label: 'Deadlines', one: 'Deadline', tint: '#FEF3C7', ink: '#D97706' },
  travel: { label: 'Travel', one: 'Travel', tint: '#CCFBF1', ink: '#0D9488' },
  recipe: { label: 'Recipes', one: 'Recipe', tint: '#FFE4E6', ink: '#E11D48' },
  product: { label: 'Products', one: 'Product', tint: '#EDE9FE', ink: '#7C3AED' },
  other: { label: 'Everything Else', one: 'Other', tint: '#F4F4F5', ink: '#71717A' },
} as const;

export type CategoryKey = keyof typeof CATEGORY;

export function categoryOf(k: string | undefined | null) {
  return CATEGORY[(k ?? 'other') as CategoryKey] ?? CATEGORY.other;
}

export const CATEGORY_ORDER: CategoryKey[] = [
  'food_spot',
  'deadline',
  'travel',
  'recipe',
  'product',
  'other',
];

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/**
 * Stable identity for a map pin, shared by the list rail and the map itself.
 *
 * Lives here rather than beside the map so the rail can import it without
 * pulling Leaflet into the server bundle — LocationMap touches `window` at
 * module scope, which is why it is loaded with ssr: false.
 */
export const placeKey = (p: { name: string }, n: number) => `${p.name}-${n}`;

export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(t)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((t - today.getTime()) / 86_400_000);
}

/**
 * Countdown wording and colour.
 *
 * Expired items are shown, not hidden — the user saved them deliberately, and
 * making them vanish reads as data loss. They just go grey.
 */
export function countdown(days: number | null, passed?: boolean | null) {
  if (days === null) return { text: 'No date stated', tone: 'flat' as const };
  if (passed || days < 0) return { text: 'Closed', tone: 'flat' as const };
  if (days === 0) return { text: 'Closes today', tone: 'bad' as const };
  if (days === 1) return { text: 'Closes tomorrow', tone: 'bad' as const };
  if (days <= 7) return { text: `${days} days left`, tone: 'warn' as const };
  return { text: `${days} days left`, tone: 'ok' as const };
}

export const TONE = {
  ok: 'bg-[var(--green-soft)] text-[var(--green)]',
  warn: 'bg-[var(--amber-soft)] text-[var(--amber)]',
  bad: 'bg-[var(--red-soft)] text-[var(--red)]',
  violet: 'bg-[var(--primary-soft)] text-[var(--primary)]',
  flat: 'bg-[var(--background)] text-[var(--ink-faint)]',
} as const;

export const EDGE = {
  ok: 'var(--green)',
  warn: 'var(--amber)',
  bad: 'var(--red)',
  flat: 'var(--border)',
} as const;

export const SOURCE_LABEL: Record<string, string> = {
  frame: 'on-screen',
  transcript: 'audio',
  caption: 'caption',
  hashtag: 'hashtag',
  comment: 'comment',
  creator_reply: 'creator reply',
  geotag: 'geotag',
  tagged_user: 'tagged account',
  bio: 'creator bio',
};

export function detailLine(i: Record<string, any>): string {
  switch (i.category) {
    case 'deadline':
      return countdown(daysUntil(i.deadline_date), i.deadline_passed).text;
    case 'food_spot':
      return [i.area, i.city].filter(Boolean).join(', ') || 'Location unresolved';
    case 'travel':
      return `${i.place_count ?? 0} places`;
    case 'recipe':
      return [
        i.total_time_minutes ? `${i.total_time_minutes} min` : null,
        i.ingredient_count ? `${i.ingredient_count} ingredients` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    case 'product':
      return (i.product_names ?? []).join(', ') || 'Products';
    default:
      return i.topic || 'Saved';
  }
}
