import { desc, sql, eq } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { requireAdminPage } from '@/lib/auth';
import DiscountManager from '@/components/admin/DiscountManager';

export const metadata = { title: 'Discounts' };

export default async function Discounts() {
  await requireAdminPage('discounts.write');
  const db = await getDb();
  const [rows, cats, cols] = await Promise.all([
    db.select({ d: s.discounts, revenue: sql`coalesce((select sum(o.total) from orders o where o.discount_id = "discounts"."id" and o.status not in ('cancelled','refunded')),0)::bigint`.mapWith(Number), given: sql`coalesce((select sum(r.amount) from discount_redemptions r join orders o on o.id = r.order_id where r.discount_id = "discounts"."id" and o.status not in ('cancelled','refunded')),0)::bigint`.mapWith(Number) }).from(s.discounts).orderBy(desc(s.discounts.createdAt)),
    db.select({ id: s.categories.id, name: s.categories.name }).from(s.categories),
    db.select({ id: s.collections.id, name: s.collections.name }).from(s.collections),
  ]);
  const toJson = ({ d, revenue, given }) => ({ ...d, startsAt: d.startsAt?.toISOString() || null, endsAt: d.endsAt?.toISOString() || null, createdAt: d.createdAt.toISOString(), revenue, given });
  return <DiscountManager discounts={rows.map(toJson)} categories={cats} collections={cols} />;
}
