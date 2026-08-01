import { ReelsGrid } from '@/components/ReelsGrid';
import { Page } from '@/components/Shell';

export default function ReelsPage() {
  return (
    <Page title="Reels" subtitle="Everything you've saved. Search by meaning, not keywords." wide>
      <ReelsGrid />
    </Page>
  );
}
