// Shared helper for routes that shell out to the Python side.
import { spawn } from 'node:child_process';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();

// Assembled at runtime so Turbopack does not try to trace `.venv/bin/python`
// as a static asset — it is a symlink out of the project and fails the build.
//
// Windows venvs use a different layout (Scripts\python.exe, not bin/python), so
// hardcoding the POSIX path makes every spawn fail there with a bare ENOENT.
const DEFAULT_VENV_PYTHON =
  process.platform === 'win32'
    ? ['.venv', 'Scripts', 'python.exe'].join(path.sep)
    : ['.venv', 'bin', 'python'].join(path.sep);

export function resolvePython(): string {
  const configured = process.env.REELBRAIN_PYTHON || DEFAULT_VENV_PYTHON;
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(PROJECT_ROOT, configured);
}

/**
 * Turn a spawn failure into something a person can act on.
 *
 * `spawn ENOENT` means the interpreter is not at the resolved path, but Node
 * reports it without naming the path it tried — so the reader cannot tell a
 * missing venv from a wrong-platform one. Both are a one-line fix, and neither
 * is guessable from the raw error.
 */
export function explainSpawnError(err: NodeJS.ErrnoException): string {
  if (err.code !== 'ENOENT') return err.message;
  return (
    `No Python interpreter at ${resolvePython()} — ` +
    `run \`python3 -m venv .venv\` then ` +
    `\`.venv/bin/pip install -r requirements.txt\`, ` +
    `or set REELBRAIN_PYTHON to an existing interpreter.`
  );
}

export function runPython(
  args: string[],
): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    const child = spawn(resolvePython(), args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => (out += c.toString()));
    child.stderr.on('data', (c) => (err += c.toString()));
    child.on('error', (e) => resolve({ code: -1, out, err: explainSpawnError(e) }));
    child.on('close', (code) => resolve({ code: code ?? -1, out, err }));
  });
}

/** Parse stdout as JSON, or surface the tail of stderr so failures are diagnosable. */
export function pythonJson(
  result: { code: number; out: string; err: string },
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  try {
    const data = JSON.parse(result.out);
    if (result.code !== 0 || data.error) {
      return { ok: false, error: String(data.error ?? 'Failed.') };
    }
    return { ok: true, data };
  } catch {
    const tail = result.err.trim().split('\n').slice(-3).join(' ');
    return { ok: false, error: tail || 'The backend returned nothing usable.' };
  }
}
