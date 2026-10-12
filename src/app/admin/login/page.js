import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/AuthForms';
import { LogoMark } from '@/components/store/Icons';
import { countAdmins, currentAdmin } from '@/lib/auth';

export const metadata = { title: 'Sign in' };

export default async function Login() {
  if (await currentAdmin()) redirect('/admin');
  const none = (await countAdmins()) === 0;
  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <span className="logo"><LogoMark /> Admin</span>
        <h1 className="display-s">Sign in to manage the store</h1>
        {none ? (
          <div className="notice">No administrator exists yet. <Link className="link" href="/admin/setup">Create the owner account</Link> or run <code className="mono">npm run admin:create</code>.</div>
        ) : <LoginForm />}
        <p className="muted" style={{ fontSize: '.84rem', margin: 0 }}>Forgot your password? Ask the store owner to send you a reset link, or run <code className="mono">npm run admin:reset-link -- --email you@…</code> on the server.</p>
        <Link href="/" className="link label">← Back to store</Link>
      </div>
    </main>
  );
}
