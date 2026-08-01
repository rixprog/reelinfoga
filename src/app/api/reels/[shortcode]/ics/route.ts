import { readIcs } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  // Next 16: params is a Promise.
  { params }: { params: Promise<{ shortcode: string }> },
) {
  const { shortcode } = await params;
  const ics = await readIcs(shortcode);

  if (!ics) {
    return Response.json(
      { error: 'No calendar entry for this reel (it may have no deadline).' },
      { status: 404 },
    );
  }

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${shortcode}.ics"`,
    },
  });
}
