import { SavedView } from '@/components/SavedView';
import { Page } from '@/components/Shell';

export default function SavedPage() {
  return (
    <Page title="Saved" subtitle="Your shortlist — starred reels and collections you've made.">
      <SavedView />
    </Page>
  );
}
