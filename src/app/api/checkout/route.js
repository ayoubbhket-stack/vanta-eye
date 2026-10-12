import { eq } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { HttpError } from '@/lib/auth';
import { assertSameOrigin, clientIp, fail, handler, ok, rateLimit } from '@/lib/http';
import { paymobConfigured, placeOrder, changePaymentStatus } from '@/lib/orders';
import { checkoutSchema } from '@/lib/validation';
import { createPaymobCheckout } from '@/lib/payments/paymob';
import { sendEmail } from '@/lib/notify';
import { getSetting } from '@/lib/settings';
import { siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req) => {
  assertSameOrigin(req);
  rateLimit(`checkout:${clientIp(req)}`, 8, 60000);
  const input = checkoutSchema.parse(await req.json());
  let result;
  try {
    result = await placeOrder(input);
  } catch (e) {
    if (e instanceof HttpError && (e.problems || e.total != null)) return fail(e.status, e.message, { problems: e.problems, total: e.total });
    throw e;
  }
  const { order, duplicate } = result;
  const db = await getDb();
  const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id));
  const response = { number: order.number, token: order.accessToken, total: order.total, paymentMethod: order.paymentMethod };

  if (!duplicate) {
    const store = await getSetting('store');
    const lines = items.map((i) => `${i.qty} × ${i.name} (${i.variantLabel})`).join('\n');
    const site = siteUrl();
    if (store.notifyOnNewOrder && store.notifyEmail) await sendEmail({ to: store.notifyEmail, subject: `New order ${order.number}`, text: `${order.name} · ${order.phone}\n${order.region}, ${order.city}\n\n${lines}\n\nTotal: EGP ${(order.total / 100).toFixed(2)}\n${site}/admin/orders/${order.id}` });
    if (order.email) await sendEmail({ to: order.email, subject: `${store.name}: order ${order.number} received`, text: `Thank you, ${order.name}.\n\nWe received your order ${order.number}.\n\n${lines}\n\nTotal: EGP ${(order.total / 100).toFixed(2)}\nTrack it here: ${site}/order/${order.number}?t=${order.accessToken}` });
  }

  if (order.paymentMethod === 'online' && order.paymentStatus === 'pending' && paymobConfigured()) {
    try {
      const pay = await createPaymobCheckout(order, items, siteUrl());
      response.redirectUrl = pay.url;
    } catch (e) {
      console.error(e);
      await changePaymentStatus(order.id, 'failed', { reference: 'Could not start online payment', provider: 'paymob' });
      response.paymentError = 'Online payment could not be started. Your order is saved; we will contact you to arrange payment, or you can contact us to switch to cash on delivery.';
    }
  }
  return ok(response, { status: duplicate ? 200 : 201 });
});
