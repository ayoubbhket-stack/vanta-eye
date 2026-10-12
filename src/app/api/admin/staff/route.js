import { z } from 'zod';
import { and, eq, ne, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { HttpError, ROLES, createResetToken, hashPassword, requireAdminApi, validatePassword } from '@/lib/auth';
import { handler, ok } from '@/lib/http';
import { siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

async function owners(db, exceptId) {
  const [{ n }] = await db.select({ n: sql`count(*)::int` }).from(s.adminUsers).where(and(eq(s.adminUsers.role, 'owner'), eq(s.adminUsers.active, true), ne(s.adminUsers.id, exceptId)));
  return n;
}

export const POST = handler(async (req) => {
  const me = await requireAdminApi('staff.manage');
  const b = await req.json();
  const db = await getDb();
  if (b.action === 'create') {
    const d = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email('Enter a valid email.'), role: z.enum(ROLES), password: z.string() }).parse(b);
    const bad = validatePassword(d.password); if (bad) throw new HttpError(422, bad);
    await db.insert(s.adminUsers).values({ name: d.name, email: d.email, role: d.role, passwordHash: await hashPassword(d.password) });
    return ok({ ok: true }, { status: 201 });
  }
  const id = z.string().uuid().parse(b.id);
  const [u] = await db.select().from(s.adminUsers).where(eq(s.adminUsers.id, id));
  if (!u) throw new HttpError(404, 'User not found.');
  if (b.action === 'update') {
    const d = z.object({ role: z.enum(ROLES), active: z.boolean() }).parse(b);
    if ((u.role === 'owner' && (d.role !== 'owner' || !d.active)) && (await owners(db, id)) === 0) throw new HttpError(422, 'Keep at least one active owner.');
    await db.update(s.adminUsers).set({ role: d.role, active: d.active }).where(eq(s.adminUsers.id, id));
    if (!d.active) await db.delete(s.adminSessions).where(eq(s.adminSessions.userId, id));
    return ok({ ok: true });
  }
  if (b.action === 'reset-link') {
    const token = await createResetToken(id, 60);
    return ok({ url: `${siteUrl()}/admin/reset/${token}` });
  }
  if (b.action === 'signout') { await db.delete(s.adminSessions).where(eq(s.adminSessions.userId, id)); return ok({ ok: true }); }
  if (b.action === 'delete') {
    if (id === me.id) throw new HttpError(422, 'You cannot delete your own account.');
    if (u.role === 'owner' && (await owners(db, id)) === 0) throw new HttpError(422, 'Keep at least one active owner.');
    await db.delete(s.adminUsers).where(eq(s.adminUsers.id, id));
    return ok({ ok: true });
  }
  throw new HttpError(422, 'Unknown action.');
});
