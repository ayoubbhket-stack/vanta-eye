// Paymob (Egypt) online payments via the Intention API + Unified Checkout.
// Only active when all PAYMOB_* environment variables are set. Verify field
// names against your Paymob dashboard/docs before going live.
import 'server-only';
import crypto from 'node:crypto';

const BASE = process.env.PAYMOB_BASE_URL || 'https://accept.paymob.com';

export async function createPaymobCheckout(order, items, siteUrl) {
  const [first, ...rest] = order.name.trim().split(/\s+/);
  const body = {
    amount: order.total, // piasters
    currency: 'EGP',
    payment_methods: [Number(process.env.PAYMOB_INTEGRATION_ID)],
    items: [{ name: `Order ${order.number}`, amount: order.total, description: items.map((i) => `${i.qty}x ${i.name}`).join(', ').slice(0, 250), quantity: 1 }],
    billing_data: {
      first_name: first || 'Customer', last_name: rest.join(' ') || 'NA', phone_number: order.phone,
      email: order.email || 'na@example.com', street: order.address.slice(0, 120), city: order.city, state: order.region, country: 'EG',
      apartment: 'NA', floor: 'NA', building: 'NA', postal_code: 'NA',
    },
    special_reference: order.number,
    notification_url: `${siteUrl}/api/payments/paymob/webhook`,
    redirection_url: `${siteUrl}/order/${order.number}?t=${order.accessToken}`,
  };
  const res = await fetch(`${BASE}/v1/intention/`, {
    method: 'POST',
    headers: { Authorization: `Token ${process.env.PAYMOB_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.client_secret) throw new Error(`Paymob intention failed (${res.status})`);
  return { url: `${BASE}/unifiedcheckout/?publicKey=${encodeURIComponent(process.env.PAYMOB_PUBLIC_KEY)}&clientSecret=${encodeURIComponent(data.client_secret)}`, reference: String(data.id || '') };
}

// HMAC for the "transaction processed" callback: concatenate these fields of
// obj in this exact order and sign with SHA-512 using the HMAC secret.
const HMAC_FIELDS = ['amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending', 'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success'];

export function verifyPaymobHmac(obj, hmac) {
  if (!hmac || !process.env.PAYMOB_HMAC_SECRET) return false;
  const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const str = HMAC_FIELDS.map((f) => { const v = get(f); return v === undefined || v === null ? '' : String(v); }).join('');
  const calc = crypto.createHmac('sha512', process.env.PAYMOB_HMAC_SECRET).update(str).digest('hex');
  const a = Buffer.from(calc); const b = Buffer.from(String(hmac));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
