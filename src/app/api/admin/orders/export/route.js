import { inArray } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { requireAdminApi } from '@/lib/auth';
import { listOrders } from '@/lib/admin-queries';
import { csvResponse, handler } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  await requireAdminApi('orders.export');
  const p = Object.fromEntries(new URL(req.url).searchParams);
  const { rows } = await listOrders(p, { all: true });
  const db = await getDb();
  const items = rows.length ? await db.select().from(s.orderItems).where(inArray(s.orderItems.orderId, rows.map((r) => r.id))) : [];
  const e = (v) => (v / 100).toFixed(2);
  const out = [['Order', 'Date', 'Status', 'Payment method', 'Payment status', 'Customer', 'Phone', 'Email', 'Region', 'City', 'Address', 'Items', 'Subtotal', 'Discount', 'Discount code', 'Shipping', 'COD fee', 'Tax', 'Total']];
  for (const o of rows) {
    const its = items.filter((i) => i.orderId === o.id).map((i) => `${i.qty}x ${i.name} (${i.variantLabel})`).join('; ');
    out.push([o.number, new Date(o.createdAt).toISOString(), o.status, o.paymentMethod, o.paymentStatus, o.name, o.phone, o.email, o.region, o.city, o.address, its, e(o.subtotal), e(o.discountTotal), o.discountCode || '', e(o.shippingFee), e(o.codFee), e(o.taxTotal), e(o.total)]);
  }
  return csvResponse(`orders-${new Date().toISOString().slice(0, 10)}.csv`, out);
});
