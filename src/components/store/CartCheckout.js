'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore, money } from './StoreProvider';
import { Field } from './Forms';

const CODE_KEY = 've_code';
const getCode = () => { try { return sessionStorage.getItem(CODE_KEY) || ''; } catch { return ''; } };
const putCode = (c) => { try { c ? sessionStorage.setItem(CODE_KEY, c) : sessionStorage.removeItem(CODE_KEY); } catch { /* ignore */ } };

/** Server-priced quote for the current cart; keeps local prices in sync. */
function useQuote({ code, region, paymentMethod }) {
  const { cart, ready, replaceCart } = useStore();
  const [q, setQ] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const items = useMemo(() => cart.map((x) => ({ variantId: x.variantId, qty: x.qty })), [cart]);
  const key = JSON.stringify([items, code, region, paymentMethod]);
  const cartRef = useRef(cart); cartRef.current = cart;
  const refresh = useCallback(async () => {
    if (!ready) return;
    if (!items.length) { setQ(null); setLoading(false); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/cart/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items, code: code || undefined, region: region || undefined, paymentMethod }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not load prices.');
      setQ(d); setErr(null);
      // sync display prices / stock caps into the local cart
      const cur = cartRef.current;
      const next = cur.map((x) => { const l = d.lines.find((y) => y.variantId === x.variantId); return l && !l.error ? { ...x, unitPrice: l.unitPrice, max: l.stock } : x; });
      if (next.some((x, i) => x.unitPrice !== cur[i].unitPrice || x.max !== cur[i].max)) replaceCart(next);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, [key, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [refresh]);
  return { q, err, loading, refresh };
}

function Summary({ q, loading, children, currency, showShipping = true }) {
  if (!q) return <aside className="summary"><div className="skeleton" style={{ height: 160 }} /></aside>;
  return (
    <aside className="summary" aria-busy={loading}>
      <h2 className="display-s">Order summary</h2>
      <div className="line"><span>Subtotal</span><b className="num">{money(q.subtotal, currency)}</b></div>
      {q.discount && <div className="line"><span>Discount <span className="tag line">{q.discount.code}</span></span><b className="num" style={{ color: 'var(--ok)' }}>− {money(q.discountTotal, currency)}</b></div>}
      {showShipping && <div className="line"><span>Shipping{q.shippingRegion ? ` · ${q.shippingRegion.name}` : ''}</span><b className="num">{q.shippingFee == null ? 'Choose region' : q.shippingFee === 0 ? 'Free' : money(q.shippingFee, currency)}</b></div>}
      {q.codFee > 0 && <div className="line"><span>Cash on delivery fee</span><b className="num">{money(q.codFee, currency)}</b></div>}
      {q.taxAdded > 0 && <div className="line"><span>{q.taxLabel}</span><b className="num">{money(q.taxAdded, currency)}</b></div>}
      <div className="line total"><span>Total</span><b className="num">{money(q.total, currency)}</b></div>
      {q.taxIncludedAmount > 0 && <p className="label" style={{ margin: 0, textTransform: 'none', letterSpacing: '.02em' }}>Includes {money(q.taxIncludedAmount, currency)} {q.taxLabel.replace(/\s*\(.*\)/, '')}.</p>}
      {q.freeShippingOver > 0 && q.subtotal - q.discountTotal < q.freeShippingOver && (
        <p className="label" style={{ margin: 0, textTransform: 'none', letterSpacing: '.02em' }}>Add {money(q.freeShippingOver - (q.subtotal - q.discountTotal), currency)} more for free shipping.</p>
      )}
      {children}
    </aside>
  );
}

function CodeInput({ code, setCode, q }) {
  const [v, setV] = useState(code);
  useEffect(() => setV(code), [code]);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <form className="row" style={{ gap: 8, flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); const c = v.trim().toUpperCase(); setCode(c); putCode(c); }}>
        <label htmlFor="code" className="sr-only">Discount code</label>
        <input id="code" className="input" placeholder="Discount code" value={v} onChange={(e) => setV(e.target.value)} style={{ minHeight: 44, textTransform: 'uppercase' }} />
        <button className="btn small ghost" style={{ minHeight: 44 }}>Apply</button>
      </form>
      {code && q?.discountError && <span className="err" style={{ color: 'var(--bad)', fontSize: '.86rem' }} role="alert">{q.discountError} <button className="link" style={{ background: 'none', border: 0, padding: 0 }} onClick={() => { setCode(''); putCode(''); }}>Remove</button></span>}
      {code && q?.discount && <span style={{ color: 'var(--ok)', fontSize: '.86rem' }}>{q.discount.code} applied{q.discount.description ? ` — ${q.discount.description}` : ''}. <button className="link" style={{ background: 'none', border: 0, padding: 0, color: 'var(--muted)' }} onClick={() => { setCode(''); putCode(''); }}>Remove</button></span>}
    </div>
  );
}

