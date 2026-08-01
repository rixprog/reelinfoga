'use client';

import { useState } from 'react';

import { categoryOf } from '@/lib/ui';

/**
 * A reel's thumbnail, served by /api/thumb (downloads/ lives outside public/).
 *
 * `onError` is load-bearing rather than defensive: the backend purges media
 * after extraction, so a record can outlive its image. A category-tinted tile
 * reads as deliberate where a broken-image icon reads as a bug.
 */
export function Thumb({
  shortcode,
  category,
  size = 56,
  fill = false,
}: {
  shortcode: string;
  category?: string;
  /** Fixed square size in px. Ignored when `fill` is set. */
  size?: number;
  /**
   * Stretch to the parent instead of a fixed size. Required anywhere the tile
   * sits in a responsive grid — a fixed px width silently overflows narrow
   * viewports and drags the whole layout wider than the screen.
   */
  fill?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const { tint, one: label } = categoryOf(category);

  const box = fill
    ? { position: 'absolute' as const, inset: 0, width: '100%', height: '100%' }
    : { width: size, height: size };

  if (failed) {
    return (
      <div
        className={fill ? '' : 'shrink-0 rounded-xl'}
        style={{ ...box, background: tint }}
        aria-label={label}
      />
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
      className={fill ? 'object-cover' : 'shrink-0 rounded-xl object-cover'}
      style={{ ...box, background: tint }}
    />
  );
}
