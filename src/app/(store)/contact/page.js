import Link from 'next/link';
import { ContactForm, CopyText } from '@/components/store/Forms';
import { getSettings } from '@/lib/settings';

export const metadata = { title: 'Contact', description: 'Contact VANTA EYE about orders, sizing, prescriptions and returns.', alternates: { canonical: '/contact' } };

export default async function Contact() {
  const { store, contact } = await getSettings(['store', 'contact']);
  const groups = [...new Set(contact.faqs.map((f) => f.group || 'General'))];
  return (
    <>
      <section className="page-head"><div className="wrap spread">
        <div><nav className="crumbs label"><Link href="/">Home</Link><span>/</span><span className="accent">Contact</span></nav><h1 className="display-xl">Talk to us</h1></div>
        <p className="lede" style={{ margin: 0 }}>{contact.intro}</p>
      </div></section>
      <div className="wrap contact-grid">
        <div className="contact-card">
          <div><span className="label">Email</span><div className="row"><a className="big link" href={`mailto:${store.email}`}>{store.email}</a><CopyText text={store.email} /></div></div>
          <div><span className="label">Phone / WhatsApp</span><div className="row"><span className="big num">{store.phone}</span><CopyText text={store.phone} /></div></div>
          <div><span className="label">Showroom</span><p className="muted" style={{ margin: '6px 0 0' }}>{store.address}<br />{store.hours}</p></div>
          <div className="socials">{Object.entries(store.social || {}).filter(([, u]) => u).map(([k, u]) => <a key={k} href={u} target="_blank" rel="noreferrer">{k}</a>)}</div>
          {store.showMap && (
            <a className="map-ph" href={store.mapUrl || '#'} target="_blank" rel="noreferrer" aria-label="Open the showroom location in maps">
              <span className="pin" /><span className="label" style={{ position: 'absolute', bottom: 12, insetInlineStart: 14 }}>Open in maps ↗</span>
            </a>
          )}
        </div>
        <div><h2 className="display-s" style={{ marginBottom: 20 }}>Send a message</h2><ContactForm /></div>
      </div>
      <section className="section" style={{ borderTop: '1px solid var(--line)' }} id="faq">
        <div className="wrap">
          <h2 className="display-l" style={{ marginBottom: 40 }}>Questions</h2>
          {groups.map((g) => (
            <div className="faq-groups" key={g} style={{ marginBottom: 32 }}>
              <span className="label accent">{g}</span>
              <div className="accordion">{contact.faqs.filter((f) => (f.group || 'General') === g).map((f, i) => <details key={i}><summary>{f.q}</summary><div className="body"><p style={{ margin: 0 }}>{f.a}</p></div></details>)}</div>
            </div>
          ))}
          <p className="muted">More detail in our <Link className="link" href="/policies/shipping">shipping policy</Link> and <Link className="link" href="/policies/returns">returns policy</Link>.</p>
        </div>
      </section>
    </>
  );
}
