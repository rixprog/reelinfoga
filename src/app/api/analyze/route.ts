import { isSupportedUrl, listJobs, startJob } from '@/lib/analyze';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return Response.json({ error: 'Paste a reel URL.' }, { status: 400 });
  }
  if (!isSupportedUrl(url)) {
    return Response.json(
      {
        error:
          'That does not look like a reel URL. Supported: Instagram reels/posts, ' +
          'YouTube Shorts, TikTok.',
      },
      { status: 400 },
    );
  }

  const job = startJob(url);
  return Response.json({ id: job.id, status: job.status }, { status: 202 });
}

export async function GET() {
  return Response.json({
    jobs: listJobs().map((j) => ({
      id: j.id,
      url: j.url,
      status: j.status,
      startedAt: j.startedAt,
    })),
  });
}
