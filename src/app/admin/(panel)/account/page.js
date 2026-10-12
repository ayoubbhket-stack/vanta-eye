import { requireAdminPage } from '@/lib/auth';
import AccountForm from '@/components/admin/AccountForm';

export const metadata = { title: 'Account' };

export default async function Account() {
  const me = await requireAdminPage('dashboard');
  return (
    <>
      <div className="adm-head"><div><h1>Your account</h1><p className="sub">{me.name} · {me.email} · {me.role}</p></div></div>
      <AccountForm />
    </>
  );
}
