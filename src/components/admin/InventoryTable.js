'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { api, useAdmin } from './ui';

const REASONS = [['restock', 'Restock / received'], ['count', 'Stock count correction'], ['damage', 'Damaged / lost'], ['adjustment', 'Other adjustment']];

export default function InventoryTable({ rows, threshold, filter, q, canWrite }) {
  const router = useRouter();
  const path = usePathname();
  const { toast } = useAdmin();
  const [open, setOpen] = useState(null);
  const [f, setF] = useState({ mode: 'delta', value: '', reason: 'restock', note: '' });
  const [search, setSearch] = useState(q);
  const go = (patch) => { const p = new URLSearchParams({ filter, q: search, ...patch }); [...p.keys()].forEach((k) => !p.get(k) && p.delete(k)); router.push(`${path}?${p}`); };
  const submit = async (e, id) => {
    e.preventDefault();
    const r = await api('POST', '/api/admin/inventory/adjust', { variantId: id, ...f, value: Number(f.value) });
    if (r.ok) { toast(`Stock is now ${r.data.stock}`); setOpen(null); setF({ mode: 'delta', value: '', reason: 'restock', note: '' }); router.refresh(); } else toast(r.error, 'bad');
  };
  return (
    <section className="panel">
      <div className="ph">
        <div className="tabs" style={{ border: 0 }}>{[['', 'All'], ['low', 'Low stock'], ['out', 'Out of stock']].map(([k, l]) => <button key={k} aria-selected={filter === k} onClick={() => go({ filter: k })}>{l}</button>)}</div>
        <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); go({}); }}><input className="input" style={{ minHeight: 34 }} aria-label="Search variants" placeholder="Search product, SKU, colour" value={search} onChange={(e) => setSearch(e.target.value)} /><button className="btn small ghost">Search</button></form>
      </div>
      <div className="pb flush tbl-wrap">
        {rows.length ? (
          <table className="tbl">
            <thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th className="r">Stock</th><th></th></tr></thead>
            <tbody>{rows.map((r) => (
              <Fragment key={r.id}>
                <tr style={{ opacity: r.active ? 1 : 0.5 }}>
                  <td><Link className="rowlink" href={`/admin/products/${r.productId}`}>{r.name}</Link>{r.status !== 'published' && <span className={`pill ${r.status}`} style={{ marginInlineStart: 6 }}>{r.status}</span>}</td>
                  <td>{r.frameColor} / {r.lensColor} / {r.size}{!r.active && ' (inactive)'}</td>
                  <td className="mono muted">{r.sku}</td>
                  <td className="r"><span className={`pill ${r.stock <= 0 ? 'out' : r.stock <= threshold ? 'low' : 'ok'}`}>{r.stock}</span></td>
                  <td className="r" style={{ whiteSpace: 'nowrap' }}>
                    <Link className="btn small ghost" href={`/admin/inventory?variant=${r.id}`}>History</Link>{' '}
                    {canWrite && <button className="btn small" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>Adjust</button>}
                  </td>
                </tr>
                {open === r.id && (
                  <tr key={`${r.id}-f`}><td colSpan={5} style={{ background: 'var(--bg-2)' }}>
                    <form className="filters-row" onSubmit={(e) => submit(e, r.id)}>
                      <div className="field"><label htmlFor={`m${r.id}`}>Mode</label><select id={`m${r.id}`} className="select" value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}><option value="delta">Add / remove (±)</option><option value="set">Set exact count</option></select></div>
                      <div className="field"><label htmlFor={`v${r.id}`}>{f.mode === 'delta' ? 'Change (e.g. 10 or -2)' : 'New stock'}</label><input id={`v${r.id}`} className="input mono" inputMode="numeric" required value={f.value} onChange={(e) => setF({ ...f, value: e.target.value.replace(/[^\d-]/g, '') })} autoFocus /></div>
                      <div className="field"><label htmlFor={`r${r.id}`}>Reason</label><select id={`r${r.id}`} className="select" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>{REASONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                      <div className="field" style={{ flex: '1 1 200px' }}><label htmlFor={`n${r.id}`}>Note</label><input id={`n${r.id}`} className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Supplier invoice, count sheet…" /></div>
                      <button className="btn small">Save adjustment</button>
                    </form>
                  </td></tr>
                )}
              </Fragment>
            ))}</tbody>
          </table>
        ) : <div className="empty-adm">No variants match.</div>}
      </div>
    </section>
  );
}
