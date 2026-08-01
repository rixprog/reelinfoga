// Shapes returned by pipeline.py, plus small helpers the UI needs.

export interface Evidence {
  field: string;
  source:
    | 'frame'
    | 'transcript'
    | 'caption'
    | 'hashtag'
    | 'comment'
    | 'creator_reply'
    | 'geotag'
    | 'tagged_user'
    | 'bio';
  quote: string;
}

export interface FoodSpot {
  is_food_content: boolean;
  place_name: string | null;
  place_aliases: string[];
  area: string | null;
  city: string | null;
  state: string | null;
  landmark: string | null;
  full_address: string | null;
  dishes: string[];
  cuisine: string | null;
  price_band: 'budget' | 'mid' | 'premium' | null;
  veg_status: 'veg' | 'non-veg' | 'both' | null;
  offers: string[];
  contact: string | null;
  evidence: Evidence[];
  search_summary: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface AnalyzeResult {
  url: string;
  category: 'food_spot' | 'deadline' | 'travel' | 'other';
  reel: {
    shortcode: string;
    owner: string;
    caption: string;
    hashtags: string[];
    tagged_users: string[];
    likes: number;
    comment_count: number;
    logged_in: boolean;
    location_name: string | null;
    location_lat: number | null;
    location_lng: number | null;
  };
  transcript: {
    language: string | null;
    native: string;
    english: string;
    roman: string;
    low_confidence: boolean;
  };
  food_spot: FoodSpot;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

export function whereLine(fs: FoodSpot): string {
  return [fs.area, fs.city, fs.state].filter(Boolean).join(', ');
}

/**
 * Confidence drives what the UI is allowed to claim.
 *
 * `high` is the only tier we would auto-pin on a map. `medium` means the model
 * found a name but could not pin the city — often a chain with several branches —
 * so it has to be confirmed rather than silently resolved to one location.
 */
export const CONFIDENCE_UI = {
  high: {
    label: 'High confidence',
    hint: 'Place and city identified — safe to map.',
    className: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30',
  },
  medium: {
    label: 'Needs confirmation',
    hint: 'Found the place, but the exact location is ambiguous.',
    className: 'bg-amber-500/10 text-amber-400 ring-amber-500/30',
  },
  low: {
    label: 'No place found',
    hint: 'Nothing in this reel identifies a specific eatery.',
    className: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/30',
  },
} as const;

export const SOURCE_LABEL: Record<Evidence['source'], string> = {
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

export function mapsUrl(fs: FoodSpot): string {
  const q = [fs.place_name, fs.area, fs.city, fs.state]
    .filter(Boolean)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