export function CartView() {
  const { cart, ready, setQty, removeFromCart, currency } = useStore();
  const [code, setCode] = useState('');
  useEffect(() => setCode(getCode()), []);
  const { q, err, loading } = useQuote({ code });
  if (!ready) return <div className="skeleton" style={{ height: 300 }} />;
  if (!cart.length) {
    return (
      <div className="empty">
        <svg className="glyph" viewBox="0 0 120 50" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="30" cy="25" r="18" /><circle cx="90" cy="25" r="18" /><path d="M48 22c8-5 16-5 24 0" /></svg>
        <h2 className="display-s">Your cart is empty</h2>
        <p className="muted">Find a frame you like and it will wait for you here.</p>
        <Link className="btn" href="/shop">Shop frames</Link>
      </div>
    );
  }
  const problems = q?.problems || [];
  return (
    <div className="cart-layout">
      <div>
        {err && <div className="notice bad" role="alert" style={{ marginBottom: 16 }}>{err}</div>}
        {problems.length > 0 && <div className="notice bad" role="alert" style={{ marginBottom: 16 }}>Some items need attention before checkout.</div>}
        <div className="cart-lines">
          {cart.map((x) => {
            const l = q?.lines.find((y) => y.variantId === x.variantId);
            return (
              <div className="cart-line" key={x.variantId}>
                <Link href={`/product/${x.slug}`}>{x.image ? <img src={x.image} alt={x.name} /> : <span />}</Link>
                <div style={{ minWidth: 0 }}>
                  <Link href={`/product/${x.slug}`} className="t">{x.name}</Link>
                  <div className="v">{x.variantLabel}</div>
                  <div className="v mono">{money(l?.unitPrice ?? x.unitPrice, currency)} each</div>
                  {l?.error && <div className="err">{l.error}</div>}
                  <div className="ctrl">
                    <div className="qty small" role="group" aria-label={`Quantity for ${x.name}`}>
                      <button aria-label="Decrease quantity" onClick={() => setQty(x.variantId, x.qty - 1)} disabled={x.qty <= 1}>−</button>
                      <input aria-label="Quantity" className="num" value={x.qty} inputMode="numeric" onChange={(e) => setQty(x.variantId, Math.min(l?.stock || 20, Number(e.target.value.replace(/\D/g, '')) || 1))} />
                      <button aria-label="Increase quantity" onClick={() => setQty(x.variantId, Math.min(l?.stock ?? x.max ?? 20, x.qty + 1))} disabled={x.qty >= (l?.stock ?? x.max ?? 20)}>+</button>
                    </div>
                    <button className="rm" onClick={() => removeFromCart(x.variantId)}>Remove</button>
                  </div>
                </div>
                <span className="price num">{money((l?.unitPrice ?? x.unitPrice) * x.qty, currency)}</span>
              </div>
            );
          })}
        </div>
        <Link href="/shop" className="link label" style={{ display: 'inline-block', marginTop: 24 }}>← Continue shopping</Link>
      </div>
      <Summary q={q} loading={loading} currency={currency} showShipping={false}>
        <CodeInput code={code} setCode={setCode} q={q} />
        <p className="label" style={{ margin: 0, textTransform: 'none', letterSpacing: '.02em' }}>Shipping is calculated at checkout by region.</p>
        <Link className="btn block" href="/checkout" aria-disabled={problems.length > 0 || !q} onClick={(e) => problems.length && e.preventDefault()}>Proceed to checkout <span className="arrow">→</span></Link>
      </Summary>
    </div>
  );
}

