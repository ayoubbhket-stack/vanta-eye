import { requireAdminPage } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { getSetting } from '@/lib/settings';
import { dailySeries, discountUsage, inventorySnapshot, parseRange, summary, topProducts } from '@/lib/reports';
import RangePicker from '@/components/admin/RangePicker';
import { SalesChart, qs } from '@/components/admin/server-ui';

export const metadata = { title: 'Reports' };

export default async function Reports({ searchParams }) {
  await requireAdminPage('reports.read');
  const r = parseRange(searchParams);
  const store = await getSetting('store');
  const [sum, series, products, discounts, inv] = await Promise.all([summary(r), dailySeries(r), topProducts(r, 50), discountUsage(r), inventorySnapshot(store.lowStockThreshold)]);
  const m = (v) => formatMoney(v, store.currency);
  const exp = (type) => `/api/admin/reports/export${qs({ from: r.from, to: r.to }, { type })}`;
  const Head = ({ title, type, note }) => <div className="ph"><h2>{title}</h2><div className="row" style={{ gap: 10 }}>{note && <span className="label">{note}</span>}{type && <a className="btn small ghost" href={exp(type)}>CSV</a>}</div></div>;
  return (
    <>
      <div className="adm-head"><div><h1>Reports</h1><p className="sub">{r.from} → {r.to} (Cairo time). Cancelled and refunded orders are excluded from sales figures.</p></div><RangePicker preset={r.preset} from={r.from} to={r.to} /></div>
      <div className="kpis">
        <div className="kpi accent"><span className="k">Revenue</span><span className="v">{m(sum.revenue)}</span><span className="d">{sum.orders} valid orders</span></div>
        <div className="kpi"><span className="k">Average order value</span><span className="v">{m(sum.aov)}</span></div>
        <div className="kpi"><span className="k">Units sold</span><span className="v num">{sum.units}</span></div>
        <div className="kpi"><span className="k">Discounts given</span><span className="v">{m(sum.discounts)}</span></div>
        <div className="kpi"><span className="k">Shipping charged</span><span className="v">{m(sum.shipping)}</span></div>
        <div className="kpi"><span className="k">Gross profit (est.)</span><span className="v">{sum.costCoverage ? m(sum.grossProfit) : '—'}</span><span className="d">{Math.round(sum.costCoverage * 100)}% of item sales have a cost price</span></div>
      </div>
      <section className="panel"><Head title="Sales by day" type="sales" /><div className="pb"><SalesChart data={series} currency={store.currency} /></div></section>
      <div className="grid-2e">
        <section className="panel"><Head title="Payment methods" type="payments" /><div className="pb flush tbl-wrap">
          <table className="tbl"><thead><tr><th>Method</th><th className="r">Orders</th><th className="r">Value</th><th className="r">Collected</th></tr></thead>
            <tbody>{sum.payMethods.length ? sum.payMethods.map((p) => <tr key={p.method}><td>{p.method === 'cod' ? 'Cash on delivery' : 'Online'}</td><td className="r mono">{p.n}</td><td className="r mono">{m(p.total)}</td><td className="r mono">{m(p.paid)}</td></tr>) : <tr><td colSpan={4} className="muted">No orders in this period.</td></tr>}</tbody></table>
        </div></section>
        <section className="panel"><Head title="Discount usage" type="discounts" /><div className="pb flush tbl-wrap">
          <table className="tbl"><thead><tr><th>Code</th><th className="r">Orders</th><th className="r">Discount given</th><th className="r">Order revenue</th></tr></thead>
            <tbody>{discounts.length ? discounts.map((d) => <tr key={d.code}><td className="mono">{d.code}</td><td className="r mono">{d.orders}</td><td className="r mono">{m(d.amount)}</td><td className="r mono">{m(d.revenue)}</td></tr>) : <tr><td colSpan={4} className="muted">No discount codes used in this period.</td></tr>}</tbody></table>
        </div></section>
      </div>
      <section className="panel"><Head title="Product performance" type="products" note="Sorted by units" /><div className="pb flush tbl-wrap">
        <table className="tbl"><thead><tr><th>#</th><th>Product</th><th className="r">Units</th><th className="r">Orders</th><th className="r">Revenue</th><th className="r">Gross margin (est.)</th></tr></thead>
          <tbody>{products.length ? products.map((p, i) => <tr key={`${p.productId}-${p.name}`}><td className="mono muted">{i + 1}</td><td>{p.name}</td><td className="r mono">{p.units}</td><td className="r mono">{p.orders}</td><td className="r mono">{m(p.revenue)}</td><td className="r mono">{p.margin != null ? m(p.margin) : '—'}</td></tr>) : <tr><td colSpan={6} className="muted">No sales in this period.</td></tr>}</tbody></table>
      </div></section>
      <section className="panel"><Head title="Inventory" type="inventory" note="Current snapshot" /><div className="pb"><div className="kpis">
        <div className="kpi"><span className="k">Units on hand</span><span className="v num">{inv.units}</span></div>
        <div className="kpi"><span className="k">Value at cost</span><span className="v">{m(inv.costValue)}</span></div>
        <div className="kpi"><span className="k">Value at retail</span><span className="v">{m(inv.retailValue)}</span></div>
        <div className="kpi warn"><span className="k">Low stock</span><span className="v num">{inv.low.length}</span></div>
        <div className="kpi bad"><span className="k">Out of stock</span><span className="v num">{inv.out.length}</span></div>
      </div></div></section>
    </>
  );
}
