import Link from 'next/link';
import { requireAdminPage, can } from '@/lib/auth';
import { listOrders } from '@/lib/admin-queries';
import { formatMoney } from '@/lib/money';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/orders';
import { Pager, Pill, SortTh, qs } from '@/components/admin/server-ui';

export const metadata = { title: 'Orders' };

export default async function Orders({ searchParams: p }) {
  const me = await requireAdminPage('orders.read');
  const { rows, total, page, pages, per } = await listOrders(p);
  const base = '/admin/orders';
  return (
    <>
      <div className="adm-head">
        <div><h1>Orders</h1><p className="sub">{total} order{total === 1 ? '' : 's'} match{total === 1 ? 'es' : ''} these filters</p></div>
        {can(me, 'orders.export') && <a className="btn ghost small" href={`/api/admin/orders/export${qs(p, { page: '' })}`}>Export CSV</a>}
      </div>
      <form className="panel" method="get" action={base}>
        <div className="pb filters-row">
          <div className="field" style={{ flex: '2 1 220px' }}><label htmlFor="q">Search</label><input id="q" name="q" className="input" defaultValue={p.q} placeholder="Order number, name, phone, email" /></div>
          <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" className="select" defaultValue={p.status || ''}><option value="">All</option>{ORDER_STATUSES.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label htmlFor="method">Payment method</label><select id="method" name="method" className="select" defaultValue={p.method || ''}><option value="">All</option><option value="cod">Cash on delivery</option><option value="online">Online</option></select></div>
          <div className="field"><label htmlFor="pay">Payment status</label><select id="pay" name="pay" className="select" defaultValue={p.pay || ''}><option value="">All</option>{PAYMENT_STATUSES.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label htmlFor="from">From</label><input id="from" name="from" type="date" className="input" defaultValue={p.from} /></div>
          <div className="field"><label htmlFor="to">To</label><input id="to" name="to" type="date" className="input" defaultValue={p.to} /></div>
          <div className="row" style={{ gap: 8 }}><button className="btn small">Filter</button><Link className="btn small ghost" href={base}>Reset</Link></div>
        </div>
      </form>
      <section className="panel">
        <div className="pb flush tbl-wrap">
          {rows.length ? (
            <table className="tbl">
              <thead><tr>
                <SortTh label="Order" k="number" params={p} base={base} />
                <SortTh label="Customer" k="name" params={p} base={base} />
                <SortTh label="Date" k="created" params={p} base={base} />
                <SortTh label="Status" k="status" params={p} base={base} />
                <th>Payment</th>
                <SortTh label="Total" k="total" params={p} base={base} className="r" />
              </tr></thead>
              <tbody>{rows.map((o) => (
                <tr key={o.id}>
                  <td><Link className="rowlink mono" href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
                  <td>{o.name}<div className="muted mono" style={{ fontSize: '.78rem' }}>{o.phone}</div></td>
                  <td className="mono muted">{new Date(o.createdAt).toLocaleString('en-GB', { timeZone: 'Africa/Cairo', day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td><Pill s={o.status} /></td>
                  <td><Pill s={o.paymentStatus} /> <span className="muted" style={{ fontSize: '.78rem' }}>{o.paymentMethod === 'cod' ? 'COD' : 'Online'}</span></td>
                  <td className="r mono">{formatMoney(o.total)}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <div className="empty-adm"><strong>No orders found</strong><span>Try clearing the filters.</span></div>}
        </div>
        <Pager page={page} pages={pages} total={total} params={p} base={base} per={per} />
      </section>
    </>
  );
}