const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function CheckoutView({ regions }) {
  const router = useRouter();
  const { cart, ready, clearCart, currency, toast } = useStore();
  const [f, setF] = useState({ name: '', phone: '', email: '', region: '', city: '', address: '', note: '', paymentMethod: 'cod' });
  const [code, setCode] = useState('');
  const [errs, setErrs] = useState({});
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const keyRef = useRef(null);
  useEffect(() => {
    setCode(getCode());
    try { keyRef.current = sessionStorage.getItem('ve_ckey') || newKey(); sessionStorage.setItem('ve_ckey', keyRef.current); } catch { keyRef.current = newKey(); }
    try { const saved = JSON.parse(localStorage.getItem('ve_checkout') || 'null'); if (saved) setF((x) => ({ ...x, ...saved, paymentMethod: 'cod' })); } catch { /* ignore */ }
  }, []);
  const { q, loading, refresh } = useQuote({ code, region: f.region, paymentMethod: f.paymentMethod });
  const region = regions.find((r) => r.name === f.region);
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value, ...(k === 'region' ? { city: '' } : {}) })); setErrs((x) => ({ ...x, [k]: undefined })); };

  useEffect(() => { if (q && !q.onlinePaymentAvailable && f.paymentMethod === 'online') setF((x) => ({ ...x, paymentMethod: 'cod' })); }, [q, f.paymentMethod]);

  const validate = () => {
    const e = {};
    if (f.name.trim().length < 3) e.name = 'Enter your full name.';
    const digits = f.phone.replace(/[^\d]/g, '').replace(/^20(?=1)/, '0').replace(/^0020/, '0');
    if (!/^01[0125]\d{8}$/.test(digits)) e.phone = 'Enter an Egyptian mobile number, e.g. 010 1234 5678.';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address.';
    if (!f.region) e.region = 'Choose your region.';
    if (!f.city.trim()) e.city = 'Choose or enter your city.';
    if (f.address.trim().length < 8) e.address = 'Enter the street, building and apartment.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (busy) return;
    setFormErr('');
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) { document.getElementById(`co-${Object.keys(e)[0]}`)?.focus(); return; }
    if (!q || q.problems.length) { setFormErr('Some items in your cart are unavailable. Review your cart first.'); return; }
    setBusy(true);
    try {
      try { const { paymentMethod, note, ...keep } = f; localStorage.setItem('ve_checkout', JSON.stringify(keep)); } catch { /* ignore */ }
      const r = await fetch('/api/checkout', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...f, code: code || '', items: cart.map((x) => ({ variantId: x.variantId, qty: x.qty })), idempotencyKey: keyRef.current, expectedTotal: q.total }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (d.fields) setErrs(Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k.split('.')[0], v])));
        setFormErr(d.error || 'Could not place the order. Please try again.');
        if (r.status === 409) { await refresh(); keyRef.current = newKey(); try { sessionStorage.setItem('ve_ckey', keyRef.current); } catch { /* ignore */ } }
        setBusy(false);
        return;
      }
      setDone(true);
      clearCart(); putCode('');
      try { sessionStorage.removeItem('ve_ckey'); } catch { /* ignore */ }
      if (d.redirectUrl) { window.location.href = d.redirectUrl; return; }
      if (d.paymentError) toast(d.paymentError, { tone: 'bad', ms: 9000 });
      router.push(`/order/${d.number}?t=${d.token}`);
    } catch {
      setFormErr('Network problem. Check your connection and press Place order again — you will not be charged twice.');
      setBusy(false);
    }
  };

  if (!ready) return <div className="skeleton" style={{ height: 400 }} />;
  if (!cart.length && !done) return <div className="empty"><h2 className="display-s">Your cart is empty</h2><Link className="btn" href="/shop">Shop frames</Link></div>;
  if (done) return <div className="empty"><p className="label accent">Placing order…</p><div className="skeleton" style={{ height: 8, width: 200 }} /></div>;

  return (
    <form className="cart-layout" onSubmit={submit} noValidate>
      <div className="stack" style={{ gap: 36 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
          <legend className="display-s" style={{ marginBottom: 16 }}>Contact</legend>
          <div className="form-grid">
            <Field id="co-name" label="Full name" err={errs.name}><input id="co-name" className="input" value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errs.name} aria-describedby={errs.name ? 'co-name-err' : undefined} /></Field>
            <Field id="co-phone" label="Mobile number" err={errs.phone} hint="The courier will call this number."><input id="co-phone" type="tel" inputMode="tel" className="input" value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="010 1234 5678" aria-invalid={!!errs.phone} /></Field>
            <Field id="co-email" label="Email (optional)" err={errs.email} hint="For your order confirmation." full><input id="co-email" type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errs.email} /></Field>
          </div>
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
          <legend className="display-s" style={{ marginBottom: 16 }}>Delivery</legend>
          <div className="form-grid">
            <Field id="co-region" label="Region" err={errs.region}>
              <select id="co-region" className="select" value={f.region} onChange={set('region')} aria-invalid={!!errs.region}>
                <option value="">Choose region</option>
                {regions.map((r) => <option key={r.name} value={r.name}>{r.name} — {currency} {(r.fee / 100).toLocaleString('en-US')} · {r.days} days</option>)}
              </select>
            </Field>
            <Field id="co-city" label="City / area" err={errs.city}>
              {region?.cities?.length ? (
                <select id="co-city" className="select" value={region.cities.includes(f.city) ? f.city : (f.city ? 'Other' : '')} onChange={set('city')} aria-invalid={!!errs.city}>
                  <option value="">Choose city</option>
                  {region.cities.map((c) => <option key={c}>{c}</option>)}
                </select>
              ) : <input id="co-city" className="input" value={f.city} onChange={set('city')} autoComplete="address-level2" disabled={!f.region} placeholder={f.region ? '' : 'Choose a region first'} />}
            </Field>
            <Field id="co-address" label="Street address" err={errs.address} full hint="Street, building number, floor, apartment, landmark."><textarea id="co-address" className="textarea" style={{ minHeight: 90 }} value={f.address} onChange={set('address')} autoComplete="street-address" aria-invalid={!!errs.address} /></Field>
            <Field id="co-note" label="Delivery note (optional)" full><input id="co-note" className="input" value={f.note} onChange={set('note')} /></Field>
          </div>
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
          <legend className="display-s" style={{ marginBottom: 16 }}>Payment</legend>
          <div className="pay-opts" role="radiogroup">
            {q?.codAvailable !== false && (
              <label className="pay-opt"><input type="radio" name="pay" value="cod" checked={f.paymentMethod === 'cod'} onChange={set('paymentMethod')} />
                <span><strong>Cash on delivery</strong><br /><span className="muted" style={{ fontSize: '.9rem' }}>Pay the courier in cash when your order arrives.{q?.codFee ? ` A ${money(q.codFee, currency)} fee applies.` : ''}</span></span></label>
            )}
            <label className={`pay-opt${q?.onlinePaymentAvailable ? '' : ' disabled'}`}><input type="radio" name="pay" value="online" disabled={!q?.onlinePaymentAvailable} checked={f.paymentMethod === 'online'} onChange={set('paymentMethod')} />
              <span><strong>Card / wallet (online)</strong><br /><span className="muted" style={{ fontSize: '.9rem' }}>{q?.onlinePaymentAvailable ? 'You will be redirected to our secure payment page (Paymob).' : 'Online payment is not available yet. Please use cash on delivery.'}</span></span></label>
          </div>
        </fieldset>
      </div>
      <Summary q={q} loading={loading} currency={currency}>
        <div className="mini-lines">
          {cart.map((x) => {
            const l = q?.lines.find((y) => y.variantId === x.variantId);
            return (
              <div className="mini-line" key={x.variantId}>
                {x.image ? <img src={x.image} alt="" /> : <span />}
                <div style={{ minWidth: 0 }}><strong style={{ fontSize: '.9rem' }}>{x.name}</strong> <span className="mono muted">× {x.qty}</span><div className="label" style={{ textTransform: 'none', letterSpacing: '.02em' }}>{x.variantLabel}</div>{l?.error && <div style={{ color: 'var(--bad)', fontSize: '.8rem' }}>{l.error}</div>}</div>
                <span className="mono num" style={{ fontSize: '.86rem' }}>{money((l?.unitPrice ?? x.unitPrice) * x.qty, currency)}</span>
              </div>
            );
          })}
        </div>
        <CodeInput code={code} setCode={setCode} q={q} />
        {formErr && <div className="notice bad" role="alert">{formErr}</div>}
        <button className="btn block" disabled={busy || loading || !q || q.problems.length > 0}>{busy ? 'Placing order…' : f.paymentMethod === 'online' ? `Pay ${q ? money(q.total, currency) : ''}` : `Place order · ${q ? money(q.total, currency) : ''}`}</button>
        <p className="label" style={{ margin: 0, textTransform: 'none', letterSpacing: '.02em' }}>By placing your order you agree to our <Link className="link" href="/policies/terms">terms</Link> and <Link className="link" href="/policies/returns">returns policy</Link>.</p>
        <Link href="/cart" className="link label">← Back to cart</Link>
      </Summary>
    </form>
  );
}
