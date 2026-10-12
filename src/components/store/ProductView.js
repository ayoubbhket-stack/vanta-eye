'use client';
import { useEffect, useRef, useState } from 'react';
import Viewer3D from '../three/Viewer3D';
import { useStore } from './StoreProvider';
import { HeartIcon } from './Icons';
import { PriceTag } from './Overlays';
import { cartItemFrom, stockLabel, useVariantSelection } from './variants';

export default function ProductView({ product: p, threshold, reviewSummary, shippingNote, shippingPolicy, returnsPolicy }) {
  const { addToCart, wish, toggleWish, pushRecent, currency } = useStore();
  const sel = useVariantSelection(p);
  const [idx, setIdx] = useState(0); // -1 = 3D view
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [stickyOn, setStickyOn] = useState(false);
  const buyRef = useRef(null);
  const has3d = true; // every frame shape has a procedural model; uploaded GLB is used when present

  useEffect(() => { pushRecent(p.slug); }, [p.slug, pushRecent]);
  useEffect(() => { setIdx((i) => (i === -1 ? -1 : 0)); }, [sel.frame]);
  useEffect(() => { setQty((q) => Math.max(1, Math.min(q, sel.variant?.stock || 1))); }, [sel.variant]);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setStickyOn(!e.isIntersecting && e.boundingClientRect.top < 0));
    if (buyRef.current) io.observe(buyRef.current);
    return () => io.disconnect();
  }, []);

  const v = sel.variant;
  const st = stockLabel(v?.stock ?? 0, threshold);
  const saved = wish.includes(p.slug);
  const img = sel.images[idx] || sel.images[0];
  const spec = p.specs || {};
  const notation = spec.lensWidth ? <><span>{parseInt(spec.lensWidth, 10)}</span><span className="sq">□</span><span>{parseInt(spec.bridge, 10)}</span> <span>{parseInt(spec.temple, 10)}</span></> : null;
  const add = () => v && v.stock > 0 && addToCart(cartItemFrom(p, v, qty, sel.images[0]?.url));

  return (
    <div className="pdp">
      <div className="gallery">
        <div className="thumbs" role="group" aria-label="Product images">
          {sel.images.map((im, i) => (
            <button key={im.url} aria-pressed={idx === i} aria-label={`Show image ${i + 1}`} onClick={() => { setIdx(i); setZoom(false); }}><img src={im.url} alt="" loading="lazy" /></button>
          ))}
          {has3d && <button className="t3d" aria-pressed={idx === -1} onClick={() => setIdx(-1)} aria-label="Show interactive 3D view">3D</button>}
        </div>
        <div className={`stage${zoom ? ' zoomed' : ''}`}>
          {idx === -1 ? (
            <>
              <Viewer3D shape={p.frameShape} modelUrl={p.modelUrl} frameHex={v?.frameHex || p.frameColors[0]?.hex} lensHex={v?.lensHex || p.lensColors[0]?.hex}
                clear={p.category === 'eyeglasses'} fit={15} distance={30} eager poster={sel.images[0]?.url} posterAlt={`3D model of ${p.name}`} />
              <span className="label" style={{ position: 'absolute', bottom: 14, insetInlineStart: 16 }}>Drag to rotate · colours follow your selection</span>
            </>
          ) : img && (
            <img key={img.url} className="zoomable" src={img.url} alt={img.alt} onClick={() => setZoom((z) => !z)} />
          )}
          <div className="mode">
            <button className="chip" style={{ background: 'rgba(8,8,8,.7)' }} aria-pressed={idx !== -1} onClick={() => setIdx(0)}>Photos</button>
            <button className="chip" style={{ background: 'rgba(8,8,8,.7)' }} aria-pressed={idx === -1} onClick={() => setIdx(-1)}>3D</button>
          </div>
        </div>
      </div>

      <div className="buy">
        <div className="stack" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            {p.newArrival && <span className="tag dark">New</span>}
            {p.salePrice != null && <span className="tag">Sale</span>}
            {p.collections.map((c) => <a key={c} href={`/shop?collection=${c}`} className="tag line">{c}</a>)}
          </div>
          <h1>{p.name}</h1>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <PriceTag product={p} currency={currency} big />
            {reviewSummary && <a href="#reviews" className="mono muted" style={{ fontSize: '.88rem' }}><span className="stars">★</span> {reviewSummary.avg.toFixed(1)} ({reviewSummary.count})</a>}
          </div>
          <p className="label">SKU {v?.sku || p.sku}</p>
        </div>
        <p className="muted" style={{ margin: 0 }}>{p.description}</p>

        <div className="opt-group">
          <div className="head"><span className="label">Frame colour</span><span className="label" style={{ color: 'var(--fg)' }}>{sel.frame}</span></div>
          <div className="color-opts">{p.frameColors.map((c) => (
            <button key={c.name} className="color-opt" aria-pressed={sel.frame === c.name} onClick={() => sel.pickFrame(c.name)}>
              <span className="swatch" style={{ background: c.hex }} />{c.name}{sel.frameStock(c.name) <= 0 && <span className="label">· sold out</span>}
            </button>
          ))}</div>
        </div>
        <div className="opt-group">
          <div className="head"><span className="label">Lens</span><span className="label" style={{ color: 'var(--fg)' }}>{sel.lens}</span></div>
          <div className="color-opts">{sel.lensesForFrame.map((l) => {
            const c = p.lensColors.find((x) => x.name === l);
            return <button key={l} className="color-opt" aria-pressed={sel.lens === l} onClick={() => sel.pickLens(l)}><span className="swatch" style={{ background: c?.hex }} />{l}</button>;
          })}</div>
        </div>
        <div className="opt-group">
          <div className="head"><span className="label">Size</span>{notation && <span className="label">Lens □ Bridge Temple (mm)</span>}</div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="size-opts">{sel.sizesFor.map((x) => <button key={x.size} className="size-opt" aria-pressed={sel.size === x.size} disabled={x.stock <= 0} onClick={() => sel.setSize(x.size)} aria-label={`Size ${x.size}${x.stock <= 0 ? ', sold out' : ''}`}>{x.size}</button>)}</div>
            {notation && <span className="size-notation">{notation}</span>}
          </div>
        </div>

        <span className={`stock ${st.cls}`} aria-live="polite">{st.text}</span>
        <div className="buy-row" ref={buyRef}>
          <div className="qty" aria-label="Quantity">
            <button aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <input aria-label="Quantity" className="num" inputMode="numeric" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(v?.stock || 1, Number(e.target.value.replace(/\D/g, '')) || 1)))} />
            <button aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(v?.stock || 1, q + 1, 20))}>+</button>
          </div>
          <button className="btn" disabled={!v || v.stock <= 0} onClick={add}>{v && v.stock > 0 ? 'Add to cart' : 'Sold out'}</button>
          <button className="icon-btn" style={{ border: '1px solid var(--line)', borderRadius: 2, width: 52, height: 52 }} aria-pressed={saved} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'} onClick={() => toggleWish(p.slug, p.name)}>
            <span style={{ color: saved ? 'var(--accent)' : undefined, display: 'grid' }}><HeartIcon /></span>
          </button>
        </div>
        <p className="label" style={{ textTransform: 'none', letterSpacing: '.02em', margin: 0 }}>Cash on delivery available · {shippingNote}</p>

        <div className="accordion">
          <details open><summary>Specifications</summary><div className="body">
            <dl className="spec-list">
              <div><dt>Shape</dt><dd>{p.frameShape}</dd></div>
              <div><dt>Material</dt><dd>{p.material}</dd></div>
              {Object.entries(spec).map(([k, val]) => <div key={k}><dt>{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt><dd>{val}</dd></div>)}
            </dl>
          </div></details>
          <details><summary>Size &amp; fit</summary><div className="body">
            <p>The three numbers on the inside of the temple are lens width, bridge width and temple length in millimetres{notation ? ` (${parseInt(spec.lensWidth, 10)}□${parseInt(spec.bridge, 10)} ${parseInt(spec.temple, 10)} for this frame)` : ''}.</p>
            <p>S suits narrower faces, M is our standard fit, L suits wider faces. Compare with a pair you already own, or message us for help.</p>
          </div></details>
          <details><summary>Shipping</summary><div className="body">{shippingPolicy.split('\n\n').map((t, i) => <p key={i}>{t}</p>)}</div></details>
          <details><summary>Returns</summary><div className="body">{returnsPolicy.split('\n\n').map((t, i) => <p key={i}>{t}</p>)}</div></details>
        </div>
      </div>

      <div className={`sticky-buy${stickyOn ? ' show' : ''}`} aria-hidden={!stickyOn}>
        <div style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</strong><span className="label">{sel.frame} / {sel.lens}</span></div>
        <button className="btn small" disabled={!v || v.stock <= 0} onClick={add} tabIndex={stickyOn ? 0 : -1}>{v && v.stock > 0 ? 'Add to cart' : 'Sold out'}</button>
      </div>
    </div>
  );
}
