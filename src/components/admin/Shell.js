'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogoMark, MenuIcon } from '../store/Icons';

const I = (d) => () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const ICONS = {
  dash: I('M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-4H4zM14 7h6V4h-6z'),
  orders: I('M6 3h12l1 18H5zM9 7a3 3 0 0 0 6 0'),
  products: I('M3 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0M13 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0M11 11c.7-.6 1.3-.6 2 0'),
  cols: I('M4 5h16M4 12h16M4 19h10'),
  inv: I('M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10'),
  cust: I('M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6'),
  content: I('M4 4h16v16H4zM4 9h16M9 9v11'),
  disc: I('M20 12l-8 8-8-8V4h8zM8 8h.01'),
  rep: I('M4 20V10M10 20V4M16 20v-7M22 20H2'),
  inbox: I('M4 4h16v12H4zM4 12h5l1 3h4l1-3h5'),
  set: I('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15.4H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z'),
  staff: I('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'),
  store: I('M3 9l1-5h16l1 5M4 9v11h16V9M9 20v-6h6v6'),
};

export default function Shell({ me, perms, storeName, badges, children }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => setOpen(false), [path]);
  const nav = [
    ['Store', [
      ['/admin', 'Dashboard', 'dash', true],
      ['/admin/orders', 'Orders', 'orders', perms['orders.read'], badges.pending],
      ['/admin/products', 'Products', 'products', perms['products.read']],
      ['/admin/collections', 'Categories & collections', 'cols', perms['products.write']],
      ['/admin/inventory', 'Inventory', 'inv', perms['inventory.read'], badges.low],
      ['/admin/customers', 'Customers', 'cust', perms['customers.read']],
    ]],
    ['Marketing', [
      ['/admin/content', 'Website content', 'content', perms['content.write']],
      ['/admin/discounts', 'Discounts', 'disc', perms['discounts.write']],
      ['/admin/inbox', 'Inbox & reviews', 'inbox', perms['inbox.read'], badges.inbox],
    ]],
    ['Admin', [
      ['/admin/reports', 'Reports', 'rep', perms['reports.read']],
      ['/admin/settings', 'Store settings', 'set', perms['settings.write']],
      ['/admin/staff', 'Staff & roles', 'staff', perms['staff.manage']],
    ]],
  ];
  const active = (href) => (href === '/admin' ? path === '/admin' : path.startsWith(href));
  return (
    <div className="adm">
      <aside className={`adm-side${open ? ' open' : ''}`} aria-label="Admin navigation">
        <Link href="/admin" className="logo"><LogoMark />{storeName}<small>ADMIN</small></Link>
        <nav className="adm-nav">
          {nav.map(([grp, items]) => {
            const vis = items.filter((i) => i[3]);
            if (!vis.length) return null;
            return (
              <div key={grp} style={{ display: 'grid', gap: 2 }}>
                <span className="grp">{grp}</span>
                {vis.map(([href, label, icon, , badge]) => { const Ic = ICONS[icon]; return <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}><Ic />{label}{badge > 0 && <span className="n">{badge}</span>}</Link>; })}
              </div>
            );
          })}
          <span className="grp">View</span>
          <a href="/" target="_blank" rel="noreferrer">{(() => { const Ic = ICONS.store; return <Ic />; })()}Open storefront ↗</a>
        </nav>
        <div className="me">
          <strong>{me.name}</strong>
          <span className="muted" style={{ fontSize: '.8rem', overflowWrap: 'anywhere' }}>{me.email}</span>
          <span className="pill">{me.role}</span>
          <div className="row" style={{ gap: 8 }}>
            <Link href="/admin/account" className="link" style={{ fontSize: '.82rem' }}>Account</Link>
            <button className="link" style={{ background: 'none', border: 0, padding: 0, fontSize: '.82rem', color: 'var(--muted)' }} onClick={async () => { await fetch('/api/admin/auth/logout', { method: 'POST' }); router.replace('/admin/login'); router.refresh(); }}>Sign out</button>
          </div>
        </div>
      </aside>
      <div className="adm-main">
        <header className="adm-top">
          <button className="icon-btn adm-burger" aria-label="Open navigation" onClick={() => setOpen(true)}><MenuIcon /></button>
          {perms['orders.read'] && (
            <form role="search" onSubmit={(e) => { e.preventDefault(); router.push(`/admin/orders?q=${encodeURIComponent(q)}`); }}>
              <label htmlFor="adm-q" className="sr-only">Search orders</label>
              <input id="adm-q" className="input" placeholder="Search orders by number, name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
          )}
          <div style={{ marginInlineStart: 'auto' }} className="row">
            {perms['products.write'] && <Link className="btn small" href="/admin/products/new">+ Product</Link>}
          </div>
        </header>
        <main className="adm-body">{children}</main>
      </div>
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 70 }} onClick={() => setOpen(false)} aria-hidden="true" />}
    </div>
  );
}
