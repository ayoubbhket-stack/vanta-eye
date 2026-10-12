'use client';
import { F, SingleImage, Toggle } from './ui';
import { SaveBar, useSaver } from './ContentEditor';

const egp = (p) => (p == null || p === '' ? '' : Number(p) / 100);
const pi = (v) => Math.round(Number(String(v).replace(/[^\d.]/g, '') || 0) * 100);

export default function SettingsEditor({ tab, store, shipping, status }) {
  if (tab === 'shipping') return <ShippingEditor initial={shipping} />;
  if (tab === 'integrations') return <Integrations status={status} />;
  return <StoreEditor tab={tab} initial={store} paymob={status.paymob} email={status.email} />;
}

function StoreEditor({ tab, initial, paymob, email }) {
  const s = useSaver('/api/admin/settings', 'store', initial);
  const { v, update } = s;
  const bind = (path, label, opts = {}) => {
    const get = path.split('.').reduce((o, k) => o?.[k], v) ?? '';
    const id = `s-${path}`;
    const set = (val) => update((x) => { const ks = path.split('.'); let o = x; ks.slice(0, -1).forEach((k) => { o = o[k]; }); o[ks.at(-1)] = val; return x; });
    return <F id={id} label={label} hint={opts.hint} full={opts.full} err={s.errs[path]}><input id={id} type={opts.type || 'text'} className={`input${opts.mono ? ' mono' : ''}`} value={get} onChange={(e) => set(opts.num ? Number(e.target.value) : e.target.value)} /></F>;
  };
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {tab === 'general' && (
        <>
          <section className="panel"><div className="ph"><h2>Brand</h2></div><div className="pb form-grid">
            {bind('name', 'Store name', { hint: 'Shown in the header, footer, emails and page titles.' })}{bind('tagline', 'Tagline')}
            {bind('currency', 'Currency code', { mono: true, hint: 'EGP. Prices are entered in this currency.' })}
            {bind('lowStockThreshold', 'Low-stock threshold (units)', { type: 'number', num: true })}
            <div className="full"><SingleImage label="Logo (optional; replaces the default mark)" value={v.logoMediaId} onChange={(id) => update((x) => { x.logoMediaId = id; return x; })} /></div>
          </div></section>
          <section className="panel"><div className="ph"><h2>Contact details</h2></div><div className="pb form-grid">
            {bind('email', 'Email', { type: 'email' })}{bind('phone', 'Phone')}{bind('whatsapp', 'WhatsApp')}{bind('hours', 'Opening hours')}
            {bind('address', 'Address', { full: true })}
            <div className="full"><Toggle id="map" label="Show store location section on the contact page" checked={v.showMap} onChange={(x) => update((d) => { d.showMap = x; return d; })} /></div>
            {bind('mapUrl', 'Map link (Google Maps URL)', { full: true })}
          </div></section>
          <section className="panel"><div className="ph"><h2>Social links</h2></div><div className="pb form-grid">
            {bind('social.instagram', 'Instagram')}{bind('social.facebook', 'Facebook')}{bind('social.tiktok', 'TikTok')}{bind('social.x', 'X')}
          </div></section>
          <section className="panel"><div className="ph"><h2>Search engines (homepage)</h2></div><div className="pb form-grid">
            {bind('seoTitle', `SEO title (${v.seoTitle.length}/70)`, { full: true })}{bind('seoDescription', `Meta description (${v.seoDescription.length}/170)`, { full: true })}
          </div></section>
        </>
      )}
      {tab === 'payments' && (
        <>
          <section className="panel"><div className="ph"><h2>Payment methods</h2></div><div className="pb stack" style={{ gap: 16 }}>
            {s.errs.paymentMethods && <div className="notice bad">{s.errs.paymentMethods}</div>}
            <Toggle id="cod" label="Cash on delivery" checked={v.paymentMethods.cod} onChange={(x) => update((d) => { d.paymentMethods.cod = x; return d; })} />
            <F id="codfee" label="Cash on delivery fee (EGP)" hint="0 for no fee"><input id="codfee" className="input mono" inputMode="decimal" value={egp(v.codFee)} onChange={(e) => update((d) => { d.codFee = pi(e.target.value); return d; })} style={{ maxWidth: 200 }} /></F>
            <Toggle id="online" label="Online card / wallet payments (Paymob)" checked={v.paymentMethods.online} onChange={(x) => update((d) => { d.paymentMethods.online = x; return d; })} />
            <div className={`notice${paymob ? ' ok' : ' bad'}`}>{paymob ? 'Paymob credentials are configured on the server. Online payment shows at checkout when enabled above.' : 'Paymob is not connected. Online payment stays hidden at checkout until PAYMOB_* environment variables are set on the server (see README).'}</div>
          </div></section>
          <section className="panel"><div className="ph"><h2>Tax</h2></div><div className="pb form-grid">
            <F id="taxr" label="Tax rate (%)"><input id="taxr" className="input mono" inputMode="decimal" value={v.taxRate} onChange={(e) => update((d) => { d.taxRate = Number(e.target.value.replace(/[^\d.]/g, '')); return d; })} /></F>
            {bind('taxLabel', 'Label shown at checkout')}
            <div className="full"><Toggle id="taxinc" label="Catalogue prices already include tax" checked={v.taxIncluded} onChange={(x) => update((d) => { d.taxIncluded = x; return d; })} /></div>
            <p className="muted full" style={{ margin: 0, fontSize: '.85rem' }}>{v.taxIncluded ? 'Tax is shown for information only; totals do not change.' : `Tax of ${v.taxRate}% is added on top of the discounted subtotal at checkout.`} Confirm your obligations with your accountant.</p>
          </div></section>
        </>
      )}
      {tab === 'notifications' && (
        <section className="panel"><div className="ph"><h2>Order notifications</h2><span className={`pill ${email ? 'ok' : 'bad'}`}>{email ? 'Email provider connected' : 'Email provider not connected'}</span></div><div className="pb stack" style={{ gap: 14 }}>
          {!email && <div className="notice">Emails are only sent after RESEND_API_KEY and MAIL_FROM are set on the server. Until then these preferences are saved but nothing is sent.</div>}
          {bind('notifyEmail', 'Send new-order alerts to', { type: 'email', hint: 'Leave empty to turn off staff alerts.' })}
          <Toggle id="non" label="Email staff when a new order is placed" checked={v.notifyOnNewOrder} onChange={(x) => update((d) => { d.notifyOnNewOrder = x; return d; })} />
          <Toggle id="ncs" label="Email customers when their order is confirmed, shipped, delivered or cancelled" checked={v.notifyCustomerOnStatus} onChange={(x) => update((d) => { d.notifyCustomerOnStatus = x; return d; })} />
        </div></section>
      )}
      <SaveBar {...s} />
    </div>
  );
}

