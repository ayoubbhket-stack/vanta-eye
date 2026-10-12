import { getDb, schema as s } from '@/db';
import { HttpError, can, requireAdminApi } from '@/lib/auth';
import { handler, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Detect type from file contents (not the browser-supplied name/type).
function sniff(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (b.toString('ascii', 4, 8) === 'ftyp' && /avif|avis/.test(b.toString('ascii', 8, 12))) return 'image/avif';
  if (b.toString('ascii', 0, 4) === 'glTF') return 'model/gltf-binary';
  return null;
}

export const POST = handler(async (req) => {
  const me = await requireAdminApi();
  if (!can(me, 'content.write') && !can(me, 'products.write') && !can(me, 'settings.write')) throw new HttpError(403, 'Your role cannot upload files.');
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') throw new HttpError(422, 'Choose a file to upload.');
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime) throw new HttpError(415, 'Unsupported file. Upload JPG, PNG, WEBP, AVIF images or a GLB 3D model.');
  const limit = mime === 'model/gltf-binary' ? 20 : 8;
  if (buf.length > limit * 1024 * 1024) throw new HttpError(413, `File is larger than ${limit} MB.`);
  const db = await getDb();
  const name = String(file.name || 'upload').replace(/[^\w.\- ]+/g, '').slice(0, 120) || 'upload';
  const [m] = await db.insert(s.media).values({ filename: name, mime, size: buf.length, data: buf }).returning({ id: s.media.id });
  return ok({ id: m.id, url: `/api/media/${m.id}`, filename: name, mime, size: buf.length }, { status: 201 });
});
