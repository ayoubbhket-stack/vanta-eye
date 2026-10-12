'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore, money } from './StoreProvider';
import { CloseIcon } from './Icons';
import { cartItemFrom, stockLabel, useVariantSelection } from './variants';

export function CartDrawer() {
  const { drawer, setDrawer, cart, setQty, removeFromCart, currency, count } = useStore();
  const path = usePathname();
  useEffect(() => { setDrawer(false); }, [path, setDrawer]);
  useEffect(() => {
    if (!drawer) return undefined;
    const k = (e) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [drawer, setDrawer]);
  if (!drawer) return null;
  const sub = cart.reduce((n, x) => n + x.unitPrice * x.qty, 0);
  return (
    <>
      <div className="scrim" onClick={() => setDrawer(false)} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Shopping cart">
        <div className="spread" style={{ alignItems: 'center' }}>
          <h2 className="display-s">Your cart <span className="label num">({count})</span></h2>
          <button className="icon-btn" aria-label="Close cart" onClick={() => setDrawer(false)} autoFocus><CloseIcon /></button>
        </div>
        <div className="lines">
          {!cart.length && <div className="empty"><p className="muted">Your cart is empty.</p><Link className="btn small" href="/shop">Shop frames</Link></div>}
          {cart.map((x) => (
            <div className="mini-line" key={x.variantId}>
              {x.image ? <img src={x.image} alt="" /> : <span />}
              <div style={{ minWidth: 0 }}>
                <Link href={`/product/${x.slug}`} style={{ fontWeight: 600 }}>{x.name}</Link>
                <div className="label" style={{ letterSpacing: '.06em', textTransform: 'none' }}>{x.variantLabel}</div>
                <div className="row" style={{ marginTop: 6, gap: 10 }}>
                  <div className="qty small">
                    <button aria-label="Decrease quantity" onClick={() => (x.qty > 1 ? setQty(x.variantId, x.qty - 1) : removeFromCart(x.variantId))}>−</button>
                    <input aria-label="Quantity" className="num" value={x.qty} readOnly />
                    <button aria-label="Increase quantity" onClick={() => setQty(x.variantId, Math.min(x.max || 20, x.qty + 1))}>+</button>
                  </div>
                  <button className="rm copy-btn" onClick={() => removeFromCart(x.variantId)}>Remove</button>
                </div>
              </div>
              <span className="price num">{money(x.unitPrice * x.qty, currency)}</span>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="stack" style={{ borderTop: '1px solid var(--line)', paddingTop: 18, gap: 12 }}>
            <div className="spread"><span className="muted">Subtotal</span><b className="price num">{money(sub, currency)}</b></div>
            <p className="label" style={{ margin: 0, textTransform: 'none', letterSpacing: '.02em' }}>Shipping and discounts are calculated at checkout.</p>
            <Link className="btn block" href="/checkout">Checkout <span className="arrow">→</span></Link>
            <Link className="btn ghost block" href="/cart">View cart</Link>
          </div>
        )}
      </aside>
    </>
  );
}

export function QuickView({ threshold = 3 }) {
  const { quick, setQuick } = useStore();
  useEffect(() => {
    if (!quick) return undefined;
    const k = (e) => e.key === 'Escape' && setQuick(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [quick, setQuick]);
  if (!quick) return null;
  return (
    <>
      <div className="scrim" onClick={() => setQuick(null)} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Quick view: ${quick.name}`}>
        <QuickBody product={quick} onClose={() => setQuick(null)} threshold={threshold} />
      </div>
    </>
  );
}

function QuickBody({ product, onClose, threshold }) {
  const { addToCart, currency } = useStore();
  const sel = useVariantSelection(product);
  const [img, setImg] = useState(0);
  useEffect(() => setImg(0), [sel.frame]);
  const st = stockLabel(sel.variant?.stock ?? 0, threshold);
  return (
    <div className="modal-box">
      <div className="media">
        {sel.images[img] && <img key={sel.images[img].url} src={sel.images[img].url} alt={sel.images[img].alt} style={{ animation: 'fade .4s' }} />}
        <div className="row" style={{ position: 'absolute', bottom: 12, insetInlineStart: 12, gap: 6 }}>
          {sel.images.map((im, i) => <button key={im.url} className="chip" style={{ height: 26, padding: '0 10px' }} aria-pressed={i === img} onClick={() => setImg(i)}>{i + 1}</button>)}
        </div>
      </div>
      <div className="content">
        <button className="icon-btn" style={{ position: 'absolute', top: 10, insetInlineEnd: 10 }} aria-label="Close" onClick={onClose} autoFocus><CloseIcon /></button>
        <span className="label">{product.categoryName} · {product.frameShape}</span>
        <h2 className="display-m">{product.name}</h2>
        <PriceTag product={product} currency={currency} big />
        <div className="opt-group">
          <div className="head"><span className="label">Frame</span><span className="label" style={{ color: 'var(--fg)' }}>{sel.frame}</span></div>
          <div className="color-opts">{product.frameColors.map((c) => (
            <button key={c.name} className="color-opt" aria-pressed={sel.frame === c.name} onClick={() => sel.pickFrame(c.name)} title={c.name}><span className="swatch" style={{ background: c.hex }} />{c.name}</button>
          ))}</div>
        </div>
        <div className="opt-group">
          <div className="head"><span className="label">Lens</span><span className="label" style={{ color: 'var(--fg)' }}>{sel.lens}</span></div>
          <div className="color-opts">{sel.lensesForFrame.map((l) => {
            const c = product.lensColors.find((x) => x.name === l);
            return <button key={l} className="color-opt" aria-pressed={sel.lens === l} onClick={() => sel.pickLens(l)}><span className="swatch" style={{ background: c?.hex }} />{l}</button>;
          })}</div>
        </div>
        {sel.sizesFor.length > 1 && (
          <div className="opt-group"><span className="label">Size</span>
            <div className="size-opts">{sel.sizesFor.map((v) => <button key={v.size} className="size-opt" aria-pressed={sel.size === v.size} disabled={v.stock <= 0} onClick={() => sel.setSize(v.size)}>{v.size}</button>)}</div>
          </div>
        )}
        <span className={`stock ${st.cls}`}>{st.text}</span>
        <div className="buy-row">
          <button className="btn" disabled={!sel.variant || sel.variant.stock <= 0} onClick={() => { addToCart(cartItemFrom(product, sel.variant, 1, sel.images[0]?.url)); onClose(); }}>
            {sel.variant?.stock > 0 ? 'Add to cart' : 'Sold out'}
          </button>
        </div>
        <Link href={`/product/${product.slug}`} className="link label" onClick={onClose}>Full details →</Link>
      </div>
    </div>
  );
}

export function PriceTag({ product, currency, big }) {
  const onSale = product.salePrice != null && product.salePrice < product.price;
  return (
    <div className="price num" style={big ? { fontSize: '1.35rem', textAlign: 'start' } : undefined}>
      <span className={onSale ? 'now' : ''}>{money(product.finalPrice, currency)}</span>
      {onSale && <s>{money(product.price, currency)}</s>}
    </div>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.tone === 'bad' ? ' bad' : ''}`}>
          <span>{t.text}</span>
          {t.href && <Link href={t.href}>{t.action || 'View'}</Link>}
        </div>
      ))}
    </div>
  );
}
