'use client';

import { useEffect, useState } from 'react';

import { Thumb } from './Thumb';

/**
 * Plays a reel using Instagram's own embed.
 *
 * We deliberately keep no video: the pipeline purges the mp4 after extraction
 * (18 MB -> 160 KB per reel), so there is nothing local to play. Embedding is
 * also the only version that stays correct — if the creator edits or deletes
 * the reel, this reflects that instead of serving a stale copy.
 *
 * The iframe mounts ONLY after a click. Each embed pulls ~128 KB plus
 * Instagram's scripts, so a grid of fifteen auto-loading players would be
 * brutal on a mid-range phone.
 */
export function ReelPlayer({
  shortcode,
  category,
  className = '',
}: {
  shortcode: string;
  category?: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className={`overflow-hidden rounded-2xl border border-line bg-black ${className}`}>
        <iframe
          src={`https://www.instagram.com/reel/${shortcode}/embed/`}
          title="Instagram reel"
          className="h-[560px] w-full"
          frameBorder={0}
          scrolling="no"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      aria-label="Play reel"
      className={`group relative block w-full overflow-hidden rounded-2xl ${className}`}
    >
      <div className="h-64">
        <Thumb shortcode={shortcode} category={category} fill />
      </div>
      <span className="absolute inset-0 bg-black/15 transition group-hover:bg-black/25" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-14 place-items-center rounded-full bg-white/95 shadow-lg transition group-hover:scale-105">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--primary)">
            <path d="M8 5.2v13.6a.6.6 0 0 0 .92.5l10.6-6.8a.6.6 0 0 0 0-1l-10.6-6.8a.6.6 0 0 0-.92.5Z" />
          </svg>
        </span>
      </span>
    </button>
  );
}

/** Full-screen player, used from the Reels grid. */
export function ReelPlayerModal({
  shortcode,
  onClose,
}: {
  shortcode: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!shortcode) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // Stop the page behind the overlay scrolling under it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [shortcode, onClose]);

  if (!shortcode) return null;

  return (
    <div
      className="fixed inset-0 z-[900] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={`https://www.instagram.com/reel/${shortcode}/embed/`}
          title="Instagram reel"
          className="h-[640px] w-full"
          frameBorder={0}
          scrolling="no"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
      <button
        onClick={onClose}
        className="mt-4 rounded-full bg-white/95 px-5 py-2 text-sm font-semibold"
      >
        Close
      </button>
    </div>
  );
}
