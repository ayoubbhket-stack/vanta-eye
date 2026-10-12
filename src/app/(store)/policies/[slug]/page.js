import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSetting } from '@/lib/settings';

const TITLES = { shipping: 'Shipping policy', returns: 'Returns policy', privacy: 'Privacy policy', terms: 'Terms & conditions' };

export function generateMetadata({ params }) {
  return TITLES[params.slug] ? { title: TITLES[params.slug], alternates: { canonical: `/policies/${params.slug}` } } : { title: 'Not found' };
}

export default async function Policy({ params }) {
  if (!TITLES[params.slug]) notFound();
  const [policies, shipping, store] = await Promise.all([getSetting('policies'), getSetting('shipping'), getSetting('store')]);
  return (
    <>
      <section className="page-head"><div className="wrap">
        <nav className="crumbs label"><Link href="/">Home</Link><span>/</span><span className="accent">{TITLES[params.slug]}</span></nav>
        <h1 className="display-l">{TITLES[params.slug]}</h1>
        <nav className="row" style={{ marginTop: 24 }}>{Object.entries(TITLES).map(([k, t]) => <Link key={k} href={`/policies/${k}`} className={`chip${k === params.slug ? ' on' : ''}`}>{t}</Link>)}</nav>
      </div></section>
      <div className="wrap"><div className="policy prose">
        {(policies[params.slug] || '').split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        {params.slug === 'shipping' && (
          <div style={{ overflowX: 'auto', marginTop: 32 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.95rem' }}>
              <thead><tr className="label" style={{ textAlign: 'start' }}><th style={{ textAlign: 'start', padding: '10px 0' }}>Region</th><th style={{ textAlign: 'start' }}>Delivery</th><th style={{ textAlign: 'end' }}>Fee</th></tr></thead>
              <tbody>{shipping.regions.map((r) => <tr key={r.name} style={{ borderTop: '1px solid var(--line)' }}><td style={{ padding: '12px 0' }}>{r.name}</td><td className="muted">{r.days} working days</td><td className="mono" style={{ textAlign: 'end' }}>{store.currency} {(r.fee / 100).toLocaleString('en-US')}</td></tr>)}</tbody>
            </table>
            {shipping.freeShippingOver > 0 && <p className="muted" style={{ marginTop: 16 }}>Free shipping on orders over {store.currency} {(shipping.freeShippingOver / 100).toLocaleString('en-US')}.</p>}
          </div>
        )}
      </div></div>
    </>
  );
}
