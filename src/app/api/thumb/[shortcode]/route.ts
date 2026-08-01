import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

const DOWNLOADS = path.join(process.cwd(), 'downloads');

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * Serve a reel's thumbnail out of downloads/.
 *
 * Needed because downloads/ sits outside public/ — it is regenerable working
 * data, gitignored, and pruned after every extraction, so it does not belong in
 * the static asset tree. This route is the one thing that survives the purge.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shortcode: string }> },
) {
  const { shortcode } = await params;

  // Shortcodes are alphanumeric-ish; anything else is a traversal attempt.
  if (!/^[\w-]+$/.test(shortcode)) {
    return new Response('Not found', { status: 404 });
  }

  const dir = path.join(DOWNLOADS, shortcode);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const image = files
    .filter((f) => MIME[path.extname(f).toLowerCase()])
    .sort()[0];
  if (!image) return new Response('Not found', { status: 404 });

  try {
    const buf = await readFile(path.join(dir, image));
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': MIME[path.extname(image).toLowerCase()],
        // Thumbnails never change for a given reel.
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
