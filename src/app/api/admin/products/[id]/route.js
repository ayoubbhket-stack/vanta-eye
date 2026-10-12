import { requireAdminApi } from '@/lib/auth';
import { handler, ok } from '@/lib/http';
import { deleteProduct, saveProduct } from '@/lib/product-admin';

export const dynamic = 'force-dynamic';

export const PUT = handler(async (req, { params }) => {
  const me = await requireAdminApi('products.write');
  const id = await saveProduct(Number(params.id), await req.json(), me.id);
  return ok({ id });
});

export const DELETE = handler(async (req, { params }) => {
  await requireAdminApi('products.write');
  return ok(await deleteProduct(Number(params.id)));
});
