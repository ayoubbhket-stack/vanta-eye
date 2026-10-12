import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';

export const dynamic = 'force-dynamic';

// Serves stored images and 3D models. Media ids are random UUIDs and content
// never changes for an id (replacements get a new id), so it can be cached forever.
export async function GET(req, { params }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response('Not found', { status: 404 });
  const db = await getDb();
  const [m] = await db.select().from(schema.media).where(eq(schema.media.id, params.id));
  if (!m) return new Response('Not found', { status: 404 });
  const etag = `"${m.id}"`;
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304 });
  return new Response(Buffer.from(m.data), {
    headers: {
      'content-type': m.mime, 'content-length': String(m.size), etag,
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      ...(m.mime.startsWith('image/svg') ? { 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" } : {}),
    },
  });
}
