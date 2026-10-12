import { getCatalog, getCollections } from '@/lib/catalog';
import { siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const base = siteUrl();
  const [products, collections] = await Promise.all([getCatalog(), getCollections()]);
  const fixed = ['', '/shop', '/collections', '/about', '/contact', '/policies/shipping', '/policies/returns', '/policies/privacy', '/policies/terms', '/shop?category=sunglasses', '/shop?category=eyeglasses'];
  return [
    ...fixed.map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly', priority: p === '' ? 1 : 0.6 })),
    ...collections.map((c) => ({ url: `${base}/shop?collection=${c.slug}`, changeFrequency: 'weekly', priority: 0.6 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'weekly', priority: 0.8 })),
  ];
}
