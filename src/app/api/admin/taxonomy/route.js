import { z } from 'zod';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { HttpError, requireAdminApi } from '@/lib/auth';
import { handler, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes.').max(80);
const cat = z.object({ name: z.string().trim().min(2, 'Enter a name.').max(80), slug, description: z.string().trim().max(500).default(''), published: z.boolean().default(true) });
const col = cat.extend({ tagline: z.string().trim().max(120).default(''), theme: z.enum(['signature', 'sport', 'minimal', 'retro', 'limited']), coverMediaId: z.string().uuid().nullable().optional(), featuredHome: z.boolean().default(true), productIds: z.array(z.number().int()).optional() });

const body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), type: z.enum(['category', 'collection']), data: z.any() }),
  z.object({ action: z.literal('update'), type: z.enum(['category', 'collection']), id: z.number().int(), data: z.any() }),
  z.object({ action: z.literal('delete'), type: z.enum(['category', 'collection']), id: z.number().int() }),
  z.object({ action: z.literal('reorder'), type: z.enum(['category', 'collection']), ids: z.array(z.number().int()) }),
]);

export const POST = handler(async (req) => {
  await requireAdminApi('products.write');
  const b = body.parse(await req.json());
  const db = await getDb();
  const table = b.type === 'category' ? s.categories : s.collections;
  if (b.action === 'reorder') {
    await db.transaction(async (tx) => { for (const [i, id] of b.ids.entries()) await tx.update(table).set({ sortOrder: i + 1 }).where(eq(table.id, id)); });
    return ok({ ok: true });
  }
  if (b.action === 'delete') {
    if (b.type === 'category') {
      const [{ n }] = await db.select({ n: sql`count(*)::int` }).from(s.products).where(eq(s.products.categoryId, b.id));
      if (n) throw new HttpError(409, `${n} product(s) use this category. Move them to another category first.`);
    }
    await db.delete(table).where(eq(table.id, b.id));
    return ok({ ok: true });
  }
  const data = (b.type === 'category' ? cat : col).parse(b.data);
  const { productIds, ...values } = data;
  return ok(await db.transaction(async (tx) => {
    let id = b.id;
    if (b.action === 'create') {
      const [{ max }] = await tx.select({ max: sql`coalesce(max(sort_order),0)::int` }).from(table);
      [{ id }] = await tx.insert(table).values({ ...values, sortOrder: max + 1 }).returning({ id: table.id });
    } else await tx.update(table).set(values).where(eq(table.id, id));
    if (b.type === 'collection' && productIds) {
      await tx.delete(s.productCollections).where(eq(s.productCollections.collectionId, id));
      for (const pid of [...new Set(productIds)]) await tx.insert(s.productCollections).values({ productId: pid, collectionId: id });
    }
    return { id };
  }));
});
