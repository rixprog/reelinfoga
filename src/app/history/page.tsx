import { HistoryList } from '@/components/HistoryList';
import { Page } from '@/components/Shell';

export default function HistoryPage() {
  return (
    <Page title="History" subtitle="Everything you've analyzed, newest first.">
      <HistoryList />
    </Page>
  );
}
