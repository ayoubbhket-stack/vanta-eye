// Secure account recovery: prints a one-time password-reset link (valid 60 min).
// Usage: npm run admin:reset-link -- --email you@brand.com [--site https://yourdomain]
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { connect } from './db.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const email = (arg('email') || '').toLowerCase().trim();
const site = (arg('site') || process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const { db, close, schema: s } = await connect();
const [u] = await db.select().from(s.adminUsers).where(eq(s.adminUsers.email, email));
if (!u) { console.error('No admin with that email.'); await close(); process.exit(1); }
const token = crypto.randomBytes(32).toString('base64url');
await db.insert(s.passwordResets).values({ tokenHash: crypto.createHash('sha256').update(token).digest('hex'), userId: u.id, expiresAt: new Date(Date.now() + 3600000) });
console.log(`Reset link for ${email} (valid for 60 minutes, single use):\n${site}/admin/reset/${token}`);
await close();
