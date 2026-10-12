import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { DEFAULTS } from './defaults';

function merge(base, over) {
  if (Array.isArray(base) || Array.isArray(over)) return over ?? base;
  if (base && typeof base === 'object' && over && typeof over === 'object') {
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = merge(base[k], over[k]);
    return out;
  }
  return over === undefined ? base : over;
}

export async function getSetting(key) {
  const db = await getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  return merge(DEFAULTS[key], row?.value);
}

export async function getSettings(keys) {
  const out = {};
  await Promise.all(keys.map(async (k) => { out[k] = await getSetting(k); }));
  return out;
}

export async function saveSetting(key, value) {
  if (!(key in DEFAULTS)) throw new Error('Unknown settings key');
  const db = await getDb();
  await db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({
    target: schema.settings.key, set: { value, updatedAt: new Date() },
  });
}
