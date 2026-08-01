import { TripPlanner } from '@/components/TripPlanner';
import { Page } from '@/components/Shell';

export default function TripsPage() {
  return (
    <Page
      title="Trips"
      subtitle="Your saved travel reels, grouped by destination and costed."
    >
      <TripPlanner refreshKey={null} />
    </Page>
  );
}
