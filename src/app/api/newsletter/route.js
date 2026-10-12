import { z } from 'zod';
import { getDb, schema as s } from '@/db';
import { assertSameOrigin, clientIp, handler, ok, rateLimit } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req) => {
  assertSameOrigin(req);
  rateLimit(`news:${clientIp(req)}`, 5);
  const { email } = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(120) }).parse(await req.json());
  const db = await getDb();
  await db.insert(s.subscribers).values({ email }).onConflictDoNothing();
  return ok({ ok: true });
});
