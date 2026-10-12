// Shared DB connection for CLI scripts.
import './load-env.mjs';
import * as schema from '../src/db/schema.js';

export async function connect() {
  const url = process.env.DATABASE_URL || '';
  if (url.startsWith('postgres')) {
    const pg = (await import('pg')).default;
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const pool = new pg.Pool({ connectionString: url, ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined });
    return { db: drizzle(pool, { schema }), close: () => pool.end(), schema };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const client = new PGlite(process.env.PGLITE_DIR || './data/pglite');
  return { db: drizzle(client, { schema }), close: () => client.close(), schema };
}
