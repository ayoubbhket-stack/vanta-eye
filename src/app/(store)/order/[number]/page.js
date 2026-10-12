import Link from 'next/link';
import crypto from 'node:crypto';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { formatMoney } from '@/lib/money';
import { getSetting } from '@/lib/settings';

export const metadata = { title: 'Order confirmation', robots: { index: false } };

const STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const PAY = { unpaid: 'To be paid on delivery', pending: 'Waiting for payment confirmation', paid: 'Paid', failed: 'Payment failed — we will contact you', refunded: 'Refunded' };

export default async function OrderPage({ params, searchParams }) {
  const db = await getDb();
  const [o] = await db.select().from(s.orders).where(eq(s.orders.number, params.number));
  // the access token in the link protects customer details
  const t = String(searchParams.t || '');
  if (!o || t.length !== o.accessToken.length || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(o.accessToken))) notFound();
  const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, o.id));
  const store = await getSetting('store');
  const cur = store.currency;
  const stepIdx = STEPS.indexOf(o.status);
  return (
    <div className="wrap">
      <section className="confirm-hero">
        <nav className="steps"><span>01 Cart</span><span>—</span><span>02 Checkout</span><span>—</span><span className="on">03 Confirmation</span></nav>
        <p className="label accent">{o.status === 'cancelled' ? 'Order cancelled' : 'Thank you, order received'}</p>
        <h1 className="display-l">{o.name.split(' ')[0]}, your frames are on the way to being packed.</h1>
        <div className="num-big">{o.number}</div>
        <p className="lede">Keep this order number. {o.paymentMethod === 'cod' ? `Pay ${formatMoney(o.total, cur)} in cash when the courier arrives. ` : ''}We will call {o.phone} to confirm delivery.</p>
      </section>
      {stepIdx > -1 && (
        <ol className="row" style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', gap: 0 }} aria-label="Order progress">
          {STEPS.map((st, i) => <li key={st} className="label" style={{ flex: 1, minWidth: 90, paddingTop: 10, borderTop: `2px solid ${i <= stepIdx ? 'var(--accent)' : 'var(--line)'}`, color: i <= stepIdx ? 'var(--fg)' : undefined }}>{st}</li>)}
        </ol>
      )}
      <div className="cart-layout" style={{ paddingTop: 0 }}>
        <div className="cart-lines">
          {items.map((i) => (
            <div className="cart-line" key={i.id} style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
              <div><span className="t">{i.name}</span> <span className="mono muted">× {i.qty}</span><div className="v">{i.variantLabel} · {i.sku}</div></div>
              <span className="price num">{formatMoney(i.lineTotal, cur)}</span>
            </div>
          ))}
          <div className="stack" style={{ paddingBlock: 24, gap: 6 }}>
            <span className="label">Deliver to</span>
            <p style={{ margin: 0 }}>{o.name} · {o.phone}<br />{o.address}<br />{o.city}, {o.region}</p>
          </div>
        </div>
        <aside className="summary">
          <div className="line"><span>Subtotal</span><b>{formatMoney(o.subtotal, cur)}</b></div>
          {o.discountTotal > 0 && <div className="line"><span>Discount {o.discountCode}</span><b>− {formatMoney(o.discountTotal, cur)}</b></div>}
          <div className="line"><span>Shipping</span><b>{o.shippingFee ? formatMoney(o.shippingFee, cur) : 'Free'}</b></div>
          {o.codFee > 0 && <div className="line"><span>Cash on delivery fee</span><b>{formatMoney(o.codFee, cur)}</b></div>}
          {o.taxTotal > 0 && <div className="line"><span>Tax</span><b>{formatMoney(o.taxTotal, cur)}</b></div>}
          <div className="line total"><span>Total</span><b>{formatMoney(o.total, cur)}</b></div>
          <div className="line"><span>Payment</span><b style={{ fontFamily: 'var(--font-body)' }}>{o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Online'} · {PAY[o.paymentStatus]}</b></div>
          <Link className="btn block" href="/shop">Continue shopping</Link>
          <Link className="link label" href="/contact">Questions about this order? Contact us</Link>
        </aside>
      </div>
    </div>
  );
}
