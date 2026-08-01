// ============================================================
// ReelMind — Core TypeScript Types
// ============================================================

// --- Categories ---
export const CATEGORIES = [
  'Food', 'Events', 'Courses', 'Scholarships', 'Jobs', 'Travel',
  'Shopping', 'Movies', 'Books', 'Finance', 'Technology', 'Fitness',
  'Recipes', 'Fashion', 'Beauty', 'Education', 'Lifestyle', 'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_ICONS: Record<Category, string> = {
  Food: '🍔', Events: '🎉', Courses: '📚', Scholarships: '🎓',
  Jobs: '💼', Travel: '✈️', Shopping: '🛍️', Movies: '🎬',
  Books: '📖', Finance: '💰', Technology: '💻', Fitness: '🏋️',
  Recipes: '🍳', Fashion: '👗', Beauty: '💄', Education: '🎓',
  Lifestyle: '🌿', Other: '📌',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#FF6B6B', Events: '#FFD93D', Courses: '#6BCB77', Scholarships: '#4D96FF',
  Jobs: '#FF922B', Travel: '#20C997', Shopping: '#E64980', Movies: '#845EF7',
  Books: '#339AF0', Finance: '#51CF66', Technology: '#22B8CF', Fitness: '#FF6B6B',
  Recipes: '#FFA94D', Fashion: '#DA77F2', Beauty: '#F783AC', Education: '#5C7CFA',
  Lifestyle: '#38D9A9', Other: '#ADB5BD',
};

// --- Languages ---
export const SUPPORTED_LANGUAGES = [
  'English', 'Malayalam', 'Hindi', 'Tamil', 'Arabic',
  'Spanish', 'French', 'Japanese', 'German',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// --- Processing Pipeline ---
export type ProcessingStep =
  | 'downloading'
  | 'extracting_audio'
  | 'transcribing'
  | 'ocr'
  | 'understanding'
  | 'generating_summary'
  | 'saving';

export interface PipelineStep {
  id: ProcessingStep;
  label: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number; // 0-100
}

// --- Category-Specific Extracted Data ---
export interface FoodData {
  restaurantName: string;
  location: string;
  cuisine: string;
  priceRange: string;
  openingHours: string;
  popularItems: string[];
  coordinates?: { lat: number; lng: number };
  googleMapsLink?: string;
  rating?: number;
}

export interface EventData {
  eventName: string;
  date: string;
  time: string;
  venue: string;
  registrationDeadline: string;
  fee: string;
  registrationLink?: string;
  organizer: string;
  eligibility?: string;
}

export interface ScholarshipData {
  name: string;
  deadline: string;
  country: string;
  funding: string;
  eligibility: string;
  officialWebsite?: string;
  documentsRequired: string[];
}

export interface JobData {
  company: string;
  role: string;
  salary: string;
  location: string;
  experience: string;
  applyLink?: string;
  deadline: string;
  skills: string[];
}

export interface RecipeData {
  dishName: string;
  ingredients: { name: string; measurement: string }[];
  steps: string[];
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface ShoppingData {
  brand: string;
  model: string;
  features: string[];
  specifications: Record<string, string>;
  mentionedPrice: string;
  productImages?: string[];
}

export interface TravelData {
  destination: string;
  bestTime: string;
  budget: string;
  highlights: string[];
  tips: string[];
  coordinates?: { lat: number; lng: number };
}

export type CategoryData =
  | { type: 'Food'; data: FoodData }
  | { type: 'Events'; data: EventData }
  | { type: 'Scholarships'; data: ScholarshipData }
  | { type: 'Jobs'; data: JobData }
  | { type: 'Recipes'; data: RecipeData }
  | { type: 'Shopping'; data: ShoppingData }
  | { type: 'Travel'; data: TravelData }
  | { type: 'Other'; data: Record<string, string> };

// --- Reel ---
export interface ProcessedReel {
  id: string;
  originalUrl: string;
  thumbnailUrl: string;
  title: string;
  category: Category;
  summary: string;
  tags: string[];
  language: SupportedLanguage;
  transcript?: string;
  ocrText?: string;
  caption?: string;
  entities: {
    dates: string[];
    locations: string[];
    prices: string[];
    links: string[];
    phoneNumbers: string[];
    deadlines: string[];
  };
  categoryData?: CategoryData;
  priceComparison?: PriceComparison;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  processedAt: string;
  reminderDate?: string;
  reminderType?: NotificationType;
}

// --- Price Comparison ---
export interface PriceComparisonItem {
  store: string;
  storeLogo: string;
  price: number;
  currency: string;
  url: string;
  inStock: boolean;
  isOfficial: boolean;
}

export interface PriceComparison {
  productName: string;
  mentionedPrice: number;
  currency: string;
  items: PriceComparisonItem[];
  cheapestStore: string;
  estimatedSavings: number;
  alternatives: { name: string; price: number; url: string }[];
}

// --- Notifications ---
export type NotificationType =
  | 'food_nearby'
  | 'event_reminder'
  | 'scholarship_deadline'
  | 'discount_expiry'
  | 'movie_release'
  | 'job_deadline'
  | 'general';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  reelId?: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  icon: string;
}

// --- Chat ---
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reelReferences?: { id: string; title: string; thumbnail: string }[];
  timestamp: string;
}

// --- Analytics ---
export interface AnalyticsData {
  totalReels: number;
  upcomingReminders: number;
  nearbyPlaces: number;
  savedMoney: number;
  categoryBreakdown: { category: Category; count: number }[];
  monthlyActivity: { month: string; count: number }[];
  moneySavedByMonth: { month: string; amount: number }[];
  upcomingDeadlines: { title: string; date: string; category: Category; reelId: string }[];
}

// --- User ---
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

// --- Search ---
export interface SearchResult {
  reel: ProcessedReel;
  relevance: number;
  matchedFields: string[];
}
