import Link from 'next/link';
import ProductCard from '@/components/store/ProductCard';
import ShopControls from '@/components/store/ShopControls';
import { facetOptions, filterProducts, getCatalog, getCategories, getCollections } from '@/lib/catalog';

const PAGE = 12;

export async function generateMetadata({ searchParams }) {
  const cats = await getCategories();
  const cols = await getCollections();
  const c = cats.find((x) => x.slug === searchParams.category);
  const col = cols.find((x) => x.slug === searchParams.collection);
  const title = col ? `${col.name} Collection` : c ? c.name : searchParams.q ? `Search: ${searchParams.q}` : 'Shop all eyewear';
  return {
    title,
    description: col?.description || c?.description || 'Sunglasses and eyeglasses with filters for shape, frame colour, lens colour and price. Delivery across Egypt.',
    alternates: { canonical: col ? `/shop?collection=${col.slug}` : c ? `/shop?category=${c.slug}` : '/shop' },
    robots: searchParams.q ? { index: false } : undefined,
  };
}

export default async function Shop({ searchParams }) {
  const [catalog, categories, collections] = await Promise.all([getCatalog(), getCategories(), getCollections()]);
  const results = filterProducts(catalog, searchParams);
  const page = Math.max(1, Number(searchParams.page) || 1);
  const shown = results.slice(0, page * PAGE);
  const facets = facetOptions(catalog);
  const view = searchParams.view === 'list' ? 'list' : 'grid';
  const col = collections.find((c) => c.slug === searchParams.collection);
  const cat = categories.find((c) => c.slug === searchParams.category);
  const heading = col ? col.name : cat ? cat.name : searchParams.q ? `“${searchParams.q}”` : 'All eyewear';

  // counts per option under the current query (ignoring that option's own filter)
  const countFor = (key, value) => filterProducts(catalog, { ...searchParams, [key]: value }).length;
  const counts = {
    category: Object.fromEntries(categories.map((c) => [c.slug, countFor('category', c.slug)])),
    collection: Object.fromEntries(collections.map((c) => [c.slug, countFor('collection', c.slug)])),
    shape: Object.fromEntries(facets.shapes.map((s) => [s, countFor('shape', s)])),
  };

  const nextParams = new URLSearchParams(Object.entries(searchParams).filter(([, v]) => v));
  nextParams.set('page', String(page + 1));

  return (
    <>
      <section className="page-head">
        <div className="wrap spread">
          <div>
            <nav className="crumbs label" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/shop">Shop</Link>{(col || cat) && <><span>/</span><span className="accent">{heading}</span></>}</nav>
            <h1 className="display-l">{heading}</h1>
          </div>
          <p className="lede" style={{ margin: 0 }}>{col?.description || cat?.description || 'Every frame we make. Filter by shape, colour, lens and price.'}</p>
        </div>
      </section>
      <div className="wrap">
        <ShopControls
          params={searchParams}
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          collections={collections.map((c) => ({ slug: c.slug, name: c.name }))}
          facets={facets} counts={counts} total={results.length} view={view}
        >
          {shown.length > 0 ? (
            <>
              <div className={`product-grid${view === 'list' ? ' list' : ''}`}>
                {shown.map((p, i) => <ProductCard key={p.slug} product={p} index={i} priority={i < 4} />)}
              </div>
              <div className="stack" style={{ alignItems: 'center', marginTop: 48, gap: 12 }}>
                <p className="label num">Showing {shown.length} of {results.length}</p>
                {shown.length < results.length && <Link className="btn ghost" href={`/shop?${nextParams}`} scroll={false}>Load more</Link>}
              </div>
            </>
          ) : (
            <div className="empty">
              <svg className="glyph" viewBox="0 0 120 50" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="30" cy="25" r="18" /><circle cx="90" cy="25" r="18" /><path d="M48 22c8-5 16-5 24 0" /><path d="M20 15l20 20M40 15 20 35" /></svg>
              <h2 className="display-s">No frames match these filters</h2>
              <p className="muted">Try removing a filter or searching for a colour or shape.</p>
              <Link className="btn" href="/shop">Clear all filters</Link>
            </div>
          )}
        </ShopControls>
      </div>
    </>
  );
}
