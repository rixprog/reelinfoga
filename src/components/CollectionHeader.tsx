'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { type Collection, collections } from '@/lib/collections';

export function CollectionHeader({ id }: { id: string }) {
  const [c, setC] = useState<Collection | null>(null);
  useEffect(() => {
    setC(collections.all().find((x) => x.id === id) ?? null);
  }, [id]);
  if (!c) return null;
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <Link href="/reels" className="text-sm font-semibold text-primary">
        ← Reels
      </Link>
      <button
        onClick={() => {
          if (window.confirm(`Delete the collection "${c.name}"? The reels stay.`)) {
            collections.remove(c.id);
            window.location.href = '/reels';
          }
        }}
        className="text-xs font-semibold text-ink-faint hover:text-[#DC2626]"
      >
        Delete collection
      </button>
    </div>
  );
}
