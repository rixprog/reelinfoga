// Client-safe half of the store.
//
// store.ts imports node:fs, so anything a Client Component needs has to live
// here or the bundler pulls a Node builtin into the browser chunk.

export interface SavedItem {
  shortcode: string;
  url: string;
  category: 'deadline' | 'food_spot' | 'travel' | 'recipe' | 'product' | 'other';
  owner: string | null;
  caption: string | null;
  hashtags: string[];
  likes: number | null;
  language: string | null;
  saved_at: string;
  title: string | null;
  confidence?: 'high' | 'medium' | 'low';

  organisation?: string | null;
  opportunity_type?: string | null;
  deadline_date?: string | null;
  deadline_text?: string | null;
  event_date?: string | null;
  deadline_passed?: boolean | null;
  registration_links?: string[];
  link_in_bio?: boolean;

  city?: string | null;
  area?: string | null;

  // travel vertical
  destination?: string | null;
  state?: string | null;
  best_season?: string | null;
  place_count?: number;

  // recipe vertical
  cuisine?: string | null;
  total_time_minutes?: number | null;
  ingredient_count?: number;
  step_count?: number;
  veg_status?: string | null;

  // product vertical
  product_category?: string | null;
  product_count?: number;
  product_names?: string[];

  // generic vertical
  topic?: string | null;
  tags?: string[];

  payload: Record<string, unknown>;
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Deadlines by urgency, soonest first.
 *
 * Undated opportunities sort last rather than being hidden — "applications open,
 * link in bio" with no date is still something the user chose to save.
 */
export function sortByUrgency(items: SavedItem[]): SavedItem[] {
  return [...items].sort((a, b) => {
    const rank = (i: SavedItem) =>
      !i.deadline_date ? 2 : i.deadline_passed ? 1 : 0;
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return (a.deadline_date ?? '9999').localeCompare(b.deadline_date ?? '9999');
  });
}
