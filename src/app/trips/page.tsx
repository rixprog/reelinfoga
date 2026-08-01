import Link from 'next/link';

import { Page } from '@/components/Shell';
import { TripPlanner } from '@/components/TripPlanner';

/** Pushed screen, not a nav item — reached from a travel reel or the map. */
export default function TripsPage() {
  return (
    <Page title="Plan a trip" subtitle="Your saved travel reels, routed and costed.">
      <Link href="/reels" className="mb-6 inline-block text-sm font-semibold text-primary">
        ← Reels
      </Link>
      <TripPlanner refreshKey={null} />
    </Page>
  );
}