function ShippingEditor({ initial }) {
  const s = useSaver('/api/admin/settings', 'shipping', initial);
  const { v, update } = s;
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section className="panel"><div className="ph"><h2>Free shipping</h2></div><div className="pb">
        <F id="free" label="Free shipping on orders over (EGP)" hint="0 turns free shipping off. Applied after discounts."><input id="free" className="input mono" inputMode="decimal" style={{ maxWidth: 220 }} value={egp(v.freeShippingOver)} onChange={(e) => update((d) => { d.freeShippingOver = pi(e.target.value); return d; })} /></F>
      </div></section>
      <section className="panel"><div className="ph"><h2>Delivery regions</h2><button className="btn small ghost" onClick={() => update((d) => { d.regions.push({ name: 'New region', fee: 8000, days: '2–4', cities: ['Other'] }); return d; })}>+ Region</button></div>
        <div className="pb flush tbl-wrap"><table className="tbl variant-tbl">
          <thead><tr><th>Region</th><th>Fee (EGP)</th><th>Delivery days</th><th>Cities (comma-separated)</th><th></th></tr></thead>
          <tbody>{v.regions.map((r, i) => (
            <tr key={i}>
              <td><input className="input" aria-label="Region name" value={r.name} onChange={(e) => update((d) => { d.regions[i].name = e.target.value; return d; })} /></td>
              <td><input className="input mono" aria-label="Fee" inputMode="decimal" style={{ width: 100 }} value={egp(r.fee)} onChange={(e) => update((d) => { d.regions[i].fee = pi(e.target.value); return d; })} /></td>
              <td><input className="input" aria-label="Days" style={{ width: 90 }} value={r.days} onChange={(e) => update((d) => { d.regions[i].days = e.target.value; return d; })} /></td>
              <td style={{ minWidth: 280 }}><input className="input" aria-label="Cities" value={r.cities.join(', ')} onChange={(e) => update((d) => { d.regions[i].cities = e.target.value.split(',').map((x) => x.trim()).filter(Boolean); return d; })} /></td>
              <td><button className="icon-btn" aria-label="Remove region" onClick={() => update((d) => { d.regions.splice(i, 1); return d; })}>✕</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
      <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>No shipping provider is connected; fees are charged as configured here and deliveries are arranged by your team. To connect a courier (e.g. Bosta), see the README.</p>
      <SaveBar {...s} />
    </div>
  );
}

function Integrations({ status }) {
  const Row = ({ name, ok, desc, how }) => (
    <div className="int-row"><div style={{ maxWidth: 640 }}><strong>{name}</strong><p className="muted" style={{ margin: '4px 0 0', fontSize: '.88rem' }}>{desc}</p>{!ok && how && <p className="mono" style={{ margin: '6px 0 0', fontSize: '.78rem', color: 'var(--muted)' }}>{how}</p>}</div><span className={`pill ${ok ? 'ok' : 'bad'}`}>{ok ? 'Connected' : 'Not connected'}</span></div>
  );
  return (
    <section className="panel"><div className="ph"><h2>Integrations</h2><span className="label">Read from server environment variables</span></div><div className="pb">
      <div className="int-row"><div><strong>Database</strong><p className="muted" style={{ margin: '4px 0 0', fontSize: '.88rem' }}>{status.db}</p></div><span className={`pill ${status.db.startsWith('PostgreSQL') ? 'ok' : 'low'}`}>{status.db.startsWith('PostgreSQL') ? 'Production' : 'Development'}</span></div>
      <Row name="Paymob online payments" ok={status.paymob} desc="Card and wallet payments. Orders are marked paid only after a signed Paymob callback." how="Set PAYMOB_SECRET_KEY, PAYMOB_PUBLIC_KEY, PAYMOB_INTEGRATION_ID, PAYMOB_HMAC_SECRET" />
      <Row name="Email (Resend)" ok={status.email} desc="New-order alerts and customer order updates." how="Set RESEND_API_KEY and MAIL_FROM" />
      <Row name="Shipping provider" ok={false} desc="Not integrated. Shipping fees come from your delivery regions; create shipments in your courier’s dashboard." />
      <Row name="SMS / WhatsApp messages" ok={false} desc="Not integrated. Customer phone numbers are available on each order for manual contact." />
      <div className="int-row"><div><strong>Site URL</strong><p className="muted" style={{ margin: '4px 0 0', fontSize: '.88rem' }}>{status.siteUrl || 'Not set — detected from each request. Set SITE_URL in production for payment callbacks and the sitemap.'}</p></div><span className={`pill ${status.siteUrl ? 'ok' : 'low'}`}>{status.siteUrl ? 'Set' : 'Auto'}</span></div>
      <div className="int-row"><div><strong>First-time setup page</strong><p className="muted" style={{ margin: '4px 0 0', fontSize: '.88rem' }}>/admin/setup is permanently disabled once an admin exists. You can remove SETUP_TOKEN from the environment.</p></div><span className={`pill ${status.setupToken ? 'low' : 'ok'}`}>{status.setupToken ? 'Token still set' : 'Token removed'}</span></div>
    </div></section>
  );
}
