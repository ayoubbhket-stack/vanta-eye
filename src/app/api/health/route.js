import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db';

export const dynamic = 'force-dynamic';

// Health check: confirms the app can reach its database. Never returns secrets.
export async function GET() {
  const raw = (process.env.DATABASE_URL || '').trim();
  const info = { databaseUrlSet: !!raw, databaseUrlScheme: raw.split(':')[0].replace(/[^a-z]/gi, '').slice(0, 12) || null };
  try {
    const db = await getDb();
    const r = await db.execute(sql`select count(*)::int as n from products`);
    return NextResponse.json({ ok: true, ...info, products: (r.rows || r)[0]?.n });
  } catch (e) {
    globalThis.__vantaDb = undefined; // allow a fresh connection attempt next time
    const msg = String(e?.message || e).replace(/postgres(ql)?:\/\/[^\s'"]+/gi, '[url]');
    return NextResponse.json({ ok: false, ...info, error: msg.slice(0, 300), code: e?.code || null }, { status: 503 });
  }
}
