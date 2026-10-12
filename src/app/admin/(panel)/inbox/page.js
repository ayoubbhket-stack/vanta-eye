import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { can, requireAdminPage } from '@/lib/auth';
import InboxActions from '@/components/admin/InboxActions';

export const metadata = { title: 'Inbox & reviews' };
const TABS = [['messages', 'Messages'], ['reviews', 'Reviews'], ['subscribers', 'Newsletter']];

export default async function Inbox({ searchParams }) {
  const me = await requireAdminPage('inbox.read');
  const tab = TABS.some(([k]) => k === searchParams.tab) ? searchParams.tab : 'messages';
  const db = await getDb();
  const dt = (d) => new Date(d).toLocaleString('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' });
  let body;
  if (tab === 'messages') {
    const rows = await db.select().from(s.contactMessages).orderBy(desc(s.contactMessages.createdAt)).limit(200);
    body = rows.length ? rows.map((m) => (
      <article key={m.id} className="panel" style={{ borderInlineStart: m.read ? undefined : '3px solid var(--accent)' }}>
        <div className="ph"><div><h2>{m.subject || 'Message'} — {m.name}</h2><span className="muted" style={{ fontSize: '.82rem' }}>{m.email}{m.phone ? ` · ${m.phone}` : ''} · {dt(m.createdAt)}</span></div><InboxActions kind="message" id={m.id} state={m.read ? 'read' : 'unread'} /></div>
        <div className="pb"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.body}</p></div>
      </article>
    )) : <div className="panel empty-adm">No messages yet. Contact form submissions appear here.</div>;
  } else if (tab === 'reviews') {
    const rows = await db.select({ r: s.reviews, product: s.products.name, pid: s.products.id }).from(s.reviews).innerJoin(s.products, eq(s.reviews.productId, s.products.id)).orderBy(desc(s.reviews.createdAt)).limit(300);
    const order = { pending: 0, approved: 1, rejected: 2 };
    rows.sort((a, b) => order[a.r.status] - order[b.r.status]);
    body = rows.length ? (
      <section className="panel"><div className="pb flush tbl-wrap"><table className="tbl">
        <thead><tr><th>Review</th><th>Product</th><th>Rating</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.map(({ r, product, pid }) => (
          <tr key={r.id}>
            <td style={{ maxWidth: 460 }}><strong>{r.title || '(no title)'}</strong><p className="muted" style={{ margin: '2px 0', fontSize: '.85rem' }}>{r.body}</p><span className="label" style={{ textTransform: 'none', letterSpacing: 0 }}>{r.name}{r.city ? ` · ${r.city}` : ''} · {dt(r.createdAt)}</span></td>
            <td><Link className="rowlink" href={`/admin/products/${pid}`}>{product}</Link></td>
            <td className="mono" style={{ color: 'var(--accent)' }}>{'★'.repeat(r.rating)}</td>
            <td><span className={`pill ${r.status}`}>{r.status}</span></td>
            <td className="r">{can(me, 'content.write') && <InboxActions kind="review" id={r.id} state={r.status} />}</td>
          </tr>
        ))}</tbody>
      </table></div></section>
    ) : <div className="panel empty-adm">No reviews yet.</div>;
  } else {
    const rows = await db.select().from(s.subscribers).orderBy(desc(s.subscribers.createdAt)).limit(1000);
    body = (
      <section className="panel"><div className="ph"><h2>{rows.length} subscribers</h2>{can(me, 'customers.export') && <a className="btn small ghost" href="/api/admin/subscribers/export">Export CSV</a>}</div>
        <div className="pb flush tbl-wrap">{rows.length ? <table className="tbl"><thead><tr><th>Email</th><th>Subscribed</th><th></th></tr></thead><tbody>{rows.map((x) => <tr key={x.id}><td>{x.email}</td><td className="mono muted">{dt(x.createdAt)}</td><td className="r">{can(me, 'customers.read') && <InboxActions kind="subscriber" id={x.id} />}</td></tr>)}</tbody></table> : <div className="empty-adm">No subscribers yet.</div>}</div>
        <p className="muted" style={{ fontSize: '.8rem', padding: '0 18px 14px', margin: 0 }}>No email marketing service is connected. Export the list to import it into your email tool.</p>
      </section>
    );
  }
  return (
    <>
      <div className="adm-head"><div><h1>Inbox &amp; reviews</h1><p className="sub">Customer reviews appear on the store only after approval.</p></div></div>
      <nav className="tabs">{TABS.map(([k, l]) => <Link key={k} href={`/admin/inbox?tab=${k}`} aria-current={tab === k ? 'page' : undefined}>{l}</Link>)}</nav>
      <div style={{ display: 'grid', gap: 14 }}>{body}</div>
    </>
  );
}
