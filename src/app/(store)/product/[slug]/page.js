import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductCard from '@/components/store/ProductCard';
import ProductView from '@/components/store/ProductView';
import { RecentlyViewed } from '@/components/store/Lists';
import { ReviewForm } from '@/components/store/Forms';
import { getApprovedReviews, getCatalog, getProductBySlug } from '@/lib/catalog';
import { getSettings } from '@/lib/settings';
import { currentAdmin } from '@/lib/auth';

async function load(slug, preview) {
  const admin = preview ? await currentAdmin() : null;
  return getProductBySlug(slug, { includeDrafts: !!admin });
}

export async function generateMetadata({ params, searchParams }) {
  const p = await load(params.slug, searchParams.preview);
  if (!p) return { title: 'Not found' };
  const img = p.images[0]?.url;
  return {
    title: p.seoTitle || p.name,
    description: p.seoDescription || p.description.slice(0, 155),
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.seoTitle || p.name, description: p.seoDescription || p.description, images: img ? [{ url: img }] : undefined, type: 'website' },
    robots: p.status !== 'published' ? { index: false } : undefined,
  };
}

export default async function ProductPage({ params, searchParams }) {
  const p = await load(params.slug, searchParams.preview);
  if (!p) notFound();
  const [{ store, shipping, policies }, reviews, catalog] = await Promise.all([
    getSettings(['store', 'shipping', 'policies']), getApprovedReviews({ productId: p.id, limit: 20 }), getCatalog(),
  ]);
  const related = catalog.filter((x) => x.slug !== p.slug && (x.collections.some((c) => p.collections.includes(c)) || x.frameShape === p.frameShape))
    .sort((a, b) => (b.category === p.category) - (a.category === p.category)).slice(0, 4);
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : null;
  const fees = shipping.regions.map((r) => r.fee);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku, description: p.description,
    image: p.images.map((i) => i.url), brand: { '@type': 'Brand', name: store.name }, category: p.categoryName,
    offers: { '@type': 'AggregateOffer', priceCurrency: store.currency, lowPrice: (p.finalPrice / 100).toFixed(2), highPrice: (p.finalPrice / 100).toFixed(2), offerCount: p.variants.length, availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
    ...(avg ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: avg.toFixed(1), reviewCount: reviews.length } } : {}),
  };

  return (
    <>
      {p.status !== 'published' && <div className="preview-bar">Preview — this product is {p.status} and not visible to customers.</div>}
      <div className="wrap">
        <nav className="crumbs label" aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, paddingTop: 24, flexWrap: 'wrap' }}>
          <Link href="/">Home</Link><span>/</span><Link href="/shop">Shop</Link><span>/</span>
          {p.category && <><Link href={`/shop?category=${p.category}`}>{p.categoryName}</Link><span>/</span></>}<span className="accent">{p.name}</span>
        </nav>
        <ProductView product={p} threshold={store.lowStockThreshold} reviewSummary={avg ? { avg, count: reviews.length } : null}
          shippingNote={`Delivery in 1–6 working days depending on region. Fees from ${store.currency} ${(Math.min(...fees) / 100).toLocaleString('en-US')}${shipping.freeShippingOver ? `, free over ${store.currency} ${(shipping.freeShippingOver / 100).toLocaleString('en-US')}` : ''}.`}
          shippingPolicy={policies.shipping} returnsPolicy={policies.returns} />
      </div>

      <section className="section tight" id="reviews" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="wrap grid12" style={{ alignItems: 'start' }}>
          <div style={{ gridColumn: 'span 12' }}>
            <div className="spread" style={{ marginBottom: 24 }}>
              <h2 className="display-m">Reviews</h2>
              {avg && <p className="mono" style={{ margin: 0 }}><span className="stars">★</span> {avg.toFixed(1)} / 5 · {reviews.length} review{reviews.length > 1 ? 's' : ''}</p>}
            </div>
            {reviews.length ? (
              <div className="reviews">{reviews.map((r) => (
                <figure className="review" key={r.id} style={{ margin: 0 }}>
                  <span className="stars" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}<span className="off">{'★'.repeat(5 - r.rating)}</span></span>
                  {r.title && <strong>{r.title}</strong>}
                  <blockquote style={{ fontSize: '1rem' }}>{r.body}</blockquote>
                  <figcaption className="label">{r.name}{r.city ? ` · ${r.city}` : ''} · {new Date(r.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</figcaption>
                </figure>
              ))}</div>
            ) : <p className="muted">No reviews yet. Be the first to review {p.name}.</p>}
            <details className="accordion" style={{ marginTop: 32 }}><summary>Write a review</summary><div className="body"><ReviewForm productId={p.id} /></div></details>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section tight">
          <div className="wrap">
            <div className="spread" style={{ marginBottom: 28 }}><h2 className="display-m">You may also like</h2><Link href="/shop" className="link label">Shop all →</Link></div>
            <div className="product-grid">{related.map((r, i) => <ProductCard key={r.slug} product={r} index={i} />)}</div>
          </div>
        </section>
      )}
      <RecentlyViewed exclude={p.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </>
  );
}
