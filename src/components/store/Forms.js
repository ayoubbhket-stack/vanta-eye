'use client';
import { useState } from 'react';
import { useStore } from './StoreProvider';

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, ...d };
}

export function NewsletterForm({ id = 'news', dark = false }) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <form className="inline-form" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        const r = await post('/api/newsletter', { email });
        setBusy(false); setMsg(r.ok ? 'You are on the list.' : (r.error || 'Could not subscribe.'));
        if (r.ok) setEmail('');
      }}>
        <label htmlFor={id} className="sr-only">Email address</label>
        <input id={id} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" />
        <button type="submit" disabled={busy}>{busy ? '…' : 'Join'}</button>
      </form>
      <p className="msg" role="status" style={{ fontSize: '.85rem', marginTop: 8, color: dark ? undefined : 'var(--muted)' }}>{msg}</p>
    </div>
  );
}

export function ContactForm() {
  const [f, setF] = useState({ name: '', email: '', phone: '', subject: 'Order question', body: '' });
  const [errs, setErrs] = useState({});
  const [state, setState] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setState('busy');
    const r = await post('/api/contact', f);
    if (r.ok) { setState('sent'); setF({ name: '', email: '', phone: '', subject: 'Order question', body: '' }); setErrs({}); }
    else { setState('error:' + (r.error || 'Could not send.')); setErrs(r.fields || {}); }
  };
  if (state === 'sent') return <div className="notice ok"><strong>Message received.</strong> We reply within one working day.<br /><button className="link" style={{ background: 'none', border: 0, padding: 0, marginTop: 8 }} onClick={() => setState(null)}>Send another message</button></div>;
  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      <Field id="c-name" label="Full name" err={errs.name}><input id="c-name" className="input" value={f.name} onChange={set('name')} required autoComplete="name" /></Field>
      <Field id="c-email" label="Email" err={errs.email}><input id="c-email" type="email" className="input" value={f.email} onChange={set('email')} required autoComplete="email" /></Field>
      <Field id="c-phone" label="Phone (optional)" err={errs.phone}><input id="c-phone" type="tel" className="input" value={f.phone} onChange={set('phone')} autoComplete="tel" /></Field>
      <Field id="c-subject" label="Topic"><select id="c-subject" className="select" value={f.subject} onChange={set('subject')}>
        {['Order question', 'Sizing & fit', 'Prescription lenses', 'Returns', 'Wholesale', 'Other'].map((o) => <option key={o}>{o}</option>)}
      </select></Field>
      <Field id="c-body" label="Message" err={errs.body} full><textarea id="c-body" className="textarea" value={f.body} onChange={set('body')} required /></Field>
      {state?.startsWith('error:') && <div className="notice bad full" role="alert">{state.slice(6)}</div>}
      <div className="full"><button className="btn" disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : 'Send message'}</button></div>
    </form>
  );
}

export function Field({ id, label, err, hint, full, children }) {
  return (
    <div className={`field${err ? ' has-error' : ''}${full ? ' full' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !err && <span className="hint">{hint}</span>}
      {err && <span className="err" id={`${id}-err`} role="alert">{err}</span>}
    </div>
  );
}

export function ReviewForm({ productId }) {
  const { toast } = useStore();
  const [f, setF] = useState({ name: '', city: '', rating: 5, title: '', body: '' });
  const [errs, setErrs] = useState({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (done) return <div className="notice ok">Thanks. Your review will appear after a quick check by our team.</div>;
  return (
    <form className="review-form" noValidate onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      const r = await post('/api/reviews', { ...f, productId });
      setBusy(false);
      if (r.ok) { setDone(true); toast('Review submitted for approval'); } else setErrs(r.fields || { body: r.error });
    }}>
      <div className="field"><span className="lab">Rating</span>
        <div className="rating-input" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} role="radio" aria-checked={f.rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} className={n <= f.rating ? 'on' : ''} onClick={() => setF({ ...f, rating: n })}>★</button>)}
        </div>
      </div>
      <div className="form-grid">
        <Field id="r-name" label="Name" err={errs.name}><input id="r-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field id="r-city" label="City (optional)"><input id="r-city" className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
        <Field id="r-title" label="Title" full><input id="r-title" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field id="r-body" label="Review" err={errs.body} full><textarea id="r-body" className="textarea" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
      </div>
      <div><button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Submit review'}</button></div>
    </form>
  );
}

export function CopyText({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="copy-btn" onClick={() => {
      navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {});
    }}>{done ? 'Copied' : label}</button>
  );
}
