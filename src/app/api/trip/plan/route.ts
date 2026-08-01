import { pythonJson, runPython } from '@/lib/python';

export const dynamic = 'force-dynamic';
// Geocoding is capped at 1 req/sec by Nominatim's policy, so a destination with
// ten unseen stops spends ~11s there before the model is called at all.
export const maxDuration = 180;

const GROUPS = ['solo', 'couple', 'family', 'friends'];
const PACES = ['relaxed', 'balanced', 'packed'];
const STAYS = ['budget', 'mid', 'premium'];

interface Body {
  destination?: string;
  days?: number;
  travellers?: number;
  group_type?: string;
  origin?: string;
  budget_total?: number;
  pace?: string;
  stay_type?: string;
  extra_places?: string[];
}

/** Stage 2: the costed plan, once we know who is going and on what budget. */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const destination = body.destination?.trim();
  if (!destination) {
    return Response.json({ error: 'Pick a destination.' }, { status: 400 });
  }

  // Clamp rather than reject: a stray 0 or 99 should still produce a plan.
  const days = Math.min(Math.max(Number(body.days) || 2, 1), 7);
  const travellers = Math.min(Math.max(Number(body.travellers) || 2, 1), 20);
  const group = GROUPS.includes(body.group_type ?? '') ? body.group_type! : 'couple';
  const pace = PACES.includes(body.pace ?? '') ? body.pace! : 'balanced';
  const stay = STAYS.includes(body.stay_type ?? '') ? body.stay_type! : 'mid';

  const args = [
    'trip.py', destination,
    '--days', String(days),
    '--travellers', String(travellers),
    '--group', group,
    '--pace', pace,
    '--stay', stay,
    '--json',
  ];
  if (body.origin?.trim()) args.push('--origin', body.origin.trim());
  if (body.budget_total && body.budget_total > 0) {
    args.push('--budget', String(Math.round(body.budget_total)));
  }
  for (const place of body.extra_places ?? []) {
    if (place?.trim()) args.push('--add', place.trim());
  }

  const res = pythonJson(await runPython(args));
  return res.ok
    ? Response.json(res.data)
    : Response.json({ error: res.error }, { status: 400 });
}
