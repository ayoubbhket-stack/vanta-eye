import { and, eq } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { HttpError } from '@/lib/auth';
import { assertSameOrigin, clientIp, handler, ok, rateLimit } from '@/lib/http';
import { reviewSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// Reviews are stored as pending and only shown after approval in the admin.
export const POST = handler(async (req) => {
  assertSameOrigin(req);
  rateLimit(`review:${clientIp(req)}`, 3);
  const data = reviewSchema.parse(await req.json());
  const db = await getDb();
  const [p] = await db.select({ id: s.products.id }).from(s.products).where(and(eq(s.products.id, data.productId), eq(s.products.status, 'published')));
  if (!p) throw new HttpError(404, 'Product not found.');
  await db.insert(s.reviews).values({ ...data, status: 'pending' });
  return ok({ ok: true }, { status: 201 });
});
