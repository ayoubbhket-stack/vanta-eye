import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { requireAdminPage } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { Pill } from '@/components/admin/server-ui';

export const metadata = { title: 'Customer' };

export default async function Customer({ params }) {
  await requireAdminPage('customers.read');
  const db = await getDb();
  const [c] = await db.select().from(s.customers).where(eq(s.customers.id, Number(params.id)));
  if (!c) notFound();
  const orders = await db.select().from(s.orders).where(eq(s.orders.customerId, c.id)).orderBy(desc(s.orders.createdAt));
  const valid = orders.filter((o) => !['cancelled', 'refunded'].includes(o.status));
  const spent = valid.reduce((n, o) => n + o.total, 0);
  return (
    <>
      <div className="adm-head"><div><Link href="/admin/customers" className="link label">← Customers</Link><h1 style={{ marginTop: 8 }}>{c.name}</h1><p className="sub">Customer since {new Date(c.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</p></div></div>
      <div className="kpis">
        <div className="kpi"><span className="k">Orders</span><span className="v num">{orders.length}</span><span className="d">{orders.length - valid.length} cancelled/refunded</span></div>
        <div className="kpi accent"><span className="k">Total spent</span><span className="v">{formatMoney(spent)}</span><span className="d">Valid orders</span></div>
        <div className="kpi"><span className="k">Average order</span><span className="v">{formatMoney(valid.length ? Math.round(spent / valid.length) : 0)}</span></div>
      </div>
      <div className="grid-2">
        <section className="panel"><div className="ph"><h2>Order history</h2></div><div className="pb flush tbl-wrap">
          <table className="tbl"><thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Payment</th><th className="r">Total</th></tr></thead>
            <tbody>{orders.map((o) => <tr key={o.id}><td><Link className="rowlink mono" href={`/admin/orders/${o.id}`}>{o.number}</Link></td><td className="mono muted">{new Date(o.createdAt).toLocaleDateString('en-GB')}</td><td><Pill s={o.status} /></td><td><Pill s={o.paymentStatus} /></td><td className="r mono">{formatMoney(o.total)}</td></tr>)}</tbody>
          </table>
        </div></section>
        <section className="panel"><div className="ph"><h2>Contact &amp; shipping</h2></div><div className="pb"><dl className="kv">
          <dt>Phone</dt><dd className="mono">{c.phone}</dd><dt>Email</dt><dd>{c.email || '—'}</dd>
          <dt>Region</dt><dd>{c.region}</dd><dt>City</dt><dd>{c.city}</dd><dt>Address</dt><dd>{c.address}</dd>
        </dl><p className="muted" style={{ fontSize: '.8rem', marginTop: 14 }}>Details are updated from the customer’s most recent order.</p></div></section>
      </div>
    </>
  );
}
