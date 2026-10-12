import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db';

export const dynamic = 'force-dynamic';

// Health check: confirms the app can reach its database. Never returns secrets.
export async function GET(req) {
  const deep = new URL(req.url).searchParams.get('deep') === '1';
  const raw = (process.env.DATABASE_URL || '').trim();
  const info = { databaseUrlSet: !!raw, databaseUrlScheme: raw.split(':')[0].replace(/[^a-z]/gi, '').slice(0, 12) || null };
  try {
    const db = await getDb();
    const r = await db.execute(sql`select count(*)::int as n from products`);
    const out = { ok: true, ...info, products: (r.rows || r)[0]?.n };
    if (deep) {
      const steps = {
        settings: async () => (await import('@/lib/settings')).getSettings(['store', 'home', 'shipping']),
        catalog: async () => (await (await import('@/lib/catalog')).loadProducts()).length,
        collections: async () => (await getDb()).execute(sql`select count(*)::int as n from collections`),
        reviews: async () => (await (await import('@/lib/catalog')).getApprovedReviews({ limit: 2 })).length,
      };
      out.checks = {};
      for (const [k, fn] of Object.entries(steps)) {
        try { const v = await fn(); out.checks[k] = typeof v === 'number' ? v : 'ok'; } catch (e) { out.checks[k] = `ERROR: ${String(e?.message || e).slice(0, 200)}`; out.ok = false; }
      }
    }
    return NextResponse.json(out);
  } catch (e) {
    globalThis.__vantaDb = undefined; // allow a fresh connection attempt next time
    const msg = String(e?.message || e).replace(/postgres(ql)?:\/\/[^\s'"]+/gi, '[url]');
    return NextResponse.json({ ok: false, ...info, error: msg.slice(0, 300), code: e?.code || null }, { status: 503 });
  }
}
