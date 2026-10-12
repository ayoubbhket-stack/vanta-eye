'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { api, Dropzone, F, Toggle, uploadFiles, useAdmin } from './ui';
import { FRAME_SHAPES } from '@/lib/three/glasses';

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
const SPEC_KEYS = ['lensWidth', 'bridge', 'temple', 'weight', 'uv', 'polarised', 'edition'];
const EMPTY = {
  name: '', slug: '', sku: '', description: '', categoryId: null, collectionIds: [], price: '', salePrice: '', costPrice: '',
  frameShape: 'square', material: '', specs: { lensWidth: '', bridge: '', temple: '', weight: '', uv: 'UV400' }, modelMediaId: null, status: 'draft',
  featured: false, newArrival: true, seoTitle: '', seoDescription: '', images: [],
  variants: [{ sku: '', frameColor: 'Matte Black', frameHex: '#121212', lensColor: 'Smoke', lensHex: '#1c1c1c', size: 'M', stock: 0, active: true }],
};

export default function ProductEditor({ initial, categories, collections, readOnly, sold = 0 }) {
  const router = useRouter();
  const { toast, confirm } = useAdmin();
  const [d, setD] = useState(initial || EMPTY);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const isNew = !d.id;
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const frameColors = useMemo(() => [...new Set(d.variants.map((v) => v.frameColor).filter(Boolean))], [d.variants]);
  const err = (k) => errs[k];

  const save = async (statusOverride) => {
    setBusy(true); setErrs({});
    const specs = Object.fromEntries(Object.entries(d.specs).filter(([, v]) => String(v).trim()));
    const body = {
      ...d, specs, status: statusOverride || d.status,
      salePrice: d.salePrice === '' ? null : d.salePrice, costPrice: d.costPrice === '' ? null : d.costPrice,
      variants: d.variants.map((v) => ({ ...v, sku: v.sku || `${d.sku}-${v.frameColor.slice(0, 3)}-${v.lensColor.slice(0, 3)}-${v.size}`.toUpperCase().replace(/\s+/g, '') })),
    };
    const r = await api(isNew ? 'POST' : 'PUT', isNew ? '/api/admin/products' : `/api/admin/products/${d.id}`, body);
    setBusy(false);
    if (r.ok) {
      toast(isNew ? 'Product created' : `Saved${statusOverride ? ` · ${statusOverride}` : ''}`);
      if (statusOverride) set('status', statusOverride);
      if (isNew) router.replace(`/admin/products/${r.data.id}`); else router.refresh();
    } else { setErrs(r.fields); toast(r.error + (Object.keys(r.fields).length ? ` (${Object.values(r.fields)[0]})` : ''), 'bad'); }
  };

  const addImages = async (files) => {
    setUp(true);
    try {
      const ms = await uploadFiles(files);
      set('images', [...d.images, ...ms.map((m) => ({ mediaId: m.id, alt: `${d.name}`.trim(), frameColor: frameColors[0] || null }))]);
      toast(`${ms.length} image${ms.length > 1 ? 's' : ''} uploaded`);
    } catch (e) { toast(e.message, 'bad'); } finally { setUp(false); }
  };
  const moveImg = (i, dir) => { const a = [...d.images]; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set('images', a); };
  const setVar = (i, k, v) => set('variants', d.variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
      <fieldset disabled={readOnly || busy} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 20 }}>
        <div className="adm-head">
          <div>
            <Link href="/admin/products" className="link label">← Products</Link>
            <h1 style={{ marginTop: 8 }}>{isNew ? 'New product' : d.name || 'Product'}</h1>
            <p className="sub">{isNew ? 'Saved as draft until you publish.' : <>Status <span className={`pill ${d.status}`}>{d.status}</span> · {sold} units sold all-time</>}</p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {!isNew && <a className="btn ghost small" href={`/product/${d.slug}${d.status !== 'published' ? '?preview=1' : ''}`} target="_blank" rel="noreferrer">{d.status === 'published' ? 'View on store ↗' : 'Preview ↗'}</a>}
            {!isNew && !readOnly && (
              <button type="button" className="btn small danger" onClick={async () => {
                if (!(await confirm({ title: 'Delete this product?', body: sold ? 'It has orders, so it will be archived (hidden from the store) instead of deleted.' : 'This permanently removes the product, its variants and images.', danger: true, confirmLabel: sold ? 'Archive' : 'Delete' }))) return;
                const r = await api('DELETE', `/api/admin/products/${d.id}`);
                if (r.ok) { toast(r.data.archived ? 'Product archived' : 'Product deleted'); router.replace('/admin/products'); router.refresh(); } else toast(r.error, 'bad');
              }}>{sold ? 'Archive' : 'Delete'}</button>
            )}
          </div>
        </div>
        {readOnly && <div className="notice">Your role can view products but not edit them.</div>}

        <div className="grid-2">
          <div style={{ display: 'grid', gap: 20 }}>
            <section className="panel"><div className="ph"><h2>Details</h2></div><div className="pb form-grid">
              <F id="p-name" label="Name" err={err('name')}><input id="p-name" className="input" value={d.name} onChange={(e) => { set('name', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)); }} /></F>
              <F id="p-sku" label="SKU" err={err('sku')}><input id="p-sku" className="input mono" value={d.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} placeholder="VE-XXX" /></F>
              <F id="p-slug" label="URL slug" err={err('slug')} hint={`/product/${d.slug || '…'}`} full><input id="p-slug" className="input mono" value={d.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} /></F>
              <F id="p-desc" label="Description" err={err('description')} full><textarea id="p-desc" className="textarea" value={d.description} onChange={(e) => set('description', e.target.value)} /></F>
              <F id="p-shape" label="Frame shape" hint="Used for filters and the 3D fallback model."><select id="p-shape" className="select" value={d.frameShape} onChange={(e) => set('frameShape', e.target.value)}>{FRAME_SHAPES.map((s) => <option key={s}>{s}</option>)}</select></F>
              <F id="p-mat" label="Materials"><input id="p-mat" className="input" value={d.material} onChange={(e) => set('material', e.target.value)} /></F>
            </div></section>

            <section className="panel"><div className="ph"><h2>Images</h2><span className="label">First image is the main photo · tie images to a frame colour</span></div><div className="pb stack" style={{ gap: 14 }}>
              {err('images') && <div className="notice bad">{err('images')}</div>}
              {d.images.length > 0 && (
                <div className="img-grid">
                  {d.images.map((im, i) => (
                    <div className="img-tile" key={im.mediaId + i}>
                      {i === 0 && <span className="tag first">Main</span>}
                      <img src={`/api/media/${im.mediaId}`} alt={im.alt} />
                      <select aria-label="Frame colour for this image" value={im.frameColor || ''} onChange={(e) => set('images', d.images.map((x, j) => (j === i ? { ...x, frameColor: e.target.value || null } : x)))}>
                        <option value="">All colours</option>{frameColors.map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <input className="input" style={{ minHeight: 30, fontSize: '.75rem', borderRadius: 0, border: 0, borderTop: '1px solid var(--line)' }} aria-label="Alt text" placeholder="Alt text" value={im.alt} onChange={(e) => set('images', d.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                      <div className="bar">
                        <button type="button" aria-label="Move left" onClick={() => moveImg(i, -1)} disabled={i === 0}>←</button>
                        <button type="button" aria-label="Move right" onClick={() => moveImg(i, 1)} disabled={i === d.images.length - 1}>→</button>
                        <button type="button" aria-label="Remove image" onClick={() => set('images', d.images.filter((_, j) => j !== i))}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Dropzone onFiles={addImages} busy={up} />
            </div></section>

            <section className="panel"><div className="ph"><h2>Variants &amp; stock</h2><button type="button" className="btn small ghost" onClick={() => set('variants', [...d.variants, { ...d.variants[d.variants.length - 1], id: undefined, stockOriginal: undefined, sku: '', size: 'L', stock: 0 }])}>+ Add variant</button></div>
              <div className="pb flush tbl-wrap">
                <table className="tbl variant-tbl">
                  <thead><tr><th>Frame colour</th><th>Lens</th><th>Size</th><th>SKU</th><th className="r">Stock</th><th>Active</th><th></th></tr></thead>
                  <tbody>{d.variants.map((v, i) => (
                    <tr key={v.id || `n${i}`}>
                      <td><div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}><input type="color" className="hex" aria-label="Frame colour hex" value={v.frameHex} onChange={(e) => setVar(i, 'frameHex', e.target.value)} /><input className="input" aria-label="Frame colour name" value={v.frameColor} onChange={(e) => setVar(i, 'frameColor', e.target.value)} style={{ minWidth: 120 }} /></div>{errs[`variants.${i}.frameColor`] && <span className="err">{errs[`variants.${i}.frameColor`]}</span>}</td>
                      <td><div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}><input type="color" className="hex" aria-label="Lens colour hex" value={v.lensHex} onChange={(e) => setVar(i, 'lensHex', e.target.value)} /><input className="input" aria-label="Lens colour name" value={v.lensColor} onChange={(e) => setVar(i, 'lensColor', e.target.value)} style={{ minWidth: 120 }} /></div></td>
                      <td><input className="input mono" aria-label="Size" value={v.size} onChange={(e) => setVar(i, 'size', e.target.value.toUpperCase())} style={{ width: 60 }} />{errs[`variants.${i}.size`] && <span className="err" style={{ color: 'var(--bad)', fontSize: '.75rem' }}>{errs[`variants.${i}.size`]}</span>}</td>
                      <td><input className="input mono" aria-label="Variant SKU" value={v.sku} placeholder="auto" onChange={(e) => setVar(i, 'sku', e.target.value.toUpperCase())} style={{ minWidth: 150 }} />{errs[`variants.${i}.sku`] && <span style={{ color: 'var(--bad)', fontSize: '.75rem' }}>{errs[`variants.${i}.sku`]}</span>}</td>
                      <td className="r"><input className="input mono" aria-label="Stock" inputMode="numeric" value={v.stock} onChange={(e) => setVar(i, 'stock', e.target.value.replace(/\D/g, '') === '' ? '' : Number(e.target.value.replace(/\D/g, '')))} style={{ width: 80, textAlign: 'end' }} /></td>
                      <td><Toggle id={`va${i}`} label="" checked={v.active} onChange={(x) => setVar(i, 'active', x)} /></td>
                      <td><button type="button" className="icon-btn" aria-label="Remove variant" disabled={d.variants.length === 1} onClick={() => set('variants', d.variants.filter((_, j) => j !== i))}>✕</button></td>
                    </tr>
                  ))}</tbody>
                </table>
                {err('variants') && <div className="notice bad" style={{ margin: 12 }}>{err('variants')}</div>}
                <p className="muted" style={{ fontSize: '.8rem', padding: '0 14px 12px', margin: 0 }}>Stock edits are recorded in the inventory history. Removing a variant keeps it in past orders but hides it from the store.</p>
              </div>
            </section>

            <section className="panel"><div className="ph"><h2>Specifications</h2></div><div className="pb form-grid-3">
              {[...new Set([...SPEC_KEYS, ...Object.keys(d.specs)])].map((k) => (
                <F key={k} id={`sp-${k}`} label={k.replace(/([A-Z])/g, ' $1')}><input id={`sp-${k}`} className="input" value={d.specs[k] || ''} onChange={(e) => set('specs', { ...d.specs, [k]: e.target.value })} /></F>
              ))}
            </div></section>

            <section className="panel"><div className="ph"><h2>Search engine listing</h2></div><div className="pb stack" style={{ gap: 12 }}>
              <F id="seo-t" label={`SEO title (${d.seoTitle.length}/70)`} err={err('seoTitle')}><input id="seo-t" className="input" value={d.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} placeholder={d.name} /></F>
              <F id="seo-d" label={`Meta description (${d.seoDescription.length}/170)`} err={err('seoDescription')}><textarea id="seo-d" className="textarea" style={{ minHeight: 70 }} value={d.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} placeholder={d.description.slice(0, 155)} /></F>
              <div style={{ padding: 12, background: 'var(--bg-2)', borderRadius: 6 }}><div style={{ color: '#8ab4f8' }}>{d.seoTitle || d.name || 'Product title'}</div><div className="mono" style={{ fontSize: '.75rem', color: 'var(--ok)' }}>/product/{d.slug}</div><div className="muted" style={{ fontSize: '.85rem' }}>{(d.seoDescription || d.description).slice(0, 160)}</div></div>
            </div></section>
          </div>

          <div style={{ display: 'grid', gap: 20, position: 'sticky', top: 80 }}>
            <section className="panel"><div className="ph"><h2>Publishing</h2></div><div className="pb stack" style={{ gap: 14 }}>
              <F id="p-status" label="Status"><select id="p-status" className="select" value={d.status} onChange={(e) => set('status', e.target.value)}><option value="draft">Draft (hidden)</option><option value="published">Published</option><option value="archived">Archived</option></select></F>
              <Toggle id="p-feat" label="Featured on homepage" checked={d.featured} onChange={(v) => set('featured', v)} />
              <Toggle id="p-new" label="New arrival" checked={d.newArrival} onChange={(v) => set('newArrival', v)} />
              <div className="row" style={{ gap: 8 }}>
                <button className="btn" style={{ flex: 1 }}>{busy ? 'Saving…' : 'Save'}</button>
                {d.status !== 'published' && <button type="button" className="btn ghost" onClick={() => save('published')}>Save &amp; publish</button>}
              </div>
            </div></section>
            <section className="panel"><div className="ph"><h2>Pricing</h2><span className="label">EGP</span></div><div className="pb form-grid">
              <F id="p-price" label="Price" err={err('price')}><input id="p-price" className="input mono" inputMode="decimal" value={d.price} onChange={(e) => set('price', e.target.value)} /></F>
              <F id="p-sale" label="Sale price" err={err('salePrice')} hint="Leave empty for no sale"><input id="p-sale" className="input mono" inputMode="decimal" value={d.salePrice ?? ''} onChange={(e) => set('salePrice', e.target.value)} /></F>
              <F id="p-cost" label="Cost per unit" err={err('costPrice')} hint="Private. Used for profit reports." full><input id="p-cost" className="input mono" inputMode="decimal" value={d.costPrice ?? ''} onChange={(e) => set('costPrice', e.target.value)} /></F>
              {d.price && d.costPrice !== '' && d.costPrice != null && <p className="muted full" style={{ margin: 0, fontSize: '.84rem' }}>Margin {Math.round((1 - Number(d.costPrice) / Number(d.salePrice || d.price)) * 100)}% at the current selling price.</p>}
            </div></section>
            <section className="panel"><div className="ph"><h2>Organisation</h2></div><div className="pb stack" style={{ gap: 14 }}>
              <F id="p-cat" label="Category"><select id="p-cat" className="select" value={d.categoryId || ''} onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : null)}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
              <div className="stack" style={{ gap: 6 }}><span className="label" style={{ fontSize: '.64rem' }}>Collections</span>
                {collections.map((c) => <label key={c.id} className="check"><input type="checkbox" checked={d.collectionIds.includes(c.id)} onChange={(e) => set('collectionIds', e.target.checked ? [...d.collectionIds, c.id] : d.collectionIds.filter((x) => x !== c.id))} /> {c.name}</label>)}
              </div>
            </div></section>
            <section className="panel"><div className="ph"><h2>3D model</h2></div><div className="pb stack" style={{ gap: 10 }}>
              {d.modelMediaId ? <div className="row" style={{ justifyContent: 'space-between' }}><span className="pill ok">GLB attached</span><button type="button" className="btn small ghost" onClick={() => set('modelMediaId', null)}>Remove</button></div>
                : <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>No GLB uploaded. The store shows a generated 3D model of the “{d.frameShape}” shape instead.</p>}
              <Dropzone accept=".glb,model/gltf-binary" multiple={false} label={d.modelMediaId ? 'Replace GLB' : 'Upload GLB model'} busy={up} onFiles={async (files) => {
                setUp(true);
                try { const [m] = await uploadFiles(files.slice(0, 1), 'model'); set('modelMediaId', m.id); toast('3D model uploaded'); } catch (e) { toast(e.message, 'bad'); } finally { setUp(false); }
              }} />
              <p className="muted" style={{ margin: 0, fontSize: '.78rem' }}>Name frame meshes or materials “frame” and lens meshes “lens” so colours follow the selected variant.</p>
            </div></section>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
