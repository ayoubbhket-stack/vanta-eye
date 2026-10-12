'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useStore, money } from './StoreProvider';
import { BagIcon, CloseIcon, HeartIcon, LogoMark, MenuIcon, SearchIcon } from './Icons';

const NAV = [['/', 'Home'], ['/shop', 'Shop'], ['/collections', 'Collections'], ['/about', 'About'], ['/contact', 'Contact']];

export default function Header({ storeName, logoUrl, social }) {
  const path = usePathname();
  const { count, wish, bump, setDrawer } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    const on = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setHidden(y > 400 && y > last.current + 4);
      if (y < last.current - 4) setHidden(false);
      last.current = y;
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { setMenu(false); setSearch(false); }, [path]);
  useEffect(() => {
    document.body.style.overflow = menu || search ? 'hidden' : '';
    const k = (e) => { if (e.key === 'Escape') { setMenu(false); setSearch(false); } if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearch(true); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [menu, search]);

  const isActive = (href) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <>
      <header className={`site-header${scrolled ? ' scrolled' : ''}${hidden && !menu ? ' hide' : ''}`}>
        <div className="wrap">
          <Link href="/" className="logo" aria-label={`${storeName} home`}>
            {logoUrl ? <img src={logoUrl} alt="" /> : <LogoMark />}<span>{storeName}</span>
          </Link>
          <nav className="nav" aria-label="Main">
            {NAV.map(([href, label]) => <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}>{label}</Link>)}
          </nav>
          <div className="header-actions">
            <button className="icon-btn" aria-label="Search products" onClick={() => setSearch(true)}><SearchIcon /></button>
            <Link className="icon-btn" href="/wishlist" aria-label={`Wishlist, ${wish.length} items`}><HeartIcon />{wish.length > 0 && <span className="badge">{wish.length}</span>}</Link>
            <button className="icon-btn" aria-label={`Cart, ${count} items`} onClick={() => setDrawer(true)}>
              <BagIcon />{count > 0 && <span key={bump} className="badge bump num">{count}</span>}
            </button>
            <button className="icon-btn menu-btn" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)}><MenuIcon /></button>
          </div>
        </div>
      </header>

      <div className={`mobile-menu${menu ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!menu}>
        <div className="spread" style={{ alignItems: 'center' }}>
          <span className="logo"><LogoMark /> {storeName}</span>
          <button className="icon-btn" aria-label="Close menu" onClick={() => setMenu(false)} tabIndex={menu ? 0 : -1}><CloseIcon /></button>
        </div>
        <nav aria-label="Mobile">
          {[...NAV, ['/wishlist', 'Wishlist'], ['/cart', 'Cart']].map(([href, label], i) => (
            <Link key={href} href={href} tabIndex={menu ? 0 : -1} aria-current={isActive(href) ? 'page' : undefined} style={{ transitionDelay: `${menu ? 120 + i * 50 : 0}ms` }}>{label}</Link>
          ))}
        </nav>
        <div className="foot stack">
          <div className="socials">{Object.entries(social || {}).filter(([, u]) => u).map(([k, u]) => <a key={k} href={u} target="_blank" rel="noreferrer" tabIndex={menu ? 0 : -1}>{k}</a>)}</div>
        </div>
      </div>

      {search && <SearchOverlay onClose={() => setSearch(false)} />}
    </>
  );
}

function SearchOverlay({ onClose }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [busy, setBusy] = useState(false);
  const { currency } = useStore();
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const c = new AbortController();
    setBusy(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: c.signal }).then((r) => r.json()).then((d) => setRes(d.results || [])).catch(() => {}).finally(() => setBusy(false));
    }, 180);
    return () => { clearTimeout(t); c.abort(); };
  }, [q]);
  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form role="search" onSubmit={(e) => { e.preventDefault(); router.push(`/shop?q=${encodeURIComponent(q)}`); onClose(); }}>
        <SearchIcon />
        <label htmlFor="site-search" className="sr-only">Search products</label>
        <input id="site-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search frames, colours, shapes" autoComplete="off" />
        <button type="button" className="icon-btn" aria-label="Close search" onClick={onClose}><CloseIcon /></button>
      </form>
      <div className="search-results" aria-live="polite">
        {busy && q.length > 1 && !res.length && <p className="label">Searching…</p>}
        {!busy && q.trim().length > 1 && !res.length && <p className="muted">No frames match “{q}”. Try a colour like “orange” or a shape like “round”.</p>}
        {res.map((p) => (
          <Link key={p.slug} href={`/product/${p.slug}`} onClick={onClose}>
            {p.image ? <img src={p.image} alt="" /> : <span />}
            <span><strong>{p.name}</strong><br /><span className="label">{p.categoryName} · {p.frameShape}</span></span>
            <span className="price">{money(p.finalPrice, currency)}</span>
          </Link>
        ))}
        {res.length > 0 && <Link href={`/shop?q=${encodeURIComponent(q)}`} onClick={onClose} className="label accent" style={{ display: 'block', paddingTop: 12 }}>See all results →</Link>}
      </div>
    </div>
  );
}
