import { and, eq, gt, isNull } from 'drizzle-orm';
import { ResetForm } from '@/components/admin/AuthForms';
import { LogoMark } from '@/components/store/Icons';
import { getDb, schema as s } from '@/db';
import { sha256 } from '@/lib/auth';

export const metadata = { title: 'Reset password' };

export default async function Reset({ params }) {
  const db = await getDb();
  const [r] = await db.select().from(s.passwordResets).where(and(eq(s.passwordResets.tokenHash, sha256(params.token)), gt(s.passwordResets.expiresAt, new Date()), isNull(s.passwordResets.usedAt)));
  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <span className="logo"><LogoMark /> Admin</span>
        <h1 className="display-s">Choose a new password</h1>
        {r ? <ResetForm token={params.token} /> : <div className="notice bad">This reset link is invalid, expired or already used. Ask the owner for a new link.</div>}
      </div>
    </main>
  );
}
