'use client';

import { useState } from 'react';

import { CATEGORY_META } from '@/lib/cards';

/**
 * A reel's thumbnail, with a category-coloured fallback.
 *
 * The image is served by /api/thumb because downloads/ lives outside public/ —
 * it is regenerable working data that gets pruned after every extraction.
 *
 * `onError` matters more than usual here: media is purged aggressively, so a
 * record can outlive its image. Falling back to the category glyph keeps the
 * row looking deliberate instead of showing a broken-image icon.
 */
export function Thumb({
  shortcode,
  category,
  size = 56,
}: {
  shortcode: string;
  category: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const meta = CATEGORY_META[category] ?? CATEGORY_META.other;

  if (failed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-lg"
        style={{ width: size, height: size }}
        aria-label={meta.label}
      >
        {meta.icon}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- served by our own
    // route from a gitignored dir; next/image would need remotePatterns config
    // for no benefit at this size.
    <img
      src={`/api/thumb/${shortcode}`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-lg object-cover"
      style={{ width: size, height: size }}
    />
  );
}
