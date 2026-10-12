import { getDb, schema as s } from '@/db';
import { requireAdminApi } from '@/lib/auth';
import { csvResponse, handler } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireAdminApi('customers.export');
  const db = await getDb();
  const rows = await db.select().from(s.subscribers).orderBy(s.subscribers.createdAt);
  return csvResponse('newsletter-subscribers.csv', [['Email', 'Subscribed'], ...rows.map((r) => [r.email, r.createdAt.toISOString()])]);
});
