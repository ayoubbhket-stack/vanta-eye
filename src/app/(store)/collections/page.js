import Link from 'next/link';
import ProductCard from '@/components/store/ProductCard';
import { getCollections } from '@/lib/catalog';

export const metadata = {
  title: 'Collections',
  description: 'Signature, Sport, Minimal, Retro and Limited Edition eyewear collections.',
  alternates: { canonical: '/collections' },
};

function Products({ c, n = 3 }) {
  if (!c.products.length) return <p className="muted">New frames for this collection are coming soon.</p>;
  return <div className="product-grid three col-products">{c.products.slice(0, n).map((p, i) => <ProductCard key={p.slug} product={p} index={i} />)}</div>;
}
const Cta = ({ c, ghost }) => <Link className={`btn${ghost ? ' ghost' : ''}`} href={`/shop?collection=${c.slug}`}>Shop {c.name} · {c.products.length} <span className="arrow">→</span></Link>;
const Img = ({ c, p = 0.12 }) => c.coverUrl ? <img src={c.coverUrl} alt={`${c.name} collection campaign image`} loading="lazy" data-parallax={p} /> : null;

// Each collection theme gets its own composition.
const LAYOUTS = {
  signature: (c, i) => (
    <section className="col-section col-signature" key={c.slug} id={c.slug}>
      <div className="wrap">
        <div className="grid12" style={{ alignItems: 'end' }}>
          <div className="img" data-reveal><Img c={c} /></div>
          <div className="txt stack" data-reveal style={{ gap: 18 }}>
            <span className="col-num">{String(i + 1).padStart(2, '0')} — {c.tagline}</span>
            <h2>{c.name}</h2><p className="lede">{c.description}</p><Cta c={c} />
          </div>
        </div>
        <Products c={c} />
      </div>
    </section>
  ),
  sport: (c, i) => (
    <section className="col-section col-sport" key={c.slug} id={c.slug}>
      <div className="wrap">
        <div className="spread"><span className="col-num" style={{ color: 'var(--accent-ink)' }}>{String(i + 1).padStart(2, '0')} — {c.tagline}</span><Cta c={c} /></div>
        <h2 data-reveal>{c.name}</h2>
        <div className="img" data-reveal><Img c={c} p={0.2} /></div>
        <p className="lede muted" style={{ marginTop: 24 }}>{c.description}</p>
        <Products c={c} />
      </div>
    </section>
  ),
  minimal: (c, i) => (
    <section className="col-section col-minimal" key={c.slug} id={c.slug}>
      <div className="wrap center">
        <span className="col-num">{String(i + 1).padStart(2, '0')}</span>
        <h2 data-reveal>{c.name.toLowerCase()}</h2>
        <p className="muted" style={{ maxWidth: '44ch' }}>{c.description}</p>
        <div className="img" data-reveal><Img c={c} p={0.06} /></div>
        <Cta c={c} ghost />
      </div>
      <div className="wrap"><Products c={c} /></div>
    </section>
  ),
  retro: (c, i) => (
    <section className="col-section col-retro" key={c.slug} id={c.slug}>
      <div className="stripes" aria-hidden="true" />
      <div className="wrap">
        <div className="grid12" style={{ alignItems: 'center' }}>
          <div className="txt stack" data-reveal style={{ gap: 18 }}>
            <span className="col-num">{String(i + 1).padStart(2, '0')} — {c.tagline}</span>
            <h2>{c.name}</h2><p className="lede">{c.description}</p><Cta c={c} />
          </div>
          <div className="img" data-reveal><Img c={c} /></div>
        </div>
        <Products c={c} />
      </div>
    </section>
  ),
  limited: (c, i) => (
    <section className="col-section col-limited" key={c.slug} id={c.slug}>
      <div className="wrap">
        <div className="spread">
          <div><span className="col-num">{String(i + 1).padStart(2, '0')} — {c.tagline}</span><h2 data-reveal>{c.name}</h2></div>
          <div style={{ textAlign: 'end' }}><div className="counter num">{String(c.products.filter((p) => p.inStock).length).padStart(2, '0')}/{String(c.products.length).padStart(2, '0')}</div><span className="label">runs still available</span></div>
        </div>
        <div className="img" data-reveal><Img c={c} p={0.15} /></div>
        <div className="spread"><p className="lede">{c.description}</p><Cta c={c} /></div>
        <Products c={c} />
      </div>
    </section>
  ),
};

export default async function Collections() {
  const cols = await getCollections();
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs label"><Link href="/">Home</Link><span>/</span><span className="accent">Collections</span></nav>
          <h1 className="display-xl">Collections</h1>
          <nav className="row" style={{ marginTop: 28 }} aria-label="Jump to collection">
            {cols.map((c) => <a key={c.slug} href={`#${c.slug}`} className="chip">{c.name} <span className="mono">{c.products.length}</span></a>)}
          </nav>
        </div>
      </section>
      {cols.length ? cols.map((c, i) => (LAYOUTS[c.theme] || LAYOUTS.signature)(c, i)) : <div className="wrap empty"><p className="muted">No collections are published yet.</p></div>}
    </>
  );
}
