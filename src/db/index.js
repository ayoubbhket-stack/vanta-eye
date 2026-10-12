// Database client. Uses real PostgreSQL when DATABASE_URL is a postgres:// URL
// (production), or an embedded PGlite Postgres in ./data/pglite for local dev.
import * as schema from './schema.js';

const g = globalThis;

async function create() {
  // tolerate values pasted with quotes or spaces around them
  const url = (process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '').trim();
  if (!url.startsWith('postgres') && (process.env.VERCEL || process.env.NODE_ENV === 'production' && process.env.REQUIRE_DATABASE_URL)) {
    throw new Error('DATABASE_URL is missing or invalid. Set it to your PostgreSQL connection string (postgres://… or postgresql://…) in the hosting environment variables.');
  }
  if (url.startsWith('postgres')) {
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const pg = (await import('pg')).default;
    const pool = new pg.Pool({ connectionString: url, max: Number(process.env.DB_POOL_MAX || 5),
      ssl: process.env.DATABASE_SSL === 'false' ? false : (/sslmode=(require|verify)/.test(url) || url.includes('neon.tech') ? { rejectUnauthorized: false } : undefined) });
    return drizzle(pool, { schema });
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const dir = process.env.PGLITE_DIR || './data/pglite';
  const client = new PGlite(dir);
  await client.waitReady;
  return drizzle(client, { schema });
}

export function getDb() {
  if (!g.__vantaDb) g.__vantaDb = create();
  return g.__vantaDb;
}
export { schema };
