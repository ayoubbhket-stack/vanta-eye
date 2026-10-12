import Link from 'next/link';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { can, requireAdminPage } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { getSetting } from '@/lib/settings';
import { Pager, Pill, SortTh } from '@/components/admin/server-ui';

export const metadata = { title: 'Products' };

export default async function Products({ searchParams: p }) {
  const me = await requireAdminPage('products.read');
  const db = await getDb();
  const store = await getSetting('store');
  const w = [];
  if (p.q) w.push(or(ilike(s.products.name, `%${p.q}%`), ilike(s.products.sku, `%${p.q}%`), ilike(s.products.slug, `%${p.q}%`)));
  if (p.status) w.push(eq(s.products.status, p.status)); else w.push(sql`${s.products.status} <> 'archived'`);
  if (p.category) w.push(eq(s.products.categoryId, Number(p.category)));
  const where = and(...w);
  const per = 20; const page = Math.max(1, Number(p.page) || 1);
  const stock = sql`coalesce((select sum(stock) from product_variants v where v.product_id = "products"."id" and v.active), 0)::int`;
  const sorts = { name: s.products.name, price: s.products.price, updated: s.products.updatedAt, stock };
  const col = sorts[p.sort] || s.products.updatedAt;
  const [rows, [{ n }], cats] = await Promise.all([
    db.select({ p: s.products, stock, img: sql`(select media_id from product_images i where i.product_id = "products"."id" order by sort_order limit 1)`, variants: sql`(select count(*) from product_variants v where v.product_id = "products"."id" and v.active)::int`, cat: s.categories.name })
      .from(s.products).leftJoin(s.categories, eq(s.products.categoryId, s.categories.id)).where(where)
      .orderBy(p.dir === 'asc' ? asc(col) : desc(col)).limit(per).offset((page - 1) * per),
    db.select({ n: sql`count(*)::int` }).from(s.products).where(where),
    db.select().from(s.categories).orderBy(s.categories.sortOrder),
  ]);
  const base = '/admin/products';
  return (
    <>
      <div className="adm-head"><div><h1>Products</h1><p className="sub">{n} products</p></div>{can(me, 'products.write') && <Link className="btn" href="/admin/products/new">+ New product</Link>}</div>
      <form className="panel" method="get" action={base}><div className="pb filters-row">
        <div className="field" style={{ flex: '2 1 220px' }}><label htmlFor="q">Search</label><input id="q" name="q" className="input" defaultValue={p.q} placeholder="Name, SKU or slug" /></div>
        <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" className="select" defaultValue={p.status || ''}><option value="">Active (not archived)</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></div>
        <div className="field"><label htmlFor="category">Category</label><select id="category" name="category" className="select" defaultValue={p.category || ''}><option value="">All</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="row" style={{ gap: 8 }}><button className="btn small">Filter</button><Link className="btn small ghost" href={base}>Reset</Link></div>
      </div></form>
      <section className="panel">
        <div className="pb flush tbl-wrap">
          {rows.length ? (
            <table className="tbl">
              <thead><tr><th></th><SortTh label="Product" k="name" params={p} base={base} /><th>Status</th><th>Category</th><SortTh label="Price" k="price" params={p} base={base} className="r" /><SortTh label="Stock" k="stock" params={p} base={base} className="r" /><SortTh label="Updated" k="updated" params={p} base={base} /></tr></thead>
              <tbody>{rows.map(({ p: x, stock: st, img, variants, cat }) => (
                <tr key={x.id}>
                  <td style={{ width: 56 }}>{img ? <img className="thumb" src={`/api/media/${img}`} alt="" /> : <span className="thumb" style={{ display: 'block' }} />}</td>
                  <td><Link className="rowlink" href={`/admin/products/${x.id}`}>{x.name}</Link><div className="mono muted" style={{ fontSize: '.76rem' }}>{x.sku} · {variants} variants{x.featured ? ' · featured' : ''}{x.newArrival ? ' · new' : ''}</div></td>
                  <td><Pill s={x.status} /></td>
                  <td className="muted">{cat || '—'}</td>
                  <td className="r mono">{x.salePrice != null ? <><span style={{ color: 'var(--accent)' }}>{formatMoney(x.salePrice)}</span><div className="muted" style={{ textDecoration: 'line-through', fontSize: '.78rem' }}>{formatMoney(x.price)}</div></> : formatMoney(x.price)}</td>
                  <td className="r"><span className={`pill ${st <= 0 ? 'out' : st <= store.lowStockThreshold ? 'low' : 'ok'}`}>{st}</span></td>
                  <td className="mono muted">{new Date(x.updatedAt).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <div className="empty-adm"><strong>No products found</strong>{can(me, 'products.write') && <Link className="btn small" href="/admin/products/new">Create a product</Link>}</div>}
        </div>
        <Pager page={page} pages={Math.ceil(n / per)} total={n} params={p} base={base} per={per} />
      </section>
    </>
  );
}
