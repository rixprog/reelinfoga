import { pythonJson, runPython } from '@/lib/python';

export const dynamic = 'force-dynamic';
// Cold lookups are capped in places.py, but Nominatim is 1 req/sec so a first
// run on a fresh library still needs room.
export const maxDuration = 60;

export async function GET() {
  const res = pythonJson(await runPython(['places.py', '--json']));
  return res.ok
    ? Response.json(res.data)
    : Response.json({ places: [], error: res.error }, { status: 200 });
}
