// Admin authentication: bcrypt password hashes, opaque session tokens stored
// (hashed) in the database, httpOnly cookies, lockout after failed attempts,
// and role-based permissions checked on the server for every admin request.
import 'server-only';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq, gt, lt } from 'drizzle-orm';
import { getDb, schema } from '@/db';

export const SESSION_COOKIE = 've_admin';
const SESSION_DAYS = 7;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export const ROLES = ['owner', 'manager', 'staff'];

// permission -> roles allowed
const PERMS = {
  dashboard: ['owner', 'manager', 'staff'],
  'orders.read': ['owner', 'manager', 'staff'],
  'orders.write': ['owner', 'manager', 'staff'],
  'orders.export': ['owner', 'manager'],
  'products.read': ['owner', 'manager', 'staff'],
  'products.write': ['owner', 'manager'],
  'inventory.read': ['owner', 'manager', 'staff'],
  'inventory.write': ['owner', 'manager', 'staff'],
  'customers.read': ['owner', 'manager'],
  'customers.export': ['owner'],
  'content.write': ['owner', 'manager'],
  'discounts.write': ['owner', 'manager'],
  'reports.read': ['owner', 'manager'],
  'inbox.read': ['owner', 'manager', 'staff'],
  'settings.write': ['owner'],
  'staff.manage': ['owner'],
};

export const can = (user, perm) => !!user && (PERMS[perm] || []).includes(user.role);

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

export async function hashPassword(pw) { return bcrypt.hash(pw, 12); }

export function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Use at least 10 characters.';
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use both letters and numbers.';
  return null;
}

export async function login(email, password, meta = {}) {
  const db = await getDb();
  const [user] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, String(email).toLowerCase().trim()));
  // constant-ish time: always run a bcrypt compare
  const ok = await bcrypt.compare(String(password), user?.passwordHash || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
  if (!user || !user.active) return { error: 'Email or password is incorrect.' };
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: `Too many attempts. Try again after ${user.lockedUntil.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.` };
  }
  if (!ok) {
    const attempts = user.failedAttempts + 1;
    await db.update(schema.adminUsers).set({
      failedAttempts: attempts >= MAX_ATTEMPTS ? 0 : attempts,
      lockedUntil: attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
    }).where(eq(schema.adminUsers.id, user.id));
    return { error: 'Email or password is incorrect.' };
  }
  const token = randomToken();
  await db.insert(schema.adminSessions).values({
    tokenHash: sha256(token), userId: user.id,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
    ip: meta.ip || null, userAgent: (meta.userAgent || '').slice(0, 300),
  });
  await db.update(schema.adminUsers).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(schema.adminUsers.id, user.id));
  await db.delete(schema.adminSessions).where(lt(schema.adminSessions.expiresAt, new Date()));
  return { token, user };
}

export function setSessionCookie(res, token) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/',
    secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== 'true',
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function logout() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.adminSessions).where(eq(schema.adminSessions.tokenHash, sha256(token)));
  }
}

/** Current admin from the session cookie, or null. */
export async function currentAdmin() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db.select({ user: schema.adminUsers })
    .from(schema.adminSessions)
    .innerJoin(schema.adminUsers, eq(schema.adminSessions.userId, schema.adminUsers.id))
    .where(and(eq(schema.adminSessions.tokenHash, sha256(token)), gt(schema.adminSessions.expiresAt, new Date())));
  const u = rows[0]?.user;
  if (!u || !u.active) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

/** For admin pages (server components): redirect when unauthenticated / unauthorised. */
export async function requireAdminPage(perm = 'dashboard') {
  const u = await currentAdmin();
  if (!u) redirect('/admin/login');
  if (!can(u, perm)) redirect('/admin?denied=1');
  return u;
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** For admin API routes: throws 401/403. Also rejects cross-site writes. */
export async function requireAdminApi(perm) {
  const h = headers();
  const origin = h.get('origin');
  const host = h.get('x-forwarded-host') || h.get('host');
  if (origin && host && new URL(origin).host !== host) throw new HttpError(403, 'Cross-site request blocked.');
  const u = await currentAdmin();
  if (!u) throw new HttpError(401, 'Sign in required.');
  if (perm && !can(u, perm)) throw new HttpError(403, 'Your role does not allow this action.');
  return u;
}

export async function countAdmins() {
  const db = await getDb();
  const rows = await db.select({ id: schema.adminUsers.id }).from(schema.adminUsers);
  return rows.length;
}

export async function createResetToken(userId, minutes = 60) {
  const db = await getDb();
  const token = randomToken();
  await db.insert(schema.passwordResets).values({ tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + minutes * 60000) });
  return token;
}
