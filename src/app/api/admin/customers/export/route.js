import { ilike, or, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { requireAdminApi } from '@/lib/auth';
import { csvResponse, handler } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  await requireAdminApi('customers.export');
  const q = new URL(req.url).searchParams.get('q');
  const db = await getDb();
  const rows = await db.select({ c: s.customers, orders: sql`(select count(*) from orders o where o.customer_id = "customers"."id")::int`, spent: sql`(select coalesce(sum(o.total),0) from orders o where o.customer_id = "customers"."id" and o.status not in ('cancelled','refunded'))::bigint`.mapWith(Number) })
    .from(s.customers).where(q ? or(ilike(s.customers.name, `%${q}%`), ilike(s.customers.email, `%${q}%`), ilike(s.customers.phone, `%${q}%`)) : undefined);
  const out = [['Name', 'Phone', 'Email', 'Region', 'City', 'Address', 'Orders', 'Total spent (EGP)', 'Customer since']];
  for (const { c, orders, spent } of rows) out.push([c.name, c.phone, c.email, c.region, c.city, c.address, orders, (spent / 100).toFixed(2), new Date(c.createdAt).toISOString().slice(0, 10)]);
  return csvResponse(`customers-${new Date().toISOString().slice(0, 10)}.csv`, out);
});
