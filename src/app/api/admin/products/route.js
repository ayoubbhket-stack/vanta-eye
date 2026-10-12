import { requireAdminApi } from '@/lib/auth';
import { handler, ok } from '@/lib/http';
import { saveProduct } from '@/lib/product-admin';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req) => {
  const me = await requireAdminApi('products.write');
  const id = await saveProduct(null, await req.json(), me.id);
  return ok({ id }, { status: 201 });
});
