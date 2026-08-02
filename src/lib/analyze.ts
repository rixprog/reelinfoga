// ============================================================
// ReelBrain — bridge from the Next UI to the Python pipeline
// ============================================================
//
// `pipeline.py --json` emits one JSON object per line on stdout as it moves
// through its stages. We spawn it, parse those lines, and keep the job in
// memory so the UI can poll for live progress.
//
// Why a job + polling rather than one blocking request: a reel takes 30-90s
// (download, ffmpeg, Whisper, Gemini). A single awaited POST would sit past most
// proxy timeouts and give the user a spinner with nothing to look at. Streaming
// the stages is both more robust and a better demo.

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { resolvePython, explainSpawnError } from './python';
import type { ProcessingStep } from './types';

export interface JobStage {
  id: ProcessingStep | string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  detail?: string;
}

export interface Job {
  id: string;
  url: string;
  status: 'running' | 'done' | 'error';
  stages: JobStage[];
  result?: unknown;
  error?: string;
  log: string[];
  startedAt: number;
  finishedAt?: number;
}

// Next's dev server re-evaluates modules on edit, which would drop an
// in-module Map and orphan running jobs. Parking it on globalThis survives that.
const store: Map<string, Job> =
  (globalThis as { __reelJobs?: Map<string, Job> }).__reelJobs ??
  ((globalThis as { __reelJobs?: Map<string, Job> }).__reelJobs = new Map());

const PROJECT_ROOT = process.cwd();

export function getJob(id: string): Job | undefined {
  return store.get(id);
}

export function listJobs(): Job[] {
  return [...store.values()].sort((a, b) => b.startedAt - a.startedAt);
}

const INSTAGRAM_URL = /^https?:\/\/(www\.)?instagram\.com\/(reel|reels|p|tv)\/[\w-]+/i;
const SHORTS_OR_TIKTOK = /^https?:\/\/(www\.)?(youtube\.com\/shorts\/|tiktok\.com\/)/i;

export function isSupportedUrl(url: string): boolean {
  return INSTAGRAM_URL.test(url) || SHORTS_OR_TIKTOK.test(url);
}

export function startJob(url: string): Job {
  const job: Job = {
    id: randomUUID(),
    url,
    status: 'running',
    stages: [],
    log: [],
    startedAt: Date.now(),
  };
  store.set(job.id, job);

  const child = spawn(resolvePython(), ['pipeline.py', url, '--json'], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  });

  let buffer = '';

  child.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    // Keep the trailing partial line in the buffer — stdout chunks split mid-line.
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) handleEvent(job, line);
    }
  });

  // The pipeline writes human-readable chatter to stderr in --json mode, so this
  // is progress information, not necessarily failure.
  child.stderr.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    job.log.push(...text.split('\n').filter(Boolean));
    if (job.log.length > 400) job.log.splice(0, job.log.length - 400);
  });

  child.on('error', (err) => {
    job.status = 'error';
    job.error = `Could not start the pipeline. ${explainSpawnError(err)}`;
    job.finishedAt = Date.now();
  });

  child.on('close', (code) => {
    if (job.status === 'running') {
      if (code === 0 && job.result) {
        job.status = 'done';
      } else {
        job.status = 'error';
        job.error ??=
          `Pipeline exited with code ${code}. ` +
          (job.log.slice(-3).join(' ') || 'No output.');
      }
      job.finishedAt = Date.now();
    }
  });

  return job;
}

function handleEvent(job: Job, line: string) {
  let evt: Record<string, unknown>;
  try {
    evt = JSON.parse(line);
  } catch {
    // Not an event line — treat as chatter rather than crashing the stream.
    job.log.push(line);
    return;
  }

  switch (evt.event) {
    case 'start': {
      const stages = (evt.stages ?? []) as { id: string; label: string }[];
      job.stages = stages.map((s) => ({ ...s, status: 'pending' }));
      break;
    }
    case 'stage': {
      const stage = job.stages.find((s) => s.id === evt.stage);
      if (stage) {
        stage.status = evt.status as JobStage['status'];
        if (evt.detail) stage.detail = String(evt.detail);
      }
      break;
    }
    case 'done': {
      job.result = evt.result;
      job.status = 'done';
      job.finishedAt = Date.now();
      break;
    }
    case 'error': {
      job.status = 'error';
      job.error = String(evt.message ?? 'Unknown error');
      const running = job.stages.find((s) => s.status === 'processing');
      if (running) running.status = 'error';
      job.finishedAt = Date.now();
      break;
    }
  }
}
