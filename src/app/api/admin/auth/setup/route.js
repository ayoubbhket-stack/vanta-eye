import crypto from 'node:crypto';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getDb, schema as s } from '@/db';
import { HttpError, countAdmins, hashPassword, login, setSessionCookie, validatePassword } from '@/lib/auth';
import { assertSameOrigin, clientIp, handler, rateLimit } from '@/lib/http';

export const dynamic = 'force-dynamic';

// One-time owner creation. Works only while no admin exists AND the caller
// knows the SETUP_TOKEN from the server environment.
export const POST = handler(async (req) => {
  assertSameOrigin(req);
  rateLimit(`setup:${clientIp(req)}`, 5, 10 * 60000);
  if (!process.env.SETUP_TOKEN) throw new HttpError(403, 'Setup is locked. Set SETUP_TOKEN on the server.');
  if ((await countAdmins()) > 0) throw new HttpError(403, 'An administrator already exists.');
  const b = z.object({ token: z.string(), name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), password: z.string() }).parse(await req.json());
  const a = Buffer.from(b.token); const e = Buffer.from(process.env.SETUP_TOKEN);
  if (a.length !== e.length || !crypto.timingSafeEqual(a, e)) throw new HttpError(403, 'Setup token is incorrect.');
  const bad = validatePassword(b.password); if (bad) throw new HttpError(422, bad);
  const db = await getDb();
  await db.insert(s.adminUsers).values({ email: b.email, name: b.name, role: 'owner', passwordHash: await hashPassword(b.password) });
  const r = await login(b.email, b.password, { ip: clientIp(req) });
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, r.token);
  return res;
});
