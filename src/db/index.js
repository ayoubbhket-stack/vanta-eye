// Database client. Uses real PostgreSQL when DATABASE_URL is a postgres:// URL
// (production), or an embedded PGlite Postgres in ./data/pglite for local dev.
import * as schema from './schema.js';

const g = globalThis;

async function create() {
  const url = process.env.DATABASE_URL || '';
  if (url.startsWith('postgres')) {
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const pg = (await import('pg')).default;
    const pool = new pg.Pool({ connectionString: url, max: Number(process.env.DB_POOL_MAX || 5),
      ssl: process.env.DATABASE_SSL === 'false' ? false : (url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined) });
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
