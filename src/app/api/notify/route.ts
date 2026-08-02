import { pythonJson, runPython } from '@/lib/python';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

/** Which channels the server can actually reach. */
export async function GET() {
  const res = pythonJson(await runPython(['-c', STATUS]));
  return res.ok
    ? Response.json(res.data)
    : Response.json({ channels: [], error: res.error }, { status: 200 });
}

/** Send a real test message so "configured" can be proven, not assumed. */
export async function POST() {
  const res = pythonJson(await runPython(['-c', TEST]));
  return res.ok
    ? Response.json(res.data)
    : Response.json({ ok: false, error: res.error }, { status: 200 });
}

// stdout is reserved for JSON: notify.send() prints a console-fallback block
// when no channel is configured, which would otherwise corrupt the response.
const STATUS = `
import json, sys
sys.path.insert(0, '.')
real = sys.stdout
sys.stdout = sys.stderr
import notify
print(json.dumps({
    "channels": notify.enabled_channels(),
    "telegram": notify.telegram_enabled(),
    "email": notify.email_enabled(),
}), file=real)
`;

const TEST = `
import json, sys
sys.path.insert(0, '.')
real = sys.stdout
sys.stdout = sys.stderr
import notify
channels = notify.enabled_channels()
if not channels:
    out = {"ok": False, "results": [],
           "error": "No channels configured — add TELEGRAM_BOT_TOKEN and "
                    "TELEGRAM_CHAT_ID to .env, then restart the dev server."}
else:
    results = notify.send(
        "ReelInfoga test",
        "If you can read this, notifications are working.",
    )
    out = {
        "ok": any(r.ok and r.channel != "console" for r in results),
        "results": [{"channel": r.channel, "ok": r.ok, "detail": r.detail}
                    for r in results],
    }
print(json.dumps(out), file=real)
`;
