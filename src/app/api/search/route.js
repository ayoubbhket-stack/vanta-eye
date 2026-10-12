import { NextResponse } from 'next/server';
import { filterProducts, getCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const q = new URL(req.url).searchParams.get('q') || '';
  if (q.trim().length < 2) return NextResponse.json({ results: [] });
  const list = filterProducts(await getCatalog(), { q, sort: 'featured' }).slice(0, 6);
  return NextResponse.json({ results: list.map((p) => ({ slug: p.slug, name: p.name, finalPrice: p.finalPrice, categoryName: p.categoryName, frameShape: p.frameShape, image: p.images[0]?.url })) });
}
