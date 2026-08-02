import Link from 'next/link';

import { Page } from '@/components/Shell';
import { TripPlanner } from '@/components/TripPlanner';

/** Pushed screen, not a nav item — reached from a travel reel or the map. */
export default async function TripsPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise.
  searchParams: Promise<{ destination?: string }>;
}) {
  const { destination } = await searchParams;

  return (
    <Page
      title={destination ? `Plan a trip to ${destination}` : 'Plan a trip'}
      subtitle={
        destination
          ? 'Built from the places in your saved reels.'
          : 'Your saved travel reels, routed and costed.'
      }
    >
      <Link
        href={destination ? '/reels?category=travel' : '/reels'}
        className="mb-6 inline-block text-sm font-semibold text-primary"
      >
        ← Reels
      </Link>
      <TripPlanner refreshKey={null} destination={destination} />
    </Page>
  );
}
