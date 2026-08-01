import { spawn } from 'node:child_process';
import path from 'node:path';

export const dynamic = 'force-dynamic';
// Geocoding is throttled to 1 req/sec by Nominatim's usage policy, so a fresh
// destination with 8 stops spends ~9s there before the model is even called.
export const maxDuration = 120;

const PROJECT_ROOT = process.cwd();
const DEFAULT_VENV_PYTHON = ['.venv', 'bin', 'python'].join(path.sep);

function resolvePython(): string {
  const configured = process.env.REELBRAIN_PYTHON || DEFAULT_VENV_PYTHON;
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(PROJECT_ROOT, configured);
}

function runPython(args: string[]): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    const child = spawn(resolvePython(), args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => (out += c.toString()));
    child.stderr.on('data', (c) => (err += c.toString()));
    child.on('error', (e) => resolve({ code: -1, out, err: e.message }));
    child.on('close', (code) => resolve({ code: code ?? -1, out, err }));
  });
}

/** GET /api/itinerary — which destinations do we have saved reels for? */
export async function GET() {
  const { out } = await runPython(['itinerary.py', '--list', '--json']);
  try {
    return Response.json(JSON.parse(out));
  } catch {
    return Response.json({ destinations: [] });
  }
}

/** POST /api/itinerary { destination, days } — build the plan. */
export async function POST(request: Request) {
  let body: { destination?: string; days?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const destination = body.destination?.trim();
  if (!destination) {
    return Response.json({ error: 'Pick a destination.' }, { status: 400 });
  }
  const days = Math.min(Math.max(Number(body.days) || 1, 1), 7);

  const { code, out, err } = await runPython([
    'itinerary.py', destination, '--days', String(days), '--json',
  ]);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(out);
  } catch {
    // Surface the tail of stderr — a bare "failed" tells the user nothing about
    // whether it was geocoding, the model, or a missing API key.
    return Response.json(
      { error: err.trim().split('\n').slice(-3).join(' ') || 'Itinerary failed.' },
      { status: 500 },
    );
  }

  if (code !== 0 || parsed.error) {
    return Response.json({ error: parsed.error ?? 'Itinerary failed.' },
      { status: 400 });
  }
  return Response.json(parsed);
}
