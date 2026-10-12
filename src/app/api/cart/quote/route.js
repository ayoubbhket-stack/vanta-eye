import { z } from 'zod';
import { handler, ok } from '@/lib/http';
import { quote } from '@/lib/orders';
import { cartItems } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const schema = z.object({ items: cartItems, code: z.string().max(40).optional(), region: z.string().max(60).optional(), paymentMethod: z.string().max(10).optional(), phone: z.string().max(30).optional() });

export const POST = handler(async (req) => {
  const body = schema.parse(await req.json());
  const q = await quote(body);
  // strip internal ids before returning
  return ok({ ...q, lines: q.lines.map(({ categoryId, collectionIds, unitCost, ...l }) => l) });
});
