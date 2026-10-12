import Link from 'next/link';
import ProductCard from '@/components/store/ProductCard';
import { HomeHero, ShapeCompare, Showcase, Spotlight } from '@/components/store/HomeClient';
import { NewsletterForm } from '@/components/store/Forms';
import { getApprovedReviews, getBestSellers, getCatalog, getCollections, mediaUrl } from '@/lib/catalog';
import { getSettings } from '@/lib/settings';
import { formatMoney } from '@/lib/money';

export async function generateMetadata() {
  const { store } = await getSettings(['store']);
  return { title: { absolute: store.seoTitle }, description: store.seoDescription, alternates: { canonical: '/' } };
}

export default async function Home() {
  const { home, store } = await getSettings(['home', 'store']);
  const [catalog, collections, reviews] = await Promise.all([getCatalog(), getCollections(), getApprovedReviews({ limit: 6 })]);
  const best = await getBestSellers(5, home.bestsellerSlugs);
  const featured = (home.featuredProductSlugs?.length
    ? home.featuredProductSlugs.map((s) => catalog.find((p) => p.slug === s)).filter(Boolean)
    : catalog.filter((p) => p.featured)).slice(0, 6);
  const arrivals = catalog.filter((p) => p.newArrival).slice(0, 4);
  const heroProduct = catalog.find((p) => p.frameShape === home.hero.modelShape) || catalog[0];
  const sizeNote = heroProduct?.specs?.lensWidth ? `${parseInt(heroProduct.specs.lensWidth, 10)}□${parseInt(heroProduct.specs.bridge, 10)} ${parseInt(heroProduct.specs.temple, 10)}` : '58□14 145';
  const homeCollections = collections.filter((c) => c.featuredHome);
  const cur = store.currency;

  const sections = {
    promo: (s) => (
      <div className="wrap" key="promo"><div className="promo" data-reveal>
        <span className="tag">Now</span>
        <div><span className="display-s">{s.title}</span> <span className="muted">{s.text}</span></div>
        {s.href && <Link className="btn small ghost" href={s.href}>{s.label || 'Shop now'}</Link>}
      </div></div>
    ),
    featured: (s) => featured.length > 0 && (
      <section className="section" key="featured" aria-label={s.title}>
        <div className="wrap">
          <div className="section-head" data-reveal>
            <div><p className="label accent">Selected</p><h2 className="display-l" style={{ marginTop: 10 }}>{s.title}</h2></div>
            <div className="stack" style={{ gap: 14, justifyItems: 'end' }}><p className="lede" style={{ margin: 0 }}>{s.text}</p><Link className="link label" href="/shop?sort=featured">All frames →</Link></div>
          </div>
          <div className="product-grid three">{featured.map((p, i) => <ProductCard key={p.slug} product={p} index={i} />)}</div>
        </div>
      </section>
    ),
    collections: (s) => homeCollections.length > 0 && (
      <section className="section tight" key="collections" aria-label={s.title}>
        <div className="wrap">
          <div className="spread" style={{ marginBottom: 28 }} data-reveal><h2 className="display-m">{s.title}</h2><p className="muted" style={{ margin: 0 }}>{s.text}</p></div>
          <div className="col-mosaic">
            {homeCollections.slice(0, 5).map((c, i) => (
              <Link key={c.slug} href={`/shop?collection=${c.slug}`} className="col-tile" data-reveal style={{ '--d': `${i * 80}ms` }}>
                {c.coverUrl && <img src={c.coverUrl} alt="" loading="lazy" />}
                <div className="in"><div><span className="label">{c.tagline}</span><h3>{c.name}</h3></div><span className="label num">{c.products.length} frames</span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),
    showcase: (s) => <Showcase key="showcase" products={catalog.slice(0, 12)} title={s.title} text={s.text} />,
    philosophy: (s) => (
      <section className="section" key="philosophy" aria-label={s.title}>
        <div className="wrap philo">
          <p className="big" data-reveal>{s.title}. <em>{s.text.split('.')[0]}.</em></p>
          <div className="side" data-reveal>
            <p className="muted" style={{ margin: 0 }}>{s.text.split('.').slice(1).join('.').trim()}</p>
            <dl className="spec-list">
              <div><dt>UV protection</dt><dd>UV400 / 100%</dd></div>
              <div><dt>Frame notation</dt><dd>{sizeNote}</dd></div>
              <div><dt>Shapes</dt><dd>{new Set(catalog.map((p) => p.frameShape)).size}</dd></div>
              <div><dt>Delivery</dt><dd>All governorates</dd></div>
            </dl>
            <Link href="/about" className="link label">Our approach →</Link>
          </div>
        </div>
      </section>
    ),
    shapes: (s) => <ShapeCompare key="shapes" shapes={[...new Set(catalog.map((p) => p.frameShape))]} title={s.title} text={s.text} />,
    spotlight: (s) => {
      const p = catalog.find((x) => x.slug === s.productSlug) || featured[0];
      return p ? <Spotlight key="spotlight" product={p} title={s.title} text={s.text} /> : null;
    },
    campaign: (s) => {
      const imgs = (home.campaignImages || []).map(mediaUrl);
      return imgs.length > 0 && (
        <section className="section" key="campaign" aria-label={s.title} style={{ overflow: 'hidden' }}>
          <div className="wrap campaign" style={{ position: 'relative', isolation: 'isolate' }}>
            <figure className="tall" style={{ margin: 0 }}><img src={imgs[0]} alt="Campaign image: sport shield and orange frame" loading="lazy" data-parallax="0.12" /></figure>
            {imgs[1] && <figure className="wide" style={{ margin: 0 }}><img src={imgs[1]} alt="Campaign image: cat-eye frame with orange mirror lens" loading="lazy" data-parallax="0.18" /></figure>}
            <div className="copy" data-reveal><p className="label accent">Campaign</p><h2 className="display-l" style={{ marginBlock: '10px 16px' }}>{s.title}</h2><p className="lede">{s.text}</p><Link className="btn ghost" href="/collections">See the collections</Link></div>
            <span className="huge" aria-hidden="true">{s.title}</span>
          </div>
        </section>
      );
    },
    bestsellers: (s) => best.length > 0 && (
      <section className="section" key="bestsellers" aria-label={s.title} style={{ borderTop: '1px solid var(--line)' }}>
        <div className="wrap grid12" style={{ alignItems: 'start' }}>
          <div style={{ gridColumn: 'span 12' }} data-reveal><p className="label accent">{s.text}</p><h2 className="display-l" style={{ marginTop: 10 }}>{s.title}</h2></div>
          <ol style={{ gridColumn: '1 / -1', listStyle: 'none', margin: '24px 0 0', padding: 0, borderTop: '1px solid var(--line)' }}>
            {best.map((p, i) => (
              <li key={p.slug} data-reveal style={{ borderBottom: '1px solid var(--line)' }}>
                <Link href={`/product/${p.slug}`} className="best-row">
                  <span className="mono accent rank">{String(i + 1).padStart(2, '0')}</span>
                  <img src={p.images[0]?.url} alt="" loading="lazy" />
                  <span className="display-s">{p.name}</span>
                  <span className="label shape">{p.frameShape}</span>
                  <span className="price num">{formatMoney(p.finalPrice, cur)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>
    ),
    newarrivals: (s) => arrivals.length > 0 && (
      <section className="section" key="newarrivals" aria-label={s.title}>
        <div className="wrap">
          <div className="spread" style={{ marginBottom: 32 }} data-reveal><div><p className="label accent">{s.text}</p><h2 className="display-l" style={{ marginTop: 10 }}>{s.title}</h2></div><Link className="btn ghost" href="/shop?sort=newest">All new arrivals</Link></div>
          <div className="product-grid">{arrivals.map((p, i) => <ProductCard key={p.slug} product={p} index={i} />)}</div>
        </div>
      </section>
    ),
    reviews: (s) => reviews.length > 0 && (
      <section className="section" key="reviews" aria-label={s.title}>
        <div className="wrap">
          <div className="section-head" data-reveal><h2 className="display-l">{s.title}</h2><p className="lede">{s.text}</p></div>
          <div className="reviews">
            {reviews.map((r) => (
              <figure className="review" key={r.id} data-reveal style={{ margin: 0 }}>
                <span className="stars" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}<span className="off">{'★'.repeat(5 - r.rating)}</span></span>
                <blockquote>“{r.body}”</blockquote>
                <figcaption className="label">{r.name}{r.city ? ` · ${r.city}` : ''} — <Link className="accent" href={`/product/${r.productSlug}`}>{r.productName}</Link></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    ),
    newsletter: (s) => (
      <section className="section tight" key="newsletter" aria-label={s.title}>
        <div className="wrap"><div className="newsletter" data-reveal>
          <div><p className="label" style={{ color: 'rgba(0,0,0,.65)' }}>Newsletter</p><h2>{s.title}</h2></div>
          <div><p>{s.text}</p><NewsletterForm id="home-news" dark /></div>
        </div></div>
      </section>
    ),
  };

  return (
    <>
      <HomeHero hero={home.hero} poster={mediaUrl(home.hero.imageMediaId)} sizeNote={sizeNote} />
      {home.sections.filter((s) => s.enabled && sections[s.key]).map((s) => sections[s.key](s))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: store.name, email: store.email, telephone: store.phone, sameAs: Object.values(store.social || {}).filter(Boolean) }) }} />
    </>
  );
}
