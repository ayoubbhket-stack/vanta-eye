import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { and, eq, ne } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { getDb, schema as s } from '@/db';
import { HttpError, SESSION_COOKIE, hashPassword, requireAdminApi, sha256, validatePassword } from '@/lib/auth';
import { handler, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Change your own password; signs out your other sessions.
export const POST = handler(async (req) => {
  const me = await requireAdminApi();
  const { current, next } = z.object({ current: z.string().max(200), next: z.string().max(200) }).parse(await req.json());
  const db = await getDb();
  const [u] = await db.select().from(s.adminUsers).where(eq(s.adminUsers.id, me.id));
  if (!(await bcrypt.compare(current, u.passwordHash))) throw new HttpError(422, 'Current password is incorrect.');
  const bad = validatePassword(next); if (bad) throw new HttpError(422, bad);
  await db.update(s.adminUsers).set({ passwordHash: await hashPassword(next) }).where(eq(s.adminUsers.id, me.id));
  const token = cookies().get(SESSION_COOKIE)?.value;
  await db.delete(s.adminSessions).where(and(eq(s.adminSessions.userId, me.id), ne(s.adminSessions.tokenHash, sha256(token || ''))));
  return ok({ ok: true });
});
