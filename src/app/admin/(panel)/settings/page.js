import Link from 'next/link';
import { requireAdminPage } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { paymobConfigured } from '@/lib/orders';
import { emailConfigured } from '@/lib/notify';
import SettingsEditor from '@/components/admin/SettingsEditor';

export const metadata = { title: 'Store settings' };
const TABS = [['general', 'General'], ['shipping', 'Shipping & regions'], ['payments', 'Payments & tax'], ['notifications', 'Notifications'], ['integrations', 'Integrations']];

export default async function Settings({ searchParams }) {
  await requireAdminPage('settings.write');
  const tab = TABS.some(([k]) => k === searchParams.tab) ? searchParams.tab : 'general';
  const { store, shipping } = await getSettings(['store', 'shipping']);
  const status = {
    db: (process.env.DATABASE_URL || '').startsWith('postgres') ? 'PostgreSQL (DATABASE_URL)' : 'Embedded Postgres (PGlite, local development only)',
    paymob: paymobConfigured(), email: emailConfigured(), setupToken: !!process.env.SETUP_TOKEN, siteUrl: process.env.SITE_URL || '',
  };
  return (
    <>
      <div className="adm-head"><div><h1>Store settings</h1><p className="sub">Only the owner role can change these.</p></div></div>
      <nav className="tabs">{TABS.map(([k, l]) => <Link key={k} href={`/admin/settings?tab=${k}`} aria-current={tab === k ? 'page' : undefined}>{l}</Link>)}</nav>
      <SettingsEditor key={tab} tab={tab} store={store} shipping={shipping} status={status} />
    </>
  );
}
