import { redirect } from 'next/navigation';
import { SetupForm } from '@/components/admin/AuthForms';
import { LogoMark } from '@/components/store/Icons';
import { countAdmins } from '@/lib/auth';

export const metadata = { title: 'First-time setup' };

export default async function Setup() {
  if ((await countAdmins()) > 0) redirect('/admin/login');
  const enabled = !!process.env.SETUP_TOKEN;
  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <span className="logo"><LogoMark /> Setup</span>
        <h1 className="display-s">Create the owner account</h1>
        {enabled ? <SetupForm /> : <div className="notice bad">Setup is locked. Set a SETUP_TOKEN environment variable and restart the server, or create the owner from the command line with <code className="mono">npm run admin:create</code>.</div>}
      </div>
    </main>
  );
}
