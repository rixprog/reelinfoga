import { AlertsList } from '@/components/AlertsList';
import { Page } from '@/components/Shell';

export default function AlertsPage() {
  return (
    <Page
      title="Alerts"
      subtitle="Deadlines from your saved reels, soonest first."
    >
      <AlertsList />
    </Page>
  );
}
