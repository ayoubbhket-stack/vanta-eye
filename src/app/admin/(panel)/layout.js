import { and, eq, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { can, requireAdminPage } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { AdminProvider } from '@/components/admin/ui';
import Shell from '@/components/admin/Shell';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }) {
  const me = await requireAdminPage('dashboard');
  const db = await getDb();
  const store = await getSetting('store');
  const n = async (q) => (await q)[0]?.n ?? 0;
  const [pending, unread, reviews, low] = await Promise.all([
    n(db.select({ n: sql`count(*)::int` }).from(s.orders).where(eq(s.orders.status, 'pending'))),
    n(db.select({ n: sql`count(*)::int` }).from(s.contactMessages).where(eq(s.contactMessages.read, false))),
    n(db.select({ n: sql`count(*)::int` }).from(s.reviews).where(eq(s.reviews.status, 'pending'))),
    n(db.select({ n: sql`count(*)::int` }).from(s.productVariants).where(and(eq(s.productVariants.active, true), sql`${s.productVariants.stock} <= ${store.lowStockThreshold}`))),
  ]);
  const perms = Object.fromEntries(['orders.read', 'products.read', 'products.write', 'inventory.read', 'customers.read', 'content.write', 'discounts.write', 'reports.read', 'inbox.read', 'settings.write', 'staff.manage'].map((p) => [p, can(me, p)]));
  return (
    <AdminProvider>
      <Shell me={me} perms={perms} storeName={store.name} badges={{ pending, inbox: unread + reviews, low }}>{children}</Shell>
    </AdminProvider>
  );
}
