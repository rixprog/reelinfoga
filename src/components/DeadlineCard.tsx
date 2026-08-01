'use client';

import {
  Opportunity,
  TONE_CLASS,
  TYPE_ICON,
  countdown,
  formatDate,
  href,
} from '@/lib/deadline';
import { daysUntil } from '@/lib/store-client';

export function DeadlineCard({
  op,
  shortcode,
}: {
  op: Opportunity;
  shortcode: string;
}) {
  if (!op.is_opportunity) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="text-xl font-semibold">No opportunity found</h2>
        <p className="mt-2 text-sm text-zinc-500">{op.reasoning}</p>
      </div>
    );
  }

  const days = daysUntil(op.deadline_date);
  const cd = countdown(days, op.deadline_passed);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold">
            <span className="mr-2">{TYPE_ICON[op.opportunity_type] ?? '📌'}</span>
            {op.title ?? 'Untitled opportunity'}
          </h2>
          {op.organisation && (
            <p className="mt-1 text-zinc-400">{op.organisation}</p>
          )}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${TONE_CLASS[cd.tone]}`}
        >
          {cd.text}
        </span>
      </div>

      {op.description && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {op.description}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Apply before
          </p>
          <p className="mt-1 text-lg font-medium">
            {formatDate(op.deadline_date)}
          </p>
          {op.deadline_text && (
            <p className="mt-1 text-xs text-zinc-500">
              &ldquo;{op.deadline_text}&rdquo;
            </p>
          )}
          {/* Surfacing an inferred year matters: "August 15" with no year is a
              guess, and the user should know before trusting the reminder. */}
          {op.date_confidence === 'inferred' && (
            <p className="mt-1 text-xs text-amber-500/80">
              Year inferred — worth double-checking
            </p>
          )}
        </div>

        {op.event_date && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Event date
            </p>
            <p className="mt-1 text-lg font-medium">{formatDate(op.event_date)}</p>
          </div>
        )}
      </div>

      <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Field label="Eligibility" value={op.eligibility} />
        <Field
          label="Location"
          value={op.is_remote ? `${op.location ?? 'Remote'} (remote)` : op.location}
        />
        <Field label="Fee" value={op.fee} />
        <Field label="Stipend" value={op.stipend} />
        <Field label="Prize" value={op.prize} />
        <Field label="Contact" value={op.contact} />
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        {op.deadline_date && (
          <a
            href={`/api/reels/${shortcode}/ics`}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900
                       hover:bg-white"
          >
            Add to calendar
          </a>
        )}
        {op.registration_links.map((link) => (
          <a
            key={link}
            href={href(link)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm
                       text-zinc-200 hover:border-zinc-500"
          >
            Register ↗
          </a>
        ))}
      </div>

      {op.registration_links.length === 0 && op.link_in_bio && (
        <p className="mt-3 text-xs text-zinc-500">
          No direct link in the reel — the creator says it&rsquo;s in their bio.
        </p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-200">{value}</dd>
    </div>
  );
}
