import { ReelsGrid } from '@/components/ReelsGrid';
import { CollectionHeader } from '@/components/SavedView';
import { Page } from '@/components/Shell';

export default async function CollectionPage({
  params,
}: {
  // Next 16: params is a Promise.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Page wide>
      <CollectionHeader id={id} />
      <ReelsGrid collectionId={id} />
    </Page>
  );
}
