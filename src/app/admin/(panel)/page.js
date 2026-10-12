import Link from 'next/link';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { requireAdminPage, can } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { getSetting } from '@/lib/settings';
import { dailySeries, inventorySnapshot, parseRange, summary, topProducts } from '@/lib/reports';
import RangePicker from '@/components/admin/RangePicker';
import { BarList, Pill, SalesChart } from '@/components/admin/server-ui';

export const metadata = { title: 'Dashboard' };
const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default async function Dashboard({ searchParams }) {
  const me = await requireAdminPage('dashboard');
  const r = parseRange(searchParams);
  const store = await getSetting('store');
  const db = await getDb();
  const [sum, series, top, inv, recent, [{ products, published }]] = await Promise.all([
    summary(r), dailySeries(r), topProducts(r, 6), inventorySnapshot(store.lowStockThreshold),
    db.select().from(s.orders).orderBy(desc(s.orders.createdAt)).limit(8),
    db.select({ products: sql`count(*)::int`, published: sql`count(*) filter (where ${s.products.status}='published')::int` }).from(s.products).where(sql`${s.products.status} <> 'archived'`),
  ]);
  const cur = store.currency;
  const m = (v) => formatMoney(v, cur);
  const showMoney = can(me, 'reports.read');
  return (
    <>
      {searchParams.denied && <div className="notice bad">Your role does not have access to that page.</div>}
      <div className="adm-head">
        <div><h1>Dashboard</h1><p className="sub">{r.from} → {r.to} · all figures from recorded orders</p></div>
        <RangePicker preset={r.preset} from={r.from} to={r.to} />
      </div>

      <div className="kpis">
        {showMoney && <div className="kpi accent"><span className="k">Revenue</span><span className="v">{m(sum.revenue)}</span><span className="d">Excludes cancelled &amp; refunded</span></div>}
        {showMoney && <div className="kpi"><span className="k">Collected</span><span className="v">{m(sum.collected)}</span><span className="d">Payment recorded as paid</span></div>}
        {showMoney && <div className="kpi"><span className="k">Gross profit (est.)</span><span className="v">{sum.costCoverage ? m(sum.grossProfit) : '—'}</span><span className="d">{sum.costCoverage ? `Items minus cost & discounts · ${Math.round(sum.costCoverage * 100)}% of sales have a cost price` : 'Add cost prices to products to see profit'}</span></div>}
        <Link href="/admin/orders" className="kpi"><span className="k">Total orders</span><span className="v num">{sum.totalOrders}</span><span className="d">{sum.units} units sold</span></Link>
        {showMoney && <div className="kpi"><span className="k">Avg. order value</span><span className="v">{m(sum.aov)}</span><span className="d">Valid orders only</span></div>}
        {showMoney && <div className="kpi"><span className="k">Refunded / cancelled</span><span className="v" style={{ fontSize: '1.1rem' }}>{m(sum.refunded)} / {m(sum.cancelled)}</span><span className="d">Not counted in revenue</span></div>}
      </div>

      <div className="status-strip" aria-label="Orders by status">
        {STATUSES.map((st) => <Link key={st} href={`/admin/orders?status=${st}`}><span className="label">{st}</span><b className="num">{sum.statuses[st] || 0}</b></Link>)}
      </div>

      <div className="grid-2">
        <section className="panel"><div className="ph"><h2>Sales</h2><span className="label">Daily · Cairo time</span></div><div className="pb"><SalesChart data={series} currency={cur} /></div></section>
        <section className="panel"><div className="ph"><h2>Best sellers</h2><Link className="link label" href="/admin/reports">Reports →</Link></div><div className="pb">
          <BarList items={top.map((t) => ({ label: t.name, value: t.units, extra: showMoney ? m(t.revenue) : null, href: t.productId ? `/admin/products/${t.productId}` : null }))} format={(v) => `${v} units`} />
        </div></section>
      </div>

      <div className="kpis">
        <Link href="/admin/products" className="kpi"><span className="k">Products</span><span className="v num">{products}</span><span className="d">{published} published</span></Link>
        <Link href="/admin/inventory?filter=low" className={`kpi${inv.low.length ? ' warn' : ''}`}><span className="k">Low stock variants</span><span className="v num">{inv.low.length}</span><span className="d">At or below {store.lowStockThreshold} units</span></Link>
        <Link href="/admin/inventory?filter=out" className={`kpi${inv.out.length ? ' bad' : ''}`}><span className="k">Out of stock</span><span className="v num">{inv.out.length}</span><span className="d">Active variants with 0 units</span></Link>
        <Link href="/admin/inventory" className="kpi"><span className="k">Units in stock</span><span className="v num">{inv.units}</span><span className="d">{showMoney ? `Retail value ${m(inv.retailValue)}` : 'Across all variants'}</span></Link>
      </div>

      <section className="panel">
        <div className="ph"><h2>Recent orders</h2><Link className="link label" href="/admin/orders">All orders →</Link></div>
        <div className="pb flush tbl-wrap">
          {recent.length ? (
            <table className="tbl">
              <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Payment</th><th className="r">Total</th></tr></thead>
              <tbody>{recent.map((o) => (
                <tr key={o.id}>
                  <td><Link className="rowlink mono" href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
                  <td>{o.name}<div className="muted" style={{ fontSize: '.8rem' }}>{o.city}, {o.region}</div></td>
                  <td className="mono muted">{new Date(o.createdAt).toLocaleString('en-GB', { timeZone: 'Africa/Cairo', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td><Pill s={o.status} /></td>
                  <td><Pill s={o.paymentStatus} /> <span className="muted" style={{ fontSize: '.78rem' }}>{o.paymentMethod === 'cod' ? 'COD' : 'Online'}</span></td>
                  <td className="r mono">{m(o.total)}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <div className="empty-adm"><strong>No orders yet</strong><span>Orders placed on the storefront appear here instantly.</span></div>}
        </div>
      </section>
    </>
  );
}
