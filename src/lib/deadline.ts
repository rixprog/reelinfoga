import type { Evidence } from './food-spot';

export interface Opportunity {
  is_opportunity: boolean;
  title: string | null;
  organisation: string | null;
  opportunity_type: string;
  description: string;
  deadline_date: string | null;
  deadline_text: string | null;
  event_date: string | null;
  date_confidence: 'explicit' | 'inferred' | 'none';
  deadline_passed?: boolean | null;
  eligibility: string | null;
  location: string | null;
  is_remote: boolean | null;
  fee: string | null;
  prize: string | null;
  stipend: string | null;
  registration_links: string[];
  link_in_bio: boolean;
  contact: string | null;
  evidence: Evidence[];
  search_summary: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export const TYPE_ICON: Record<string, string> = {
  internship: '🎓',
  job: '💼',
  hackathon: '⚡',
  scholarship: '🏅',
  admission: '🏫',
  workshop: '🛠️',
  event: '🎉',
  competition: '🏆',
  webinar: '💻',
  sale: '🏷️',
  other: '📌',
};

/**
 * How the countdown should read and feel.
 *
 * Past deadlines are shown rather than hidden — the user saved the reel, and
 * silently dropping it would leave them wondering where it went. It just reads
 * as expired so nobody acts on it by mistake.
 */
export function countdown(days: number | null, passed?: boolean | null) {
  if (days === null) {
    return { text: 'No date stated', tone: 'neutral' as const };
  }
  if (passed || days < 0) {
    return {
      text: `Closed ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`,
      tone: 'expired' as const,
    };
  }
  if (days === 0) return { text: 'Closes today', tone: 'urgent' as const };
  if (days === 1) return { text: 'Closes tomorrow', tone: 'urgent' as const };
  if (days <= 7) return { text: `${days} days left`, tone: 'urgent' as const };
  if (days <= 30) return { text: `${days} days left`, tone: 'soon' as const };
  return { text: `${days} days left`, tone: 'calm' as const };
}

export const TONE_CLASS = {
  urgent: 'bg-red-500/10 text-red-400 ring-red-500/30',
  soon: 'bg-amber-500/10 text-amber-400 ring-amber-500/30',
  calm: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30',
  expired: 'bg-zinc-700/30 text-zinc-500 ring-zinc-700',
  neutral: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/30',
} as const;

/** Links are captured as seen ("unstop.com/x"), so they need a scheme to be clickable. */
export function href(link: string): string {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
