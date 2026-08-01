import { Library } from '@/components/Library';
import { Page } from '@/components/Shell';

export default function Home() {
  return (
    <Page
      title="Your saved reels"
      subtitle="Paste a reel. We read the frames, listen to the audio, and pull out what matters."
    >
      <Library />
    </Page>
  );
}
