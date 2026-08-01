'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Card, Empty, Eyebrow, Pill } from './Shell';
import { Thumb } from './Thumb';
import type { SavedItem } from '@/lib/store-client';
import { EDGE, countdown, daysUntil } from '@/lib/ui';

export function AlertsList() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/reels', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, []);

  const deadlines = items
    .filter((i) => i.category === 'deadline')
    .sort((a, b) => {
      // Undated last, expired second-last. Both stay visible: the user saved
      // them deliberately and hiding them reads as data loss.
      const rank = (i: SavedItem) =>
        !i.deadline_date ? 2 : i.deadline_passed ? 1 : 0;
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return (a.deadline_date ?? '9999').localeCompare(b.deadline_date ?? '9999');
    });

  if (loaded && deadlines.length === 0) {
    return (
      <Empty
        title="Nothing closing"
        body="When you save a reel about an internship, hackathon or workshop, its deadline shows up here with a calendar export."
      />
    );
  }

  return (
    <div className="space-y-3">
      {deadlines.map((item) => {
        const d = daysUntil(item.deadline_date);
        const cd = countdown(d, item.deadline_passed);
        const expired = cd.tone === 'flat' && d !== null;
        const link = item.registration_links?.[0];

        return (
          <Card
            key={item.shortcode}
            edge={EDGE[cd.tone]}
            className={expired ? 'opacity-55' : ''}
          >
            <div className="flex flex-col gap-4 p-4 pl-6 sm:flex-row sm:items-center">
              <Link
                href={`/reel/${item.shortcode}`}
                className="flex min-w-0 flex-1 items-center gap-4"
              >
                <Thumb shortcode={item.shortcode} category="deadline" size={52} />
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">
                    {item.title ?? 'Untitled'}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-ink-muted">
                    {[item.organisation, item.deadline_date].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </Link>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Pill tone={cd.tone}>{cd.text}</Pill>
                {!expired && item.deadline_date && (
                  <a
                    href={`/api/reels/${item.shortcode}/ics`}
                    className="rounded-full border border-line px-3.5 py-1.5 text-xs
                               font-semibold text-primary hover:border-primary/40"
                  >
                    Calendar
                  </a>
                )}
                {!expired && link && (
                  <a
                    href={/^https?:\/\//i.test(link) ? link : `https://${link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-primary px-3.5 py-1.5 text-xs
                               font-semibold text-white hover:bg-[#6D28D9]"
                  >
                    Register ↗
                  </a>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
