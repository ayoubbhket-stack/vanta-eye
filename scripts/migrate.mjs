// Applies SQL migrations in ./drizzle to the configured database.
import './load-env.mjs';
import path from 'node:path';

const url = process.env.DATABASE_URL || '';
const folder = path.resolve('drizzle');
if (url.startsWith('postgres')) {
  const pg = (await import('pg')).default;
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const pool = new pg.Pool({ connectionString: url, ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined });
  await migrate(drizzle(pool), { migrationsFolder: folder });
  await pool.end();
} else {
  const fs = await import('node:fs');
  const dir = process.env.PGLITE_DIR || './data/pglite';
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const client = new PGlite(dir);
  await migrate(drizzle(client), { migrationsFolder: folder });
  await client.close();
}
console.log('✓ Database migrated');
