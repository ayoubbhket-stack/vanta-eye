import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { can, requireAdminPage } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { allowedNext } from '@/lib/orders';
import { Pill } from '@/components/admin/server-ui';
import OrderActions from '@/components/admin/OrderActions';

export const metadata = { title: 'Order' };

export default async function OrderDetail({ params }) {
  const me = await requireAdminPage('orders.read');
  const db = await getDb();
  const [o] = await db.select().from(s.orders).where(eq(s.orders.id, Number(params.id)));
  if (!o) notFound();
  const [items, events, payments, admins] = await Promise.all([
    db.select({ i: s.orderItems, img: s.productImages.mediaId }).from(s.orderItems).leftJoin(s.productImages, eq(s.productImages.productId, s.orderItems.productId)).where(eq(s.orderItems.orderId, o.id)),
    db.select().from(s.orderEvents).where(eq(s.orderEvents.orderId, o.id)).orderBy(desc(s.orderEvents.createdAt), desc(s.orderEvents.id)),
    db.select().from(s.payments).where(eq(s.payments.orderId, o.id)).orderBy(asc(s.payments.createdAt)),
    db.select({ id: s.adminUsers.id, name: s.adminUsers.name }).from(s.adminUsers),
  ]);
  const seen = new Set();
  const lines = items.filter(({ i }) => (seen.has(i.id) ? false : seen.add(i.id)));
  const who = (id) => admins.find((a) => a.id === id)?.name || 'System';
  const m = (v) => formatMoney(v);
  const dt = (d) => new Date(d).toLocaleString('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' });
  const showCustomer = can(me, 'orders.read');
  return (
    <>
      <div className="adm-head">
        <div>
          <Link href="/admin/orders" className="link label">← Orders</Link>
          <h1 className="mono" style={{ marginTop: 8 }}>{o.number}</h1>
          <p className="sub">Placed {dt(o.createdAt)} · <Pill s={o.status} /> <Pill s={o.paymentStatus} /> {o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Online payment'}</p>
        </div>
        <a className="btn ghost small" href={`/order/${o.number}?t=${o.accessToken}`} target="_blank" rel="noreferrer">Customer view ↗</a>
      </div>
      <div className="grid-2">
        <div style={{ display: 'grid', gap: 20 }}>
          <section className="panel">
            <div className="ph"><h2>Items</h2><span className="label">{lines.reduce((n, { i }) => n + i.qty, 0)} units</span></div>
            <div className="pb flush tbl-wrap">
              <table className="tbl">
                <thead><tr><th></th><th>Product</th><th>Variant</th><th className="r">Unit</th><th className="r">Qty</th><th className="r">Total</th></tr></thead>
                <tbody>{lines.map(({ i, img }) => (
                  <tr key={i.id}>
                    <td style={{ width: 56 }}>{img ? <img className="thumb" src={`/api/media/${img}`} alt="" /> : null}</td>
                    <td>{i.productId ? <Link className="rowlink" href={`/admin/products/${i.productId}`}>{i.name}</Link> : i.name}<div className="mono muted" style={{ fontSize: '.76rem' }}>{i.sku}</div></td>
                    <td>{i.variantLabel}</td>
                    <td className="r mono">{m(i.unitPrice)}</td><td className="r mono">{i.qty}</td><td className="r mono">{m(i.lineTotal)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="pb" style={{ borderTop: '1px solid var(--line)' }}>
              <dl className="kv" style={{ justifyContent: 'end', marginInlineStart: 'auto', maxWidth: 360 }}>
                <dt>Subtotal</dt><dd className="mono" style={{ textAlign: 'end' }}>{m(o.subtotal)}</dd>
                {o.discountTotal > 0 && <><dt>Discount ({o.discountCode})</dt><dd className="mono" style={{ textAlign: 'end' }}>− {m(o.discountTotal)}</dd></>}
                <dt>Shipping ({o.region})</dt><dd className="mono" style={{ textAlign: 'end' }}>{m(o.shippingFee)}</dd>
                {o.codFee > 0 && <><dt>COD fee</dt><dd className="mono" style={{ textAlign: 'end' }}>{m(o.codFee)}</dd></>}
                {o.taxTotal > 0 && <><dt>Tax</dt><dd className="mono" style={{ textAlign: 'end' }}>{m(o.taxTotal)}</dd></>}
                <dt><strong>Total</strong></dt><dd className="mono" style={{ textAlign: 'end', color: 'var(--accent)', fontWeight: 600 }}>{m(o.total)}</dd>
              </dl>
            </div>
          </section>
          <section className="panel">
            <div className="ph"><h2>Payments</h2><span className="label">Recorded separately from order status</span></div>
            <div className="pb flush tbl-wrap">
              <table className="tbl"><thead><tr><th>Date</th><th>Provider</th><th>Status</th><th>Reference</th><th className="r">Amount</th></tr></thead>
                <tbody>{payments.map((p) => <tr key={p.id}><td className="mono muted">{dt(p.createdAt)}</td><td>{p.provider}</td><td><Pill s={p.status} /></td><td className="muted">{p.reference || '—'}</td><td className="r mono">{m(p.amount)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <div className="ph"><h2>History &amp; notes</h2></div>
            <div className="pb">
              <div className="timeline-adm">
                {events.map((e) => (
                  <div key={e.id}><span /><div>
                    <strong>{e.kind === 'status' ? `Status: ${e.fromValue} → ${e.toValue}` : e.kind === 'payment' ? `Payment: ${e.fromValue} → ${e.toValue}` : e.kind === 'note' ? 'Internal note' : 'Order created'}</strong>
                    {e.body && <p className="muted" style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap' }}>{e.body}</p>}
                    <span className="label" style={{ textTransform: 'none', letterSpacing: 0 }}>{dt(e.createdAt)} · {e.adminUserId ? who(e.adminUserId) : 'Customer / system'}</span>
                  </div></div>
                ))}
              </div>
            </div>
          </section>
        </div>
        <div style={{ display: 'grid', gap: 20 }}>
          <OrderActions order={{ id: o.id, status: o.status, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, stockRestored: o.stockRestored }} next={allowedNext(o.status)} canWrite={can(me, 'orders.write')} />
          {showCustomer && (
            <section className="panel">
              <div className="ph"><h2>Customer</h2>{o.customerId && can(me, 'customers.read') && <Link className="link label" href={`/admin/customers/${o.customerId}`}>Profile →</Link>}</div>
              <div className="pb"><dl className="kv">
                <dt>Name</dt><dd>{o.name}</dd>
                <dt>Phone</dt><dd className="mono">{o.phone}</dd>
                <dt>Email</dt><dd>{o.email || '—'}</dd>
                <dt>Region</dt><dd>{o.region}</dd>
                <dt>City</dt><dd>{o.city}</dd>
                <dt>Address</dt><dd>{o.address}</dd>
                {o.customerNote && <><dt>Note</dt><dd>{o.customerNote}</dd></>}
              </dl></div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
