import { pythonJson, runPython } from '@/lib/python';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  const category = url.searchParams.get('category');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 10, 30);

  if (!q) return Response.json({ query: '', results: [] });

  const args = ['search.py', q, '--limit', String(limit), '--json'];
  if (category) args.push('--category', category);

  const res = pythonJson(await runPython(args));
  return res.ok
    ? Response.json(res.data)
    : Response.json({ error: res.error }, { status: 500 });
}
