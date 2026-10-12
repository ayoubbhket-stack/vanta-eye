import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { requireAdminApi } from '@/lib/auth';
import { handler, ok } from '@/lib/http';
import { ORDER_STATUSES, PAYMENT_STATUSES, changeOrderStatus, changePaymentStatus } from '@/lib/orders';
import { getSetting } from '@/lib/settings';
import { sendEmail } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status'), status: z.enum(ORDER_STATUSES), restock: z.boolean().optional().default(true), note: z.string().max(500).optional().default('') }),
  z.object({ action: z.literal('payment'), paymentStatus: z.enum(PAYMENT_STATUSES), reference: z.string().max(200).optional().default('') }),
  z.object({ action: z.literal('note'), body: z.string().trim().min(1, 'Write a note.').max(2000) }),
]);

export const PATCH = handler(async (req, { params }) => {
  const me = await requireAdminApi('orders.write');
  const id = Number(params.id);
  const b = schema.parse(await req.json());
  if (b.action === 'status') {
    const o = await changeOrderStatus(id, b.status, { adminUserId: me.id, restock: b.restock, note: b.note });
    const store = await getSetting('store');
    let notified = null;
    if (store.notifyCustomerOnStatus && o.email && ['confirmed', 'shipped', 'delivered', 'cancelled'].includes(b.status)) {
      notified = await sendEmail({ to: o.email, subject: `${store.name}: order ${o.number} is ${b.status}`, text: `Hello ${o.name},\n\nYour order ${o.number} is now ${b.status}.\n\n${store.name}` });
    }
    return ok({ ok: true, status: o.status, paymentStatus: o.paymentStatus, notified });
  }
  if (b.action === 'payment') {
    const o = await changePaymentStatus(id, b.paymentStatus, { adminUserId: me.id, reference: b.reference || `Updated by ${me.name}` });
    return ok({ ok: true, paymentStatus: o.paymentStatus });
  }
  const db = await getDb();
  const [o] = await db.select({ id: s.orders.id }).from(s.orders).where(eq(s.orders.id, id));
  if (!o) return ok({ error: 'Order not found.' }, { status: 404 });
  await db.insert(s.orderEvents).values({ orderId: id, kind: 'note', body: b.body, adminUserId: me.id });
  return ok({ ok: true });
});
