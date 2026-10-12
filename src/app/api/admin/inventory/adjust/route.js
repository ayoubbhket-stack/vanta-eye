import { z } from 'zod';
import { requireAdminApi } from '@/lib/auth';
import { handler, ok } from '@/lib/http';
import { adjustStock } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req) => {
  const me = await requireAdminApi('inventory.write');
  const b = z.object({
    variantId: z.number().int().positive(), mode: z.enum(['delta', 'set']), value: z.number().int().min(-100000).max(100000),
    reason: z.enum(['restock', 'count', 'damage', 'adjustment']), note: z.string().max(300).default(''),
  }).parse(await req.json());
  const v = await adjustStock(b.variantId, { ...b, adminUserId: me.id });
  return ok({ stock: v.stock });
});
