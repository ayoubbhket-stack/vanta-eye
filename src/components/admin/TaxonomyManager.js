'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, F, SingleImage, Toggle, useAdmin } from './ui';

const slugify = (s) => s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-');
const THEMES = ['signature', 'sport', 'minimal', 'retro', 'limited'];

export default function TaxonomyManager({ categories, collections, products }) {
  const router = useRouter();
  const { toast, confirm } = useAdmin();
  const [editing, setEditing] = useState(null); // { type, data }
  const call = async (b, msg) => { const r = await api('POST', '/api/admin/taxonomy', b); if (r.ok) { toast(msg); router.refresh(); return true; } toast(r.fields ? `${r.error} ${Object.values(r.fields)[0] || ''}` : r.error, 'bad'); return false; };
  const move = (list, type, i, dir) => { const ids = list.map((x) => x.id); const j = i + dir; [ids[i], ids[j]] = [ids[j], ids[i]]; call({ action: 'reorder', type, ids }, 'Order updated'); };

  const List = ({ type, items }) => (
    <div className="stack" style={{ gap: 8 }}>
      {items.map((x, i) => (
        <div className="sortable-row" key={x.id}>
          <div className="grip"><button disabled={i === 0} aria-label="Move up" onClick={() => move(items, type, i, -1)}>▲</button><button disabled={i === items.length - 1} aria-label="Move down" onClick={() => move(items, type, i, 1)}>▼</button></div>
          {type === 'collection' && (x.coverMediaId ? <img className="thumb" style={{ width: 64, height: 42, objectFit: 'cover', borderRadius: 4 }} src={`/api/media/${x.coverMediaId}`} alt="" /> : <span className="thumb" style={{ width: 64, height: 42 }} />)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{x.name}</strong> <span className="mono muted" style={{ fontSize: '.78rem' }}>/{x.slug}</span>
            <div className="muted" style={{ fontSize: '.8rem' }}>{type === 'collection' ? `${x.productIds.length} products · ${x.theme} layout${x.featuredHome ? ' · on homepage' : ''}` : `${x.count} products`}</div>
          </div>
          <span className={`pill ${x.published ? 'published' : 'draft'}`}>{x.published ? 'visible' : 'hidden'}</span>
          <button className="btn small ghost" onClick={() => setEditing({ type, data: x })}>Edit</button>
          <button className="btn small danger" onClick={async () => { if (await confirm({ title: `Delete ${x.name}?`, body: type === 'collection' ? 'Products stay in the store; they are only removed from this collection.' : 'Only possible when no products use this category.', danger: true, confirmLabel: 'Delete' })) call({ action: 'delete', type, id: x.id }, 'Deleted'); }}>Delete</button>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="adm-head"><div><h1>Categories &amp; collections</h1><p className="sub">Order here controls the order on the storefront.</p></div></div>
      <div className="grid-2e">
        <section className="panel"><div className="ph"><h2>Collections</h2><button className="btn small" onClick={() => setEditing({ type: 'collection', data: { name: '', slug: '', tagline: '', description: '', theme: 'signature', published: true, featuredHome: true, coverMediaId: null, productIds: [] } })}>+ Collection</button></div><div className="pb"><List type="collection" items={collections} /></div></section>
        <section className="panel"><div className="ph"><h2>Categories</h2><button className="btn small" onClick={() => setEditing({ type: 'category', data: { name: '', slug: '', description: '', published: true } })}>+ Category</button></div><div className="pb"><List type="category" items={categories} /></div></section>
      </div>
      {editing && <Editor key={editing.data.id || 'new'} {...editing} products={products} onClose={() => setEditing(null)} onSave={async (data) => {
        const okd = await call(editing.data.id ? { action: 'update', type: editing.type, id: editing.data.id, data } : { action: 'create', type: editing.type, data }, 'Saved');
        if (okd) setEditing(null);
      }} />}
    </>
  );
}

function Editor({ type, data, products, onClose, onSave }) {
  const [d, setD] = useState(data);
  const [filter, setFilter] = useState('');
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="dlg-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dlg" style={{ width: 'min(720px, 100%)', maxHeight: 'calc(100vh - 32px)', overflow: 'auto' }} onSubmit={(e) => { e.preventDefault(); const { id, count, sortOrder, productIds, ...rest } = d; onSave(type === 'collection' ? { ...rest, productIds } : { name: rest.name, slug: rest.slug, description: rest.description, published: rest.published }); }}>
        <h2>{data.id ? `Edit ${type}` : `New ${type}`}</h2>
        <div className="form-grid">
          <F id="t-name" label="Name"><input id="t-name" className="input" value={d.name} required onChange={(e) => { set('name', e.target.value); if (!data.id) set('slug', slugify(e.target.value)); }} /></F>
          <F id="t-slug" label="Slug"><input id="t-slug" className="input mono" value={d.slug} required onChange={(e) => set('slug', slugify(e.target.value))} /></F>
          {type === 'collection' && <F id="t-tag" label="Tagline" full><input id="t-tag" className="input" value={d.tagline} onChange={(e) => set('tagline', e.target.value)} /></F>}
          <F id="t-desc" label="Description" full><textarea id="t-desc" className="textarea" value={d.description} onChange={(e) => set('description', e.target.value)} /></F>
          {type === 'collection' && <F id="t-theme" label="Page layout"><select id="t-theme" className="select" value={d.theme} onChange={(e) => set('theme', e.target.value)}>{THEMES.map((t) => <option key={t}>{t}</option>)}</select></F>}
          <div className="stack" style={{ gap: 10, alignSelf: 'end' }}>
            <Toggle id="t-pub" label="Visible on the store" checked={d.published} onChange={(v) => set('published', v)} />
            {type === 'collection' && <Toggle id="t-home" label="Feature on homepage" checked={d.featuredHome} onChange={(v) => set('featuredHome', v)} />}
          </div>
        </div>
        {type === 'collection' && <SingleImage label="Cover image" value={d.coverMediaId} onChange={(v) => set('coverMediaId', v)} />}
        {type === 'collection' && (
          <div className="stack" style={{ gap: 8 }}>
            <div className="spread"><span className="label">Products ({d.productIds.length})</span><input className="input" style={{ maxWidth: 220, minHeight: 34 }} placeholder="Filter" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter products" /></div>
            <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 6, padding: 8, display: 'grid', gap: 2 }}>
              {products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())).map((p) => (
                <label key={p.id} className="check"><input type="checkbox" checked={d.productIds.includes(p.id)} onChange={(e) => set('productIds', e.target.checked ? [...d.productIds, p.id] : d.productIds.filter((x) => x !== p.id))} />{p.name} <span className="count">{p.status}</span></label>
              ))}
            </div>
          </div>
        )}
        <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn ghost small" onClick={onClose}>Cancel</button><button className="btn small">Save</button></div>
      </form>
    </div>
  );
}
