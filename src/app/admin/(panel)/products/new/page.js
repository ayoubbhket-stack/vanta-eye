import { getDb, schema as s } from '@/db';
import { requireAdminPage } from '@/lib/auth';
import ProductEditor from '@/components/admin/ProductEditor';

export const metadata = { title: 'New product' };

export default async function NewProduct() {
  await requireAdminPage('products.write');
  const db = await getDb();
  const [cats, cols] = await Promise.all([db.select().from(s.categories).orderBy(s.categories.sortOrder), db.select().from(s.collections).orderBy(s.collections.sortOrder)]);
  return <ProductEditor categories={cats} collections={cols} />;
}
