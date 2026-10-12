import { z } from 'zod';
import { NextResponse } from 'next/server';
import { login, setSessionCookie } from '@/lib/auth';
import { assertSameOrigin, clientIp, handler, rateLimit } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req) => {
  assertSameOrigin(req);
  rateLimit(`login:${clientIp(req)}`, 10, 5 * 60000);
  const { email, password } = z.object({ email: z.string().max(200), password: z.string().max(200) }).parse(await req.json());
  const r = await login(email, password, { ip: clientIp(req), userAgent: req.headers.get('user-agent') });
  if (r.error) return NextResponse.json({ error: r.error }, { status: 401 });
  const res = NextResponse.json({ ok: true, user: { name: r.user.name, role: r.user.role } });
  setSessionCookie(res, r.token);
  return res;
});
