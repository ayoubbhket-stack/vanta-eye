// Loads the sample catalogue, collections, imagery, 3D models and default
// content into the database. Safe to run once; refuses to run on a database
// that already has products unless you pass --force (which wipes catalogue data).
import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { connect } from './db.mjs';
import { categories, collections, products, colorTable, stockFor, sampleReviews } from './catalog.mjs';
import { DEFAULTS } from '../src/lib/defaults.js';

const { db, close, schema: s } = await connect();
const force = process.argv.includes('--force');
const assets = path.resolve('seed-assets');

const [{ n }] = (await db.execute(sql`select count(*)::int as n from products`)).rows;
if (n > 0 && !force) {
  console.log(`Database already has ${n} products. Run with --force to wipe catalogue data and reseed.`);
  await close();
  process.exit(0);
}
if (force) {
  await db.execute(sql`truncate order_items, order_events, payments, discount_redemptions, orders, customers, stock_movements, reviews, product_images, product_variants, product_collections, products, collections, categories, discounts, media restart identity cascade`);
}

let exec = db;
async function putMedia(rel, mime) {
  const file = path.join(assets, rel);
  const data = fs.readFileSync(file);
  const [m] = await exec.insert(s.media).values({ filename: path.basename(file), mime, size: data.length, data }).returning({ id: s.media.id });
  return m.id;
}

await db.transaction(async (tx) => {
  exec = tx;
  const catIds = {};
  for (const c of categories) {
    const [row] = await tx.insert(s.categories).values(c).returning();
    catIds[c.slug] = row.id;
  }
  const colIds = {};
  for (const c of collections) {
    const coverMediaId = await putMedia(`campaign/col-${c.slug}.jpg`, 'image/jpeg');
    const [row] = await tx.insert(s.collections).values({ ...c, coverMediaId }).returning();
    colIds[c.slug] = row.id;
  }
  const modelIds = {};
  for (const f of fs.readdirSync(path.join(assets, 'models'))) modelIds[f.replace('.glb', '')] = await putMedia(`models/${f}`, 'model/gltf-binary');

  let t = Date.now() - products.length * 86400000;
  for (const p of products) {
    t += 86400000;
    const [prod] = await tx.insert(s.products).values({
      name: p.name, slug: p.slug, sku: p.sku, description: p.description, categoryId: catIds[p.category],
      price: p.price * 100, salePrice: p.salePrice ? p.salePrice * 100 : null, costPrice: Math.round(p.price * 0.38) * 100, frameShape: p.shape, material: p.material,
      specs: p.specs, modelMediaId: modelIds[p.clear ? `${p.shape}-optical` : p.shape] || null, status: 'published',
      featured: !!p.featured, newArrival: !!p.newArrival,
      seoTitle: `${p.name} ${p.category === 'eyeglasses' ? 'Eyeglasses' : 'Sunglasses'}`, seoDescription: p.description.slice(0, 155),
      createdAt: new Date(t), updatedAt: new Date(t),
    }).returning();
    for (const c of p.collections) await tx.insert(s.productCollections).values({ productId: prod.id, collectionId: colIds[c] });
    let order = 0;
    const frames = [...new Set(p.pairs.map(([f]) => f))];
    for (const fk of frames) {
      const [fname] = colorTable.C[fk];
      for (const angle of ['front', 'side', 'top']) {
        const rel = `products/${p.slug}-${fk}-${angle}.jpg`;
        if (!fs.existsSync(path.join(assets, rel))) continue;
        const mediaId = await putMedia(rel, 'image/jpeg');
        await tx.insert(s.productImages).values({ productId: prod.id, mediaId, alt: `${p.name} in ${fname}, ${angle} view`, frameColor: fname, sortOrder: order++ });
      }
    }
    for (const [fk, lk] of p.pairs) {
      for (const size of p.sizes) {
        const sku = `${p.sku}-${fk.toUpperCase().slice(0, 3)}-${lk.toUpperCase().slice(0, 3)}-${size}`;
        const stock = p.soldOut ? 0 : stockFor(sku);
        const [v] = await tx.insert(s.productVariants).values({
          productId: prod.id, sku, frameColor: colorTable.C[fk][0], frameHex: colorTable.C[fk][1],
          lensColor: colorTable.L[lk][0], lensHex: colorTable.L[lk][1], size, stock,
        }).returning();
        await tx.insert(s.stockMovements).values({ variantId: v.id, delta: stock, stockAfter: stock, reason: 'initial', note: 'Opening stock (seed)' });
      }
    }
  }
  // Sample reviews are clearly labelled; delete them from Admin → Inbox → Reviews before launch.
  for (const [slug, , city, rating, title, body] of sampleReviews) {
    const [{ id }] = (await tx.execute(sql`select id from products where slug = ${slug}`)).rows;
    await tx.insert(s.reviews).values({ productId: id, name: 'Sample review', city, rating, title, body, status: 'approved' });
  }
  await tx.insert(s.discounts).values([
    { code: 'WELCOME10', description: '10% off your first order', type: 'percent', value: 10, minOrder: 150000, perCustomerOnce: true },
    { code: 'SPORT500', description: 'EGP 500 off the Sport collection', type: 'fixed', value: 50000, appliesTo: 'collection', targetId: colIds.sport, usageLimit: 100 },
  ]);
  // default content
  const heroImage = await putMedia('campaign/hero-poster.jpg', 'image/jpeg');
  const campA = await putMedia('campaign/campaign-a.jpg', 'image/jpeg');
  const campB = await putMedia('campaign/campaign-b.jpg', 'image/jpeg');
  const aboutImgs = [await putMedia('campaign/about-macro.jpg', 'image/jpeg'), await putMedia('campaign/about-wire.jpg', 'image/jpeg'), await putMedia('campaign/about-lens.jpg', 'image/jpeg')];
  const home = structuredClone(DEFAULTS.home);
  home.hero.imageMediaId = heroImage;
  home.campaignImages = [campA, campB];
  const about = { ...DEFAULTS.about, images: aboutImgs };
  for (const [key, value] of Object.entries({ ...DEFAULTS, home, about })) {
    await tx.insert(s.settings).values({ key, value }).onConflictDoUpdate({ target: s.settings.key, set: { value } });
  }
});

console.log(`✓ Seeded ${products.length} products, ${collections.length} collections and default content.`);
await close();
