import { NextResponse } from 'next/server';
import { getCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

// Published products by slug, used by the wishlist and recently-viewed lists.
export async function GET(req) {
  const slugs = (new URL(req.url).searchParams.get('slugs') || '').split(',').filter(Boolean).slice(0, 50);
  const catalog = await getCatalog();
  const products = slugs.map((s) => catalog.find((p) => p.slug === s)).filter(Boolean);
  return NextResponse.json({ products });
}
