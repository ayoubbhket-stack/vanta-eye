// Create (or reset the password of) an administrator from the command line.
// Usage: npm run admin:create -- --email you@brand.com --name "Your Name" [--role owner] [--password '...']
// If --password is omitted, a strong random password is generated and printed once.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { connect } from './db.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const email = (arg('email') || '').toLowerCase().trim();
const name = arg('name', 'Store Owner');
const role = arg('role', 'owner');
let password = arg('password');
if (!email || !email.includes('@')) { console.error('Provide --email'); process.exit(1); }
if (!['owner', 'manager', 'staff'].includes(role)) { console.error('--role must be owner, manager or staff'); process.exit(1); }
const generated = !password;
if (generated) password = crypto.randomBytes(12).toString('base64url');
if (password.length < 10 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
  if (!generated) { console.error('Password must be 10+ characters with letters and numbers.'); process.exit(1); }
  password += '7a';
}
const { db, close, schema: s } = await connect();
const hash = await bcrypt.hash(password, 12);
const [existing] = await db.select().from(s.adminUsers).where(eq(s.adminUsers.email, email));
if (existing) {
  await db.update(s.adminUsers).set({ passwordHash: hash, role, active: true, failedAttempts: 0, lockedUntil: null }).where(eq(s.adminUsers.id, existing.id));
  await db.delete(s.adminSessions).where(eq(s.adminSessions.userId, existing.id));
  console.log(`✓ Updated ${email} (${role}). All existing sessions were signed out.`);
} else {
  await db.insert(s.adminUsers).values({ email, name, role, passwordHash: hash });
  console.log(`✓ Created ${role} account ${email}`);
}
if (generated) console.log(`  Password: ${password}\n  Store it in a password manager now; it will not be shown again.`);
await close();
