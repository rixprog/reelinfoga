import type { Evidence } from './food-spot';

export interface Recipe {
  is_recipe: boolean;
  dish_name: string | null;
  cuisine: string | null;
  description: string;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  difficulty: string | null;
  veg_status: string | null;
  ingredients: { item: string; quantity: string | null; unit: string | null; notes: string | null }[];
  steps: { order: number; instruction: string; duration_minutes: number | null; tip: string | null }[];
  equipment: string[];
  evidence: Evidence[];
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface ProductItem {
  name: string;
  brand: string | null;
  price_inr: number | null;
  price_text: string | null;
  rating_out_of_5: number | null;
  specs: { label: string; value: string }[];
  pros: string[];
  cons: string[];
  best_for: string | null;
}

export interface ProductExtraction {
  is_product_content: boolean;
  product_category: string | null;
  verdict: string;
  products: ProductItem[];
  evidence: Evidence[];
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface Generic {
  title: string;
  topic: string;
  summary: string;
  key_points: string[];
  actionable_items: string[];
  entities: Record<string, string[]>;
  tags: string[];
  evidence: Evidence[];
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

/**
 * Store SEARCH links, never product links.
 *
 * A model cannot know a real Amazon ASIN or Flipkart product id, and a
 * fabricated one is a 404 the user hits right after we told them where to buy.
 * A search URL built from the extracted name always resolves.
 */
export function buyLinks(name: string, brand?: string | null) {
  let q = [brand, name].filter(Boolean).join(' ');
  if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) q = name;
  const enc = encodeURIComponent(q);
  return [
    { store: 'Amazon', url: `https://www.amazon.in/s?k=${enc}`, colour: '#ff9900' },
    { store: 'Flipkart', url: `https://www.flipkart.com/search?q=${enc}`, colour: '#2874f0' },
    { store: 'Shopping', url: `https://www.google.com/search?tbm=shop&q=${enc}`, colour: '#34a853' },
  ];
}

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  food_spot: { icon: '🍽️', label: 'Food spot' },
  deadline: { icon: '⏰', label: 'Event' },
  travel: { icon: '🗺️', label: 'Travel' },
  recipe: { icon: '👨‍🍳', label: 'Recipe' },
  product: { icon: '🛍️', label: 'Product' },
  other: { icon: '📌', label: 'Other' },
};
