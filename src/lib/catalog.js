// Storefront catalogue queries. Everything here reads published data only.
import 'server-only';
import { cache } from 'react';
import { and, asc, desc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { effectivePrice } from './money';

export const mediaUrl = (id) => (id ? `/api/media/${id}` : null);

function shapeProduct(p, { variants, images, cols, category, ratings }) {
  const vs = variants.filter((v) => v.productId === p.id && v.active);
  const ims = images.filter((i) => i.productId === p.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const uniq = (arr, key) => [...new Map(arr.map((x) => [x[key], x])).values()];
  const totalStock = vs.reduce((n, v) => n + v.stock, 0);
  const r = ratings?.get(p.id);
  return {
    id: p.id, name: p.name, slug: p.slug, sku: p.sku, description: p.description,
    price: p.price, salePrice: p.salePrice, finalPrice: effectivePrice(p),
    category: category?.slug || null, categoryName: category?.name || '',
    collections: cols.filter((c) => c.productId === p.id).map((c) => c.slug),
    frameShape: p.frameShape, material: p.material, specs: p.specs || {},
    featured: p.featured, newArrival: p.newArrival, status: p.status,
    createdAt: new Date(p.createdAt).toISOString(), updatedAt: new Date(p.updatedAt).toISOString(),
    modelUrl: mediaUrl(p.modelMediaId),
    seoTitle: p.seoTitle, seoDescription: p.seoDescription,
    images: ims.map((i) => ({ id: i.id, url: mediaUrl(i.mediaId), alt: i.alt || p.name, frameColor: i.frameColor })),
    frameColors: uniq(vs.map((v) => ({ name: v.frameColor, hex: v.frameHex })), 'name'),
    lensColors: uniq(vs.map((v) => ({ name: v.lensColor, hex: v.lensHex })), 'name'),
    sizes: [...new Set(vs.map((v) => v.size))],
    variants: vs.map((v) => ({ id: v.id, sku: v.sku, frameColor: v.frameColor, frameHex: v.frameHex, lensColor: v.lensColor, lensHex: v.lensHex, size: v.size, stock: v.stock })),
    totalStock, inStock: totalStock > 0,
    rating: r ? { avg: r.avg, count: r.count } : null,
  };
}

/** Load products (default: published) with all relations, shaped for the UI. */
export async function loadProducts({ ids, statuses = ['published'] } = {}) {
  const db = await getDb();
  const where = [inArray(s.products.status, statuses)];
  if (ids) where.push(ids.length ? inArray(s.products.id, ids) : sql`false`);
  const prods = await db.select().from(s.products).where(and(...where)).orderBy(desc(s.products.createdAt));
  if (!prods.length) return [];
  const pids = prods.map((p) => p.id);
  const [variants, images, cols, cats, ratingRows] = await Promise.all([
    db.select().from(s.productVariants).where(inArray(s.productVariants.productId, pids)).orderBy(asc(s.productVariants.id)),
    db.select().from(s.productImages).where(inArray(s.productImages.productId, pids)),
    db.select({ productId: s.productCollections.productId, slug: s.collections.slug })
      .from(s.productCollections).innerJoin(s.collections, eq(s.productCollections.collectionId, s.collections.id))
      .where(and(inArray(s.productCollections.productId, pids), eq(s.collections.published, true))),
    db.select().from(s.categories),
    db.select({ productId: s.reviews.productId, avg: sql`round(avg(${s.reviews.rating})::numeric, 1)`.mapWith(Number), count: sql`count(*)`.mapWith(Number) })
      .from(s.reviews).where(and(inArray(s.reviews.productId, pids), eq(s.reviews.status, 'approved'))).groupBy(s.reviews.productId),
  ]);
  const ratings = new Map(ratingRows.map((r) => [r.productId, r]));
  const catMap = new Map(cats.map((c) => [c.id, c]));
  return prods
    // storefront: hide products whose category is hidden
    .filter((p) => statuses.join() !== 'published' || !p.categoryId || catMap.get(p.categoryId)?.published !== false)
    .map((p) => shapeProduct(p, { variants, images, cols, category: catMap.get(p.categoryId), ratings }));
}

export const getCatalog = cache(() => loadProducts());

export async function getProductBySlug(slug, { includeDrafts = false } = {}) {
  const db = await getDb();
  const [p] = await db.select({ id: s.products.id, status: s.products.status }).from(s.products).where(eq(s.products.slug, slug));
  if (!p) return null;
  if (!includeDrafts && p.status !== 'published') return null;
  const [shaped] = await loadProducts({ ids: [p.id], statuses: ['published', 'draft', 'archived'] });
  return shaped || null;
}

export const getCategories = cache(async () => {
  const db = await getDb();
  return db.select().from(s.categories).where(eq(s.categories.published, true)).orderBy(asc(s.categories.sortOrder));
});

export const getCollections = cache(async () => {
  const db = await getDb();
  const rows = await db.select().from(s.collections).where(eq(s.collections.published, true)).orderBy(asc(s.collections.sortOrder));
  const catalog = await getCatalog();
  return rows.map((c) => ({
    ...c, coverUrl: mediaUrl(c.coverMediaId),
    products: catalog.filter((p) => p.collections.includes(c.slug)),
  }));
});

/** Best sellers by units in non-cancelled orders; falls back to featured. */
export async function getBestSellers(limit = 8, manualSlugs = []) {
  const catalog = await getCatalog();
  if (manualSlugs?.length) return manualSlugs.map((sl) => catalog.find((p) => p.slug === sl)).filter(Boolean).slice(0, limit);
  const db = await getDb();
  const rows = await db.select({ productId: s.orderItems.productId, units: sql`sum(${s.orderItems.qty})`.mapWith(Number) })
    .from(s.orderItems).innerJoin(s.orders, eq(s.orderItems.orderId, s.orders.id))
    .where(notInArray(s.orders.status, ['cancelled', 'refunded']))
    .groupBy(s.orderItems.productId).orderBy(desc(sql`sum(${s.orderItems.qty})`)).limit(limit);
  const ranked = rows.map((r) => catalog.find((p) => p.id === r.productId)).filter(Boolean);
  const fill = catalog.filter((p) => p.featured && !ranked.includes(p));
  return [...ranked, ...fill].slice(0, limit);
}

export async function getApprovedReviews({ productId, limit = 12 } = {}) {
  const db = await getDb();
  const where = [eq(s.reviews.status, 'approved')];
  if (productId) where.push(eq(s.reviews.productId, productId));
  return db.select({ r: s.reviews, productName: s.products.name, productSlug: s.products.slug })
    .from(s.reviews).innerJoin(s.products, eq(s.reviews.productId, s.products.id))
    .where(and(...where)).orderBy(desc(s.reviews.createdAt)).limit(limit)
    .then((rows) => rows.map(({ r, productName, productSlug }) => ({ ...r, productName, productSlug })));
}

/** Filtering/sorting used by the shop page. Pure function over the catalog. */
export function filterProducts(list, q) {
  let out = list;
  const term = (q.q || '').trim().toLowerCase();
  if (term) {
    const words = term.split(/\s+/);
    out = out.filter((p) => {
      const hay = [p.name, p.sku, p.description, p.frameShape, p.categoryName, p.material, ...p.frameColors.map((c) => c.name), ...p.lensColors.map((c) => c.name), ...p.collections].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }
  const multi = (v) => (v ? String(v).split(',').filter(Boolean) : []);
  const cats = multi(q.category); if (cats.length) out = out.filter((p) => cats.includes(p.category));
  const cols = multi(q.collection); if (cols.length) out = out.filter((p) => p.collections.some((c) => cols.includes(c)));
  const shapes = multi(q.shape); if (shapes.length) out = out.filter((p) => shapes.includes(p.frameShape));
  const fcs = multi(q.frame); if (fcs.length) out = out.filter((p) => p.frameColors.some((c) => fcs.includes(c.name)));
  const lcs = multi(q.lens); if (lcs.length) out = out.filter((p) => p.lensColors.some((c) => lcs.includes(c.name)));
  if (q.min) out = out.filter((p) => p.finalPrice >= Number(q.min) * 100);
  if (q.max) out = out.filter((p) => p.finalPrice <= Number(q.max) * 100);
  if (q.stock === 'in') out = out.filter((p) => p.inStock);
  if (q.stock === 'out') out = out.filter((p) => !p.inStock);
  if (q.sale === '1') out = out.filter((p) => p.salePrice != null);
  const sorters = {
    featured: (a, b) => (b.featured - a.featured) || (b.inStock - a.inStock) || (new Date(b.createdAt) - new Date(a.createdAt)),
    newest: (a, b) => (b.newArrival - a.newArrival) || (new Date(b.createdAt) - new Date(a.createdAt)),
    'price-asc': (a, b) => a.finalPrice - b.finalPrice,
    'price-desc': (a, b) => b.finalPrice - a.finalPrice,
  };
  return [...out].sort(sorters[q.sort] || sorters.featured);
}

export function facetOptions(list) {
  const uniq = (arr) => [...new Map(arr.map((x) => [x.name, x])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const prices = list.map((p) => p.finalPrice);
  return {
    shapes: [...new Set(list.map((p) => p.frameShape))].sort(),
    frameColors: uniq(list.flatMap((p) => p.frameColors)),
    lensColors: uniq(list.flatMap((p) => p.lensColors)),
    priceMin: prices.length ? Math.floor(Math.min(...prices) / 100) : 0,
    priceMax: prices.length ? Math.ceil(Math.max(...prices) / 100) : 0,
  };
}
