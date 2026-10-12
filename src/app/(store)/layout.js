import Link from 'next/link';
import { StoreProvider } from '@/components/store/StoreProvider';
import Header from '@/components/store/Header';
import { CartDrawer, QuickView, Toasts } from '@/components/store/Overlays';
import { Cursor, Loader, MotionLayer, RouteProgress } from '@/components/store/Effects';
import { NewsletterForm } from '@/components/store/Forms';
import { LogoMark } from '@/components/store/Icons';
import { getSettings } from '@/lib/settings';
import { getCollections } from '@/lib/catalog';
import { mediaUrl } from '@/lib/catalog';

export default async function StoreLayout({ children }) {
  const { store, home, footer } = await getSettings(['store', 'home', 'footer']);
  const collections = await getCollections();
  const a = home.announcement;
  return (
    <StoreProvider currency={store.currency}>
      <a href="#main" className="skip">Skip to content</a>
      <Loader />
      <RouteProgress />
      {a?.enabled && a.text && (
        <div className="announce"><Link href={a.href || '/shop'}><span className="track"><span>{a.text}</span><span aria-hidden="true">{a.text}</span><span aria-hidden="true">{a.text}</span></span></Link></div>
      )}
      <Header storeName={store.name} logoUrl={mediaUrl(store.logoMediaId)} social={store.social} />
      <main id="main">{children}</main>
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">
            <div className="stack" style={{ gap: 14 }}>
              <Link href="/" className="logo"><LogoMark />{store.name}</Link>
              <p className="muted" style={{ maxWidth: '36ch' }}>{footer.about}</p>
              <div className="socials">{Object.entries(store.social || {}).filter(([, u]) => u).map(([k, u]) => <a key={k} href={u} target="_blank" rel="noreferrer">{k}</a>)}</div>
            </div>
            <div><h3>Shop</h3><ul>
              <li><Link href="/shop">All frames</Link></li>
              <li><Link href="/shop?category=sunglasses">Sunglasses</Link></li>
              <li><Link href="/shop?category=eyeglasses">Eyeglasses</Link></li>
              <li><Link href="/shop?sort=newest">New arrivals</Link></li>
              <li><Link href="/wishlist">Wishlist</Link></li>
            </ul></div>
            <div><h3>Collections</h3><ul>
              {collections.map((c) => <li key={c.slug}><Link href={`/shop?collection=${c.slug}`}>{c.name}</Link></li>)}
            </ul></div>
            <div><h3>Help</h3><ul>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/policies/shipping">Shipping</Link></li>
              <li><Link href="/policies/returns">Returns</Link></li>
              <li><Link href="/policies/privacy">Privacy policy</Link></li>
              <li><Link href="/policies/terms">Terms &amp; conditions</Link></li>
              <li><Link href="/about">About</Link></li>
            </ul></div>
            <div className="stack" style={{ gap: 10 }}>
              <h3 style={{ marginBottom: 0 }}>{footer.newsletterTitle}</h3>
              <p className="muted" style={{ margin: 0 }}>{footer.newsletterText}</p>
              <NewsletterForm id="footer-news" />
              <p className="muted" style={{ fontSize: '.88rem', marginTop: 8 }}>{store.email}<br />{store.phone}</p>
            </div>
          </div>
          <div className="footer-word" aria-hidden="true">{store.name}</div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} {footer.copyright}</span>
            <span className="mono">Prices in {store.currency} · Delivery across Egypt</span>
          </div>
        </div>
      </footer>
      <CartDrawer />
      <QuickView threshold={store.lowStockThreshold} />
      <Toasts />
      <MotionLayer />
      <Cursor />
    </StoreProvider>
  );
}
