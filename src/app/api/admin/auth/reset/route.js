import { z } from 'zod';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { HttpError, hashPassword, sha256, validatePassword } from '@/lib/auth';
import { assertSameOrigin, clientIp, handler, ok, rateLimit } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req) => {
  assertSameOrigin(req);
  rateLimit(`reset:${clientIp(req)}`, 10, 10 * 60000);
  const { token, password } = z.object({ token: z.string().min(20).max(200), password: z.string().max(200) }).parse(await req.json());
  const bad = validatePassword(password); if (bad) throw new HttpError(422, bad);
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [r] = await tx.select().from(s.passwordResets).where(and(eq(s.passwordResets.tokenHash, sha256(token)), gt(s.passwordResets.expiresAt, new Date()), isNull(s.passwordResets.usedAt))).for('update');
    if (!r) throw new HttpError(400, 'This reset link is invalid or expired.');
    await tx.update(s.passwordResets).set({ usedAt: new Date() }).where(eq(s.passwordResets.tokenHash, r.tokenHash));
    await tx.update(s.adminUsers).set({ passwordHash: await hashPassword(password), failedAttempts: 0, lockedUntil: null }).where(eq(s.adminUsers.id, r.userId));
    await tx.delete(s.adminSessions).where(eq(s.adminSessions.userId, r.userId));
  });
  return ok({ ok: true });
});
