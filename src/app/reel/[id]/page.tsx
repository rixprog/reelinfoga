import { ReelDetail } from '@/components/ReelDetail';

export default async function ReelPage({
  params,
}: {
  // Next 16: params is a Promise and must be awaited.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReelDetail shortcode={id} />;
}
