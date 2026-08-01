import { getJob } from '@/lib/analyze';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  // Next 16: dynamic route params arrive as a Promise and must be awaited.
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = getJob(id);

  if (!job) {
    return Response.json({ error: 'Unknown job.' }, { status: 404 });
  }

  return Response.json({
    id: job.id,
    url: job.url,
    status: job.status,
    stages: job.stages,
    result: job.result ?? null,
    error: job.error ?? null,
    log: job.log.slice(-40),
    elapsedMs: (job.finishedAt ?? Date.now()) - job.startedAt,
  });
}
