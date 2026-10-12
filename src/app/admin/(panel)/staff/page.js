import { asc } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { requireAdminPage } from '@/lib/auth';
import StaffManager from '@/components/admin/StaffManager';

export const metadata = { title: 'Staff & roles' };

export default async function Staff() {
  const me = await requireAdminPage('staff.manage');
  const db = await getDb();
  const rows = await db.select({ id: s.adminUsers.id, name: s.adminUsers.name, email: s.adminUsers.email, role: s.adminUsers.role, active: s.adminUsers.active, lastLoginAt: s.adminUsers.lastLoginAt, lockedUntil: s.adminUsers.lockedUntil }).from(s.adminUsers).orderBy(asc(s.adminUsers.createdAt));
  return <StaffManager me={me.id} users={rows.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() || null, locked: !!(u.lockedUntil && u.lockedUntil > new Date()) }))} />;
}
