import { readIndex, sortByUrgency } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get('category');
  let items = await readIndex();

  if (category) items = items.filter((i) => i.category === category);
  if (!category || category === 'deadline') items = sortByUrgency(items);

  return Response.json({ count: items.length, items });
}
