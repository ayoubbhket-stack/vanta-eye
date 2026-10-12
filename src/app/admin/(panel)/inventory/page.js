import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { can, requireAdminPage } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { inventorySnapshot } from '@/lib/reports';
import { formatMoney } from '@/lib/money';
import InventoryTable from '@/components/admin/InventoryTable';
import { qs } from '@/components/admin/server-ui';

export const metadata = { title: 'Inventory' };

export default async function Inventory({ searchParams: p }) {
  const me = await requireAdminPage('inventory.read');
  const store = await getSetting('store');
  const inv = await inventorySnapshot(store.lowStockThreshold);
  const db = await getDb();
  const history = await db.select({ m: s.stockMovements, sku: s.productVariants.sku, name: s.products.name, admin: s.adminUsers.name })
    .from(s.stockMovements).innerJoin(s.productVariants, eq(s.stockMovements.variantId, s.productVariants.id))
    .innerJoin(s.products, eq(s.productVariants.productId, s.products.id)).leftJoin(s.adminUsers, eq(s.stockMovements.adminUserId, s.adminUsers.id))
    .where(p.variant ? eq(s.stockMovements.variantId, Number(p.variant)) : undefined)
    .orderBy(desc(s.stockMovements.createdAt), desc(s.stockMovements.id)).limit(60);
  let rows = inv.rows.filter((r) => !/-RET\d+$/.test(r.v.sku));
  if (p.filter === 'low') rows = rows.filter((r) => r.v.active && r.v.stock > 0 && r.v.stock <= store.lowStockThreshold);
  if (p.filter === 'out') rows = rows.filter((r) => r.v.active && r.v.stock <= 0);
  if (p.q) { const t = p.q.toLowerCase(); rows = rows.filter((r) => `${r.name} ${r.v.sku} ${r.v.frameColor} ${r.v.lensColor}`.toLowerCase().includes(t)); }
  const showMoney = can(me, 'reports.read');
  return (
    <>
      <div className="adm-head">
        <div><h1>Inventory</h1><p className="sub">Low-stock threshold: {store.lowStockThreshold} units (change in settings)</p></div>
        <a className="btn ghost small" href={`/api/admin/inventory/export${qs(p, {})}`}>Export CSV</a>
      </div>
      <div className="kpis">
        <Link href="/admin/inventory" className="kpi"><span className="k">Units in stock</span><span className="v num">{inv.units}</span><span className="d">{inv.rows.length} variants</span></Link>
        <Link href="/admin/inventory?filter=low" className={`kpi${inv.low.length ? ' warn' : ''}`}><span className="k">Low stock</span><span className="v num">{inv.low.length}</span><span className="d">Variants at or below threshold</span></Link>
        <Link href="/admin/inventory?filter=out" className={`kpi${inv.out.length ? ' bad' : ''}`}><span className="k">Out of stock</span><span className="v num">{inv.out.length}</span><span className="d">Active variants</span></Link>
        {showMoney && <div className="kpi"><span className="k">Stock value</span><span className="v">{formatMoney(inv.costValue)}</span><span className="d">At cost · {formatMoney(inv.retailValue)} at retail</span></div>}
      </div>
      <InventoryTable rows={rows.map((r) => ({ id: r.v.id, sku: r.v.sku, name: r.name, productId: r.productId, frameColor: r.v.frameColor, lensColor: r.v.lensColor, size: r.v.size, stock: r.v.stock, active: r.v.active, status: r.status }))}
        threshold={store.lowStockThreshold} filter={p.filter || ''} q={p.q || ''} canWrite={can(me, 'inventory.write')} />
      <section className="panel">
        <div className="ph"><h2>Stock history {p.variant && <span className="muted">· one variant</span>}</h2>{p.variant && <Link className="link label" href="/admin/inventory">Show all</Link>}</div>
        <div className="pb flush tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Variant</th><th>Reason</th><th className="r">Change</th><th className="r">After</th><th>Note</th><th>By</th></tr></thead>
            <tbody>{history.map(({ m, sku, name, admin }) => (
              <tr key={m.id}>
                <td className="mono muted">{new Date(m.createdAt).toLocaleString('en-GB', { timeZone: 'Africa/Cairo', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td><Link href={`/admin/inventory?variant=${m.variantId}`} className="rowlink">{name}</Link><div className="mono muted" style={{ fontSize: '.74rem' }}>{sku}</div></td>
                <td><span className={`pill ${m.reason === 'sale' ? 'confirmed' : m.reason === 'cancel' || m.reason === 'refund' ? 'refunded' : m.reason === 'damage' ? 'bad' : 'ok'}`}>{m.reason}</span></td>
                <td className="r mono" style={{ color: m.delta < 0 ? 'var(--bad)' : 'var(--ok)' }}>{m.delta > 0 ? '+' : ''}{m.delta}</td>
                <td className="r mono">{m.stockAfter}</td>
                <td className="muted">{m.orderId ? <Link className="link" href={`/admin/orders/${m.orderId}`}>{m.note}</Link> : m.note}</td>
                <td className="muted">{admin || (m.orderId ? 'Checkout' : 'System')}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
