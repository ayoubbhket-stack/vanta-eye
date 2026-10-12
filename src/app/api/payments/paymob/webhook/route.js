import { eq } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { changePaymentStatus } from '@/lib/orders';
import { verifyPaymobHmac } from '@/lib/payments/paymob';

export const dynamic = 'force-dynamic';

// Paymob "transaction processed" callback. An order is only marked paid when the
// HMAC signature verifies and Paymob reports success for the full amount.
export async function POST(req) {
  const hmac = new URL(req.url).searchParams.get('hmac');
  const body = await req.json().catch(() => null);
  const obj = body?.obj;
  if (!obj || !verifyPaymobHmac(obj, hmac)) return new Response('invalid signature', { status: 401 });
  const ref = obj.order?.merchant_order_id || obj.special_reference || obj.order?.special_reference;
  const db = await getDb();
  const [order] = ref ? await db.select().from(s.orders).where(eq(s.orders.number, String(ref).split('-').slice(0, 2).join('-'))) : [];
  if (!order) return new Response('order not found', { status: 404 });
  const success = obj.success === true && obj.pending === false && Number(obj.amount_cents) === order.total;
  const status = obj.is_refunded ? 'refunded' : success ? 'paid' : obj.pending ? 'pending' : 'failed';
  await changePaymentStatus(order.id, status, { provider: 'paymob', reference: `Paymob transaction ${obj.id}`, raw: { id: obj.id, success: obj.success, pending: obj.pending, amount_cents: obj.amount_cents, is_refunded: obj.is_refunded } });
  return new Response('ok');
}
