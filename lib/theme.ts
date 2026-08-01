/**
 * Tokens lifted from the approved design reference.
 *
 * The one rule that keeps this from looking like every other generated app:
 * violet is the ACCENT, never the surface. The reel thumbnails carry all the
 * colour; the chrome stays white, grey and near-black around them.
 */
export const c = {
  primary: '#7C3AED',
  primarySoft: '#EDE9FE',
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#ECECEF',

  text: '#18181B',
  textMuted: '#71717A',
  textFaint: '#A1A1AA',

  green: '#16A34A',
  greenSoft: '#DCFCE7',
  amber: '#F59E0B',
  amberSoft: '#FEF3C7',
  red: '#DC2626',
  redSoft: '#FEE2E2',
} as const;

export const radius = { card: 20, button: 14, tile: 12, pill: 999 } as const;

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const;

/** Category tint pairs — used on small icon tiles only, never a whole card. */
export const CATEGORY = {
  food_spot: { label: 'Food Spots', tint: '#FFEDD5', ink: '#EA580C' },
  deadline: { label: 'Deadlines', tint: '#FEF3C7', ink: '#D97706' },
  travel: { label: 'Travel', tint: '#CCFBF1', ink: '#0D9488' },
  recipe: { label: 'Recipes', tint: '#FFE4E6', ink: '#E11D48' },
  product: { label: 'Products', tint: '#EDE9FE', ink: '#7C3AED' },
  other: { label: 'Everything Else', tint: '#F4F4F5', ink: '#71717A' },
} as const;

export type CategoryKey = keyof typeof CATEGORY;

export function categoryOf(key: string | undefined) {
  return CATEGORY[(key ?? 'other') as CategoryKey] ?? CATEGORY.other;
}
