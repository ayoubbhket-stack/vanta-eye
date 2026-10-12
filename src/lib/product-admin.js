// Create/update products from the admin editor in one transaction.
import 'server-only';
import { z } from 'zod';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { HttpError } from './auth';
import { FRAME_SHAPES } from './three/glasses';

const money = z.coerce.number().min(0, 'Must be 0 or more.').max(10000000).transform((v) => Math.round(v * 100));
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #FF6A00.');

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Enter a product name.').max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes.').max(120),
  sku: z.string().trim().toUpperCase().min(2, 'Enter a SKU.').max(40),
  description: z.string().trim().max(5000).default(''),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  collectionIds: z.array(z.coerce.number().int().positive()).default([]),
  price: money,
  salePrice: money.nullable().optional(),
  costPrice: money.nullable().optional(),
  frameShape: z.enum(FRAME_SHAPES),
  material: z.string().trim().max(200).default(''),
  specs: z.record(z.string().max(40), z.string().max(120)).default({}),
  modelMediaId: z.string().uuid().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  featured: z.boolean().default(false),
  newArrival: z.boolean().default(false),
  seoTitle: z.string().trim().max(70, 'Keep the SEO title under 70 characters.').default(''),
  seoDescription: z.string().trim().max(170, 'Keep the meta description under 170 characters.').default(''),
  images: z.array(z.object({ mediaId: z.string().uuid(), alt: z.string().trim().max(200).default(''), frameColor: z.string().trim().max(60).nullable().optional() })).max(40).default([]),
  variants: z.array(z.object({
    id: z.number().int().positive().optional(),
    sku: z.string().trim().toUpperCase().min(2, 'Variant SKU required.').max(60),
    frameColor: z.string().trim().min(1, 'Frame colour required.').max(60), frameHex: hex,
    lensColor: z.string().trim().min(1, 'Lens colour required.').max(60), lensHex: hex,
    size: z.string().trim().min(1).max(10),
    stock: z.coerce.number().int().min(0, 'Stock cannot be negative.').max(100000),
    stockOriginal: z.coerce.number().int().optional(), // stock when the editor loaded; lets concurrent sales be preserved
    active: z.boolean().default(true),
  })).min(1, 'Add at least one variant.').max(200),
}).superRefine((d, ctx) => {
  if (d.salePrice != null && d.salePrice >= d.price) ctx.addIssue({ path: ['salePrice'], code: 'custom', message: 'Sale price must be lower than the price.' });
  const combos = new Set(); const skus = new Set();
  d.variants.forEach((v, i) => {
    const k = `${v.frameColor}|${v.lensColor}|${v.size}`.toLowerCase();
    if (combos.has(k)) ctx.addIssue({ path: ['variants', i, 'size'], code: 'custom', message: 'Duplicate frame/lens/size combination.' });
    if (skus.has(v.sku)) ctx.addIssue({ path: ['variants', i, 'sku'], code: 'custom', message: 'Duplicate variant SKU.' });
    combos.add(k); skus.add(v.sku);
  });
  if (d.status === 'published' && !d.images.length) ctx.addIssue({ path: ['images'], code: 'custom', message: 'Add at least one image before publishing.' });
});

export async function saveProduct(id, input, adminUserId) {
  const d = productSchema.parse(input);
  const db = await getDb();
  return db.transaction(async (tx) => {
    const values = {
      name: d.name, slug: d.slug, sku: d.sku, description: d.description, categoryId: d.categoryId || null,
      price: d.price, salePrice: d.salePrice ?? null, costPrice: d.costPrice ?? null, frameShape: d.frameShape, material: d.material,
      specs: d.specs, modelMediaId: d.modelMediaId || null, status: d.status, featured: d.featured, newArrival: d.newArrival,
      seoTitle: d.seoTitle, seoDescription: d.seoDescription, updatedAt: new Date(),
    };
    let pid = id;
    if (pid) {
      const [ex] = await tx.select({ id: s.products.id }).from(s.products).where(eq(s.products.id, pid));
      if (!ex) throw new HttpError(404, 'Product not found.');
      await tx.update(s.products).set(values).where(eq(s.products.id, pid));
    } else {
      const [row] = await tx.insert(s.products).values(values).returning({ id: s.products.id });
      pid = row.id;
    }
    // collections
    await tx.delete(s.productCollections).where(eq(s.productCollections.productId, pid));
    for (const cid of [...new Set(d.collectionIds)]) await tx.insert(s.productCollections).values({ productId: pid, collectionId: cid });
    // images (ordered)
    await tx.delete(s.productImages).where(eq(s.productImages.productId, pid));
    for (const [i, im] of d.images.entries()) await tx.insert(s.productImages).values({ productId: pid, mediaId: im.mediaId, alt: im.alt, frameColor: im.frameColor || null, sortOrder: i });
    // variants: update existing, insert new, deactivate removed (kept for order history)
    const existing = await tx.select().from(s.productVariants).where(eq(s.productVariants.productId, pid)).for('update');
    const keepIds = d.variants.filter((v) => v.id).map((v) => v.id);
    const removed = existing.filter((v) => !keepIds.includes(v.id));
    if (removed.length) {
      // free up SKU/combos of removed variants, then retire them
      for (const v of removed) await tx.update(s.productVariants).set({ active: false, sku: `${v.sku}-RET${v.id}`, size: `${v.size}~${v.id}` }).where(eq(s.productVariants.id, v.id));
    }
    for (const v of d.variants) {
      const cur = existing.find((e) => e.id === v.id);
      if (cur) {
        // apply the editor's change as a delta so sales made meanwhile are not overwritten
        const next = Math.max(0, v.stockOriginal != null ? cur.stock + (v.stock - v.stockOriginal) : v.stock);
        await tx.update(s.productVariants).set({ sku: v.sku, frameColor: v.frameColor, frameHex: v.frameHex, lensColor: v.lensColor, lensHex: v.lensHex, size: v.size, active: v.active, stock: next }).where(eq(s.productVariants.id, cur.id));
        if (next !== cur.stock) await tx.insert(s.stockMovements).values({ variantId: cur.id, delta: next - cur.stock, stockAfter: next, reason: 'adjustment', note: 'Set in product editor', adminUserId });
      } else {
        const [nv] = await tx.insert(s.productVariants).values({ productId: pid, sku: v.sku, frameColor: v.frameColor, frameHex: v.frameHex, lensColor: v.lensColor, lensHex: v.lensHex, size: v.size, stock: v.stock, active: v.active }).returning();
        await tx.insert(s.stockMovements).values({ variantId: nv.id, delta: v.stock, stockAfter: v.stock, reason: 'initial', note: 'Variant created', adminUserId });
      }
    }
    return pid;
  });
}

export async function deleteProduct(id) {
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql`count(*)::int` }).from(s.orderItems).where(eq(s.orderItems.productId, id));
  if (n > 0) {
    await db.update(s.products).set({ status: 'archived', updatedAt: new Date() }).where(eq(s.products.id, id));
    return { archived: true };
  }
  await db.delete(s.products).where(eq(s.products.id, id));
  return { deleted: true };
}
