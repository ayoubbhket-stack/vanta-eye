'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { CloseIcon, FilterIcon, GridIcon, ListIcon, SearchIcon } from './Icons';

const SORTS = [['featured', 'Featured'], ['newest', 'Newest arrivals'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low']];

export default function ShopControls({ params, categories, collections, facets, counts, total, view, children }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(params.q || '');
  const [min, setMin] = useState(params.min || '');
  const [max, setMax] = useState(params.max || '');
  useEffect(() => { setQ(params.q || ''); setMin(params.min || ''); setMax(params.max || ''); }, [params.q, params.min, params.max]);

  const go = (patch) => {
    const next = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    for (const [k, v] of Object.entries(patch)) { if (v == null || v === '') next.delete(k); else next.set(k, v); }
    if (!('page' in patch)) next.delete('page');
    start(() => router.replace(`${path}${next.toString() ? `?${next}` : ''}`, { scroll: false }));
  };
  const list = (k) => (params[k] ? String(params[k]).split(',') : []);
  const toggle = (k, v) => { const cur = list(k); go({ [k]: (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(',') }); };

  // debounce search typing
  useEffect(() => {
    if ((params.q || '') === q) return undefined;
    const t = setTimeout(() => go({ q: q.trim() }), 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = [];
  const nameOf = (arr, s) => arr.find((x) => x.slug === s)?.name || s;
  list('category').forEach((v) => active.push(['category', v, nameOf(categories, v)]));
  list('collection').forEach((v) => active.push(['collection', v, nameOf(collections, v)]));
  list('shape').forEach((v) => active.push(['shape', v, v]));
  list('frame').forEach((v) => active.push(['frame', v, `Frame: ${v}`]));
  list('lens').forEach((v) => active.push(['lens', v, `Lens: ${v}`]));
  if (params.min) active.push(['min', null, `From EGP ${params.min}`]);
  if (params.max) active.push(['max', null, `Up to EGP ${params.max}`]);
  if (params.stock) active.push(['stock', null, params.stock === 'in' ? 'In stock' : 'Sold out']);
  if (params.sale) active.push(['sale', null, 'On sale']);
  if (params.q) active.push(['q', null, `“${params.q}”`]);

  const Check = ({ k, v, label, count, swatch }) => (
    <label className="check"><input type="checkbox" checked={list(k).includes(v)} onChange={() => toggle(k, v)} />
      {swatch && <span className="swatch" style={{ background: swatch }} />}<span>{label}</span>{count != null && <span className="count">{count}</span>}
    </label>
  );

  return (
    <div className="shop-layout" aria-busy={pending}>
      <aside className={`filters${open ? ' open' : ''}`} aria-label="Filters">
        <div className="mobile-head"><span className="display-s">Filters</span><button className="icon-btn" aria-label="Close filters" onClick={() => setOpen(false)}><CloseIcon /></button></div>
        <div className="field" style={{ marginBottom: 6 }}>
          <label htmlFor="shop-q" className="sr-only">Search</label>
          <div style={{ position: 'relative' }}>
            <input id="shop-q" className="input" placeholder="Search frames" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingInlineStart: 40 }} />
            <span style={{ position: 'absolute', insetInlineStart: 12, top: 14, width: 20, color: 'var(--dim)' }}><SearchIcon /></span>
          </div>
        </div>
        <details open><summary>Category</summary><div className="filter-opts">{categories.map((c) => <Check key={c.slug} k="category" v={c.slug} label={c.name} count={counts.category[c.slug]} />)}</div></details>
        <details open><summary>Collection</summary><div className="filter-opts">{collections.map((c) => <Check key={c.slug} k="collection" v={c.slug} label={c.name} count={counts.collection[c.slug]} />)}</div></details>
        <details open><summary>Frame shape</summary><div className="filter-opts">{facets.shapes.map((s) => <Check key={s} k="shape" v={s} label={s[0].toUpperCase() + s.slice(1)} count={counts.shape[s]} />)}</div></details>
        <details><summary>Frame colour</summary><div className="filter-opts">{facets.frameColors.map((c) => <Check key={c.name} k="frame" v={c.name} label={c.name} swatch={c.hex} />)}</div></details>
        <details><summary>Lens colour</summary><div className="filter-opts">{facets.lensColors.map((c) => <Check key={c.name} k="lens" v={c.name} label={c.name} swatch={c.hex} />)}</div></details>
        <details open><summary>Price (EGP)</summary>
          <form className="price-range" onSubmit={(e) => { e.preventDefault(); go({ min, max }); }}>
            <div className="field"><label htmlFor="pmin">Min</label><input id="pmin" className="input" inputMode="numeric" placeholder={String(facets.priceMin)} value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} /></div>
            <div className="field"><label htmlFor="pmax">Max</label><input id="pmax" className="input" inputMode="numeric" placeholder={String(facets.priceMax)} value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} /></div>
            <button className="btn small ghost" style={{ gridColumn: '1 / -1' }}>Apply price</button>
          </form>
        </details>
        <details open><summary>Availability</summary><div className="filter-opts">
          <label className="check"><input type="radio" name="stock" checked={!params.stock} onChange={() => go({ stock: '' })} /> <span>All</span></label>
          <label className="check"><input type="radio" name="stock" checked={params.stock === 'in'} onChange={() => go({ stock: 'in' })} /> <span>In stock</span></label>
          <label className="check"><input type="radio" name="stock" checked={params.stock === 'out'} onChange={() => go({ stock: 'out' })} /> <span>Sold out</span></label>
          <label className="check"><input type="checkbox" checked={params.sale === '1'} onChange={() => go({ sale: params.sale === '1' ? '' : '1' })} /> <span>On sale</span></label>
        </div></details>
        <div className="apply-bar"><button className="btn ghost" style={{ flex: 1 }} onClick={() => { router.replace(path); setOpen(false); }}>Clear</button><button className="btn" style={{ flex: 2 }} onClick={() => setOpen(false)}>Show {total} results</button></div>
      </aside>

      <div style={{ minWidth: 0 }}>
        <div className="toolbar">
          <div className="left">
            <button className="btn small ghost filters-toggle" onClick={() => setOpen(true)}><FilterIcon /> Filters{active.length ? ` (${active.length})` : ''}</button>
            <span className="label num" aria-live="polite">{pending ? 'Updating…' : `${total} ${total === 1 ? 'frame' : 'frames'}`}</span>
          </div>
          <div className="right">
            <label htmlFor="sort" className="label">Sort</label>
            <select id="sort" className="select" style={{ minHeight: 40, width: 'auto', paddingBlock: 6 }} value={params.sort || 'featured'} onChange={(e) => go({ sort: e.target.value })}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <div className="seg" role="group" aria-label="Layout">
              <button aria-pressed={view === 'grid'} aria-label="Grid view" onClick={() => go({ view: '' })}><GridIcon /></button>
              <button aria-pressed={view === 'list'} aria-label="List view" onClick={() => go({ view: 'list' })}><ListIcon /></button>
            </div>
          </div>
        </div>
        {active.length > 0 && (
          <div className="active-filters" aria-label="Active filters">
            {active.map(([k, v, label]) => (
              <button key={k + v} className="chip on" onClick={() => (v ? toggle(k, v) : go({ [k]: '' }))} aria-label={`Remove filter ${label}`}>{label} <span aria-hidden="true">×</span></button>
            ))}
            <button className="chip" onClick={() => router.replace(path, { scroll: false })}>Clear all</button>
          </div>
        )}
        <div style={{ opacity: pending ? 0.5 : 1, transition: 'opacity .2s' }}>{children}</div>
      </div>
    </div>
  );
}
