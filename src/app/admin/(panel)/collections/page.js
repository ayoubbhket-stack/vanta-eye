import { asc, eq, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { requireAdminPage } from '@/lib/auth';
import TaxonomyManager from '@/components/admin/TaxonomyManager';

export const metadata = { title: 'Categories & collections' };

export default async function Collections() {
  await requireAdminPage('products.write');
  const db = await getDb();
  const [cats, cols, links, products] = await Promise.all([
    db.select({ c: s.categories, n: sql`(select count(*) from products p where p.category_id = "categories"."id")::int` }).from(s.categories).orderBy(asc(s.categories.sortOrder)),
    db.select().from(s.collections).orderBy(asc(s.collections.sortOrder)),
    db.select().from(s.productCollections),
    db.select({ id: s.products.id, name: s.products.name, status: s.products.status }).from(s.products).orderBy(s.products.name),
  ]);
  return (
    <TaxonomyManager
      categories={cats.map(({ c, n }) => ({ ...c, count: n }))}
      collections={cols.map((c) => ({ ...c, productIds: links.filter((l) => l.collectionId === c.id).map((l) => l.productId) }))}
      products={products}
    />
  );
}
