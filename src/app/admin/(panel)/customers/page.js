import Link from 'next/link';
import { asc, desc, ilike, or, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { can, requireAdminPage } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { Pager, SortTh, qs } from '@/components/admin/server-ui';

export const metadata = { title: 'Customers' };

export default async function Customers({ searchParams: p }) {
  const me = await requireAdminPage('customers.read');
  const db = await getDb();
  const where = p.q ? or(ilike(s.customers.name, `%${p.q}%`), ilike(s.customers.email, `%${p.q}%`), ilike(s.customers.phone, `%${p.q.replace(/\D/g, '') || p.q}%`)) : undefined;
  const orders = sql`(select count(*) from orders o where o.customer_id = "customers"."id")::int`;
  const spent = sql`(select coalesce(sum(o.total),0) from orders o where o.customer_id = "customers"."id" and o.status not in ('cancelled','refunded'))::bigint`;
  const last = sql`(select max(o.created_at) from orders o where o.customer_id = "customers"."id")`;
  const col = { name: s.customers.name, orders, spent, last }[p.sort] || last;
  const per = 25; const page = Math.max(1, Number(p.page) || 1);
  const [rows, [{ n }]] = await Promise.all([
    db.select({ c: s.customers, orders, spent: spent.mapWith(Number), last }).from(s.customers).where(where).orderBy(p.dir === 'asc' ? asc(col) : desc(col)).limit(per).offset((page - 1) * per),
    db.select({ n: sql`count(*)::int` }).from(s.customers).where(where),
  ]);
  const base = '/admin/customers';
  return (
    <>
      <div className="adm-head"><div><h1>Customers</h1><p className="sub">Created automatically from checkout, matched by phone number. Personal data — handle with care.</p></div>
        {can(me, 'customers.export') && <a className="btn ghost small" href={`/api/admin/customers/export${qs(p, { page: '' })}`}>Export CSV</a>}</div>
      <form className="panel" method="get" action={base}><div className="pb filters-row">
        <div className="field" style={{ flex: '1 1 260px' }}><label htmlFor="q">Search</label><input id="q" name="q" className="input" defaultValue={p.q} placeholder="Name, email or phone" /></div>
        <div className="row" style={{ gap: 8 }}><button className="btn small">Search</button><Link className="btn small ghost" href={base}>Reset</Link></div>
      </div></form>
      <section className="panel">
        <div className="pb flush tbl-wrap">
          {rows.length ? (
            <table className="tbl">
              <thead><tr><SortTh label="Customer" k="name" params={p} base={base} /><th>Contact</th><th>Location</th><SortTh label="Orders" k="orders" params={p} base={base} className="r" /><SortTh label="Total spent" k="spent" params={p} base={base} className="r" /><SortTh label="Last order" k="last" params={p} base={base} /></tr></thead>
              <tbody>{rows.map(({ c, orders: o, spent: sp, last: l }) => (
                <tr key={c.id}>
                  <td><Link className="rowlink" href={`/admin/customers/${c.id}`}>{c.name}</Link></td>
                  <td><span className="mono">{c.phone}</span><div className="muted" style={{ fontSize: '.8rem' }}>{c.email || '—'}</div></td>
                  <td className="muted">{c.city}, {c.region}</td>
                  <td className="r mono">{o}</td><td className="r mono">{formatMoney(sp)}</td>
                  <td className="mono muted">{l ? new Date(l).toLocaleDateString('en-GB') : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <div className="empty-adm"><strong>No customers yet</strong><span>Customers appear after their first order.</span></div>}
        </div>
        <Pager page={page} pages={Math.ceil(n / per)} total={n} params={p} base={base} per={per} />
      </section>
    </>
  );
}
