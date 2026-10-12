import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { requireAdminPage } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import ContentEditor from '@/components/admin/ContentEditor';

export const metadata = { title: 'Website content' };
const TABS = [['home', 'Homepage'], ['about', 'About page'], ['contact', 'Contact & FAQ'], ['policies', 'Policies'], ['footer', 'Footer & newsletter']];

export default async function Content({ searchParams }) {
  await requireAdminPage('content.write');
  const tab = TABS.some(([k]) => k === searchParams.tab) ? searchParams.tab : 'home';
  const data = await getSettings([tab]);
  const db = await getDb();
  const products = await db.select({ slug: s.products.slug, name: s.products.name }).from(s.products).where(eq(s.products.status, 'published')).orderBy(asc(s.products.name));
  return (
    <>
      <div className="adm-head"><div><h1>Website content</h1><p className="sub">Changes go live on the storefront as soon as you save.</p></div><a className="btn ghost small" href={tab === 'home' ? '/' : tab === 'policies' ? '/policies/shipping' : `/${tab === 'footer' ? '' : tab}`} target="_blank" rel="noreferrer">View page ↗</a></div>
      <nav className="tabs">{TABS.map(([k, l]) => <Link key={k} href={`/admin/content?tab=${k}`} aria-current={tab === k ? 'page' : undefined}>{l}</Link>)}</nav>
      <ContentEditor key={tab} tab={tab} initial={data[tab]} products={products} />
    </>
  );
}
