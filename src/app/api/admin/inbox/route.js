import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { requireAdminApi } from '@/lib/auth';
import { handler, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

const b = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('review'), id: z.number().int(), action: z.enum(['approved', 'rejected', 'pending', 'delete']) }),
  z.object({ kind: z.literal('message'), id: z.number().int(), action: z.enum(['read', 'unread', 'delete']) }),
  z.object({ kind: z.literal('subscriber'), id: z.number().int(), action: z.literal('delete') }),
]);

export const POST = handler(async (req) => {
  const me = await requireAdminApi('inbox.read');
  const x = b.parse(await req.json());
  const db = await getDb();
  if (x.kind === 'review') {
    await requireAdminApi('content.write'); // moderation affects what the store shows
    if (x.action === 'delete') await db.delete(s.reviews).where(eq(s.reviews.id, x.id));
    else await db.update(s.reviews).set({ status: x.action }).where(eq(s.reviews.id, x.id));
  } else if (x.kind === 'message') {
    if (x.action === 'delete') await db.delete(s.contactMessages).where(eq(s.contactMessages.id, x.id));
    else await db.update(s.contactMessages).set({ read: x.action === 'read' }).where(eq(s.contactMessages.id, x.id));
  } else {
    await requireAdminApi('customers.read');
    await db.delete(s.subscribers).where(eq(s.subscribers.id, x.id));
  }
  return ok({ ok: true, by: me.id });
});
