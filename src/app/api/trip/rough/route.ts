import { pythonJson, runPython } from '@/lib/python';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Stage 1: instant first look, no user input, no geocoding. */
export async function POST(request: Request) {
  let body: { destination?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }
  const destination = body.destination?.trim();
  if (!destination) {
    return Response.json({ error: 'Pick a destination.' }, { status: 400 });
  }

  const res = pythonJson(
    await runPython(['trip.py', destination, '--rough', '--json']),
  );
  return res.ok
    ? Response.json(res.data)
    : Response.json({ error: res.error }, { status: 400 });
}
