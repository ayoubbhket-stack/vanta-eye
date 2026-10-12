// Pricing, checkout and order lifecycle. All totals are computed here on the
// server from database prices; client-submitted prices are never trusted.
import 'server-only';
import crypto from 'node:crypto';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { HttpError } from './auth';
import { effectivePrice } from './money';
import { getSetting } from './settings';

export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
export const PAYMENT_STATUSES = ['unpaid', 'pending', 'paid', 'failed', 'refunded'];
const TRANSITIONS = {
  pending: ['confirmed', 'processing', 'cancelled'],
  confirmed: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};
export const allowedNext = (status) => TRANSITIONS[status] || [];

export function paymobConfigured() {
  return !!(process.env.PAYMOB_SECRET_KEY && process.env.PAYMOB_PUBLIC_KEY && process.env.PAYMOB_INTEGRATION_ID && process.env.PAYMOB_HMAC_SECRET);
}

/** Load the rows needed to price a cart. `lock` adds FOR UPDATE inside a transaction. */
async function loadLines(db, items, lock = false) {
  const ids = [...new Set(items.map((i) => Number(i.variantId)).filter(Boolean))];
  if (!ids.length) return [];
  let q = db.select({ v: s.productVariants, p: s.products })
    .from(s.productVariants).innerJoin(s.products, eq(s.productVariants.productId, s.products.id))
    .where(inArray(s.productVariants.id, ids));
  if (lock) q = q.for('update', { of: s.productVariants });
  const rows = await q;
  const cols = await db.select().from(s.productCollections).where(inArray(s.productCollections.productId, rows.map((r) => r.p.id).concat(0)));
  return items.map((it) => {
    const row = rows.find((r) => r.v.id === Number(it.variantId));
    const qty = Math.max(1, Math.min(20, Math.floor(Number(it.qty) || 1)));
    if (!row) return { variantId: Number(it.variantId), qty, error: 'This item is no longer available.' };
    const { v, p } = row;
    const unit = effectivePrice(p);
    let error = null;
    if (p.status !== 'published' || !v.active) error = 'This item is no longer available.';
    else if (v.stock <= 0) error = 'Sold out.';
    else if (v.stock < qty) error = `Only ${v.stock} left in stock.`;
    return {
      variantId: v.id, productId: p.id, slug: p.slug, name: p.name, sku: v.sku, categoryId: p.categoryId,
      collectionIds: cols.filter((c) => c.productId === p.id).map((c) => c.collectionId),
      variantLabel: `${v.frameColor} / ${v.lensColor} / ${v.size}`,
      frameColor: v.frameColor, lensColor: v.lensColor, size: v.size,
      unitPrice: unit, unitCost: p.costPrice, compareAt: p.salePrice != null ? p.price : null, qty, stock: v.stock,
      lineTotal: unit * qty, error,
    };
  });
}

function evaluateDiscount(d, lines, subtotal) {
  if (!d) return { error: 'This code does not exist.' };
  const now = new Date();
  if (!d.active) return { error: 'This code is no longer active.' };
  if (d.startsAt && d.startsAt > now) return { error: 'This code is not active yet.' };
  if (d.endsAt && d.endsAt < now) return { error: 'This code has expired.' };
  if (d.usageLimit != null && d.usedCount >= d.usageLimit) return { error: 'This code has reached its usage limit.' };
  if (subtotal < d.minOrder) return { error: `Spend EGP ${(d.minOrder / 100).toLocaleString('en-US')} or more to use this code.` };
  const eligible = lines.filter((l) => !l.error && (d.appliesTo === 'all'
    || (d.appliesTo === 'category' && l.categoryId === d.targetId)
    || (d.appliesTo === 'collection' && l.collectionIds.includes(d.targetId))));
  const base = eligible.reduce((n, l) => n + l.lineTotal, 0);
  if (!base) return { error: 'This code does not apply to the items in your cart.' };
  const amount = d.type === 'percent' ? Math.round((base * Math.min(100, d.value)) / 100) : Math.min(d.value, base);
  return { amount, discount: d };
}

/**
 * Price a cart. Returns lines, subtotal, discount, shipping, tax, total and
 * any problems. Used both for the cart/checkout preview and for placing orders.
 */
export async function quote({ items = [], code, region, paymentMethod, phone }, { db: txDb, lock = false, settings } = {}) {
  const db = txDb || (await getDb());
  // settings are loaded outside any transaction (PGlite has a single connection)
  const [store, shipping] = settings ? [settings.store, settings.shipping] : await Promise.all([getSetting('store'), getSetting('shipping')]);
  const lines = await loadLines(db, items, lock);
  const subtotal = lines.filter((l) => !l.error).reduce((n, l) => n + l.lineTotal, 0);

  let discount = null; let discountError = null;
  if (code) {
    let dq = db.select().from(s.discounts).where(eq(s.discounts.code, String(code).trim().toUpperCase()));
    if (lock) dq = dq.for('update');
    const [d] = await dq;
    const r = evaluateDiscount(d, lines, subtotal);
    if (r.error) discountError = r.error;
    else if (d.perCustomerOnce && phone) {
      const used = await db.select({ id: s.discountRedemptions.id }).from(s.discountRedemptions)
        .innerJoin(s.customers, eq(s.discountRedemptions.customerId, s.customers.id))
        .innerJoin(s.orders, eq(s.discountRedemptions.orderId, s.orders.id))
        .where(and(eq(s.discountRedemptions.discountId, d.id), eq(s.customers.phone, normalizePhone(phone)), notInArray(s.orders.status, ['cancelled', 'refunded'])));
      if (used.length) discountError = 'This code can be used once per customer and has already been used.';
      else discount = { id: d.id, code: d.code, amount: r.amount, description: d.description };
    } else discount = { id: d.id, code: d.code, amount: r.amount, description: d.description };
  }
  const discountTotal = discount?.amount || 0;
  const afterDiscount = Math.max(0, subtotal - discountTotal);

  const reg = shipping.regions.find((r) => r.name === region);
  let shippingFee = null;
  if (reg) shippingFee = shipping.freeShippingOver && afterDiscount >= shipping.freeShippingOver ? 0 : reg.fee;
  const codFee = paymentMethod === 'cod' ? Number(store.codFee || 0) : 0;
  const taxRate = Number(store.taxRate || 0);
  const taxAdded = !store.taxIncluded && taxRate > 0 ? Math.round((afterDiscount * taxRate) / 100) : 0;
  const taxIncludedAmount = store.taxIncluded && taxRate > 0 ? Math.round(afterDiscount - afterDiscount / (1 + taxRate / 100)) : 0;
  const total = afterDiscount + (shippingFee || 0) + codFee + taxAdded;

  return {
    lines, subtotal, discount, discountError, discountTotal,
    shippingFee, shippingRegion: reg ? { name: reg.name, days: reg.days } : null,
    freeShippingOver: shipping.freeShippingOver, codFee, taxAdded, taxIncludedAmount, taxLabel: store.taxLabel,
    total, currency: store.currency,
    problems: lines.filter((l) => l.error).map((l) => ({ variantId: l.variantId, error: l.error })),
    onlinePaymentAvailable: !!store.paymentMethods?.online && paymobConfigured(),
    codAvailable: store.paymentMethods?.cod !== false,
  };
}

export const normalizePhone = (p) => {
  let d = String(p || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+20')) d = '0' + d.slice(3);
  else if (d.startsWith('0020')) d = '0' + d.slice(4);
  else if (d.startsWith('20') && d.length === 12) d = '0' + d.slice(2);
  return d;
};

/** Create an order atomically: re-price, lock stock, decrement, redeem discount. */
export async function placeOrder(input) {
  const db = await getDb();
  const existing = await db.select().from(s.orders).where(eq(s.orders.idempotencyKey, input.idempotencyKey));
  if (existing[0]) return { order: existing[0], duplicate: true };

  const [store, shipping] = await Promise.all([getSetting('store'), getSetting('shipping')]);
  if (input.paymentMethod === 'online' && !(store.paymentMethods?.online && paymobConfigured())) {
    throw new HttpError(422, 'Online payment is not available. Please choose cash on delivery.');
  }
  if (input.paymentMethod === 'cod' && store.paymentMethods?.cod === false) throw new HttpError(422, 'Cash on delivery is not available.');

  const phone = normalizePhone(input.phone);
  let order;
  try {
    order = await createOrderTx(db, input, phone, store, shipping);
  } catch (e) {
    if (e?.duplicateOrder) return { order: e.duplicateOrder, duplicate: true };
    // a concurrent duplicate submission with the same idempotency key lost the race
    if (e?.code === '23505' && String(e.constraint || e.detail || '').includes('idempotency')) {
      const [o] = await db.select().from(s.orders).where(eq(s.orders.idempotencyKey, input.idempotencyKey));
      if (o) return { order: o, duplicate: true };
    }
    throw e;
  }
  return { order, duplicate: false };
}

async function createOrderTx(db, input, phone, store, shipping) {
  return db.transaction(async (tx) => {
    const q = await quote({ ...input, phone }, { db: tx, lock: true, settings: { store, shipping } });
    // re-check after the stock rows are locked: a parallel request with the same key may have just committed
    const [dup] = await tx.select().from(s.orders).where(eq(s.orders.idempotencyKey, input.idempotencyKey));
    if (dup) throw Object.assign(new Error('duplicate'), { duplicateOrder: dup });
    if (!q.lines.length) throw new HttpError(422, 'Your cart is empty.');
    if (q.problems.length) throw Object.assign(new HttpError(409, 'Some items changed. Please review your cart.'), { problems: q.problems });
    if (input.code && q.discountError) throw new HttpError(422, q.discountError);
    if (q.shippingFee == null) throw new HttpError(422, 'Please choose a delivery region.');
    if (input.expectedTotal != null && Number(input.expectedTotal) !== q.total) {
      throw Object.assign(new HttpError(409, 'Prices were updated. Please review the new total and confirm again.'), { total: q.total });
    }

    // customer upsert by phone
    const [cust] = await tx.insert(s.customers).values({
      name: input.name, phone, email: input.email || '', region: input.region, city: input.city, address: input.address,
    }).onConflictDoUpdate({ target: s.customers.phone, set: { name: input.name, email: input.email || '', region: input.region, city: input.city, address: input.address } }).returning();

    const [o] = await tx.insert(s.orders).values({
      number: `tmp-${crypto.randomUUID()}`, accessToken: crypto.randomBytes(18).toString('base64url'),
      idempotencyKey: input.idempotencyKey, customerId: cust.id,
      name: input.name, phone, email: input.email || '', region: input.region, city: input.city, address: input.address,
      customerNote: input.note || '',
      subtotal: q.subtotal, discountTotal: q.discountTotal, shippingFee: q.shippingFee, codFee: q.codFee, taxTotal: q.taxAdded, total: q.total,
      discountId: q.discount?.id || null, discountCode: q.discount?.code || null,
      paymentMethod: input.paymentMethod, paymentStatus: input.paymentMethod === 'online' ? 'pending' : 'unpaid',
    }).returning();
    const number = `VE-${10000 + o.id}`;
    await tx.update(s.orders).set({ number }).where(eq(s.orders.id, o.id));

    for (const l of q.lines) {
      await tx.insert(s.orderItems).values({
        orderId: o.id, productId: l.productId, variantId: l.variantId, name: l.name, sku: l.sku,
        variantLabel: l.variantLabel, unitPrice: l.unitPrice, unitCost: l.unitCost ?? null, qty: l.qty, lineTotal: l.lineTotal,
      });
      const [v] = await tx.update(s.productVariants).set({ stock: sql`${s.productVariants.stock} - ${l.qty}` })
        .where(and(eq(s.productVariants.id, l.variantId), sql`${s.productVariants.stock} >= ${l.qty}`)).returning();
      if (!v) throw new HttpError(409, `${l.name} just sold out.`);
      await tx.insert(s.stockMovements).values({ variantId: l.variantId, delta: -l.qty, stockAfter: v.stock, reason: 'sale', orderId: o.id, note: number });
    }
    if (q.discount) {
      await tx.update(s.discounts).set({ usedCount: sql`${s.discounts.usedCount} + 1` }).where(eq(s.discounts.id, q.discount.id));
      await tx.insert(s.discountRedemptions).values({ discountId: q.discount.id, orderId: o.id, customerId: cust.id, amount: q.discountTotal });
    }
    await tx.insert(s.payments).values({
      orderId: o.id, provider: input.paymentMethod === 'online' ? 'paymob' : 'cod', status: 'pending', amount: q.total,
    });
    await tx.insert(s.orderEvents).values({ orderId: o.id, kind: 'created', toValue: 'pending', body: `Order placed (${input.paymentMethod === 'cod' ? 'cash on delivery' : 'online payment'}).` });
    return { ...o, number };
  });
}

/** Return stock for every item of an order (once). Must run inside a transaction. */
async function restoreStock(tx, order, reason, adminUserId) {
  if (order.stockRestored) return;
  const items = await tx.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id));
  for (const it of items) {
    if (!it.variantId) continue;
    const [v] = await tx.update(s.productVariants).set({ stock: sql`${s.productVariants.stock} + ${it.qty}` }).where(eq(s.productVariants.id, it.variantId)).returning();
    if (v) await tx.insert(s.stockMovements).values({ variantId: it.variantId, delta: it.qty, stockAfter: v.stock, reason, orderId: order.id, note: order.number, adminUserId });
  }
  await tx.update(s.orders).set({ stockRestored: true }).where(eq(s.orders.id, order.id));
  if (order.discountId) await tx.update(s.discounts).set({ usedCount: sql`greatest(${s.discounts.usedCount} - 1, 0)` }).where(eq(s.discounts.id, order.discountId));
}

export async function changeOrderStatus(orderId, to, { adminUserId, restock = true, note = '' } = {}) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(s.orders).where(eq(s.orders.id, orderId)).for('update');
    if (!o) throw new HttpError(404, 'Order not found.');
    if (!allowedNext(o.status).includes(to)) throw new HttpError(422, `An order that is ${o.status} cannot move to ${to}.`);
    const patch = { status: to, updatedAt: new Date() };
    if (to === 'refunded' && o.paymentStatus === 'paid') patch.paymentStatus = 'refunded';
    if (to === 'delivered' && o.paymentMethod === 'cod' && o.paymentStatus === 'unpaid') patch.paymentStatus = 'paid';
    await tx.update(s.orders).set(patch).where(eq(s.orders.id, o.id));
    if ((to === 'cancelled' || to === 'refunded') && restock) await restoreStock(tx, o, to === 'cancelled' ? 'cancel' : 'refund', adminUserId);
    if (patch.paymentStatus && patch.paymentStatus !== o.paymentStatus) {
      await tx.insert(s.payments).values({ orderId: o.id, provider: o.paymentMethod === 'cod' ? 'cod' : 'manual', status: patch.paymentStatus === 'refunded' ? 'refunded' : 'paid', amount: o.total, reference: patch.paymentStatus === 'paid' ? 'Cash collected on delivery' : 'Refund recorded' });
      await tx.insert(s.orderEvents).values({ orderId: o.id, kind: 'payment', fromValue: o.paymentStatus, toValue: patch.paymentStatus, adminUserId, body: 'Updated automatically with the order status.' });
    }
    await tx.insert(s.orderEvents).values({ orderId: o.id, kind: 'status', fromValue: o.status, toValue: to, adminUserId, body: note + ((to === 'cancelled' || to === 'refunded') ? (restock ? ' Stock returned to inventory.' : ' Stock not returned.') : '') });
    return { ...o, ...patch };
  });
}

export async function changePaymentStatus(orderId, to, { adminUserId, reference = '', raw = {}, provider = 'manual' } = {}) {
  if (!PAYMENT_STATUSES.includes(to)) throw new HttpError(422, 'Unknown payment status.');
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(s.orders).where(eq(s.orders.id, orderId)).for('update');
    if (!o) throw new HttpError(404, 'Order not found.');
    if (o.paymentStatus === to) return o;
    await tx.update(s.orders).set({ paymentStatus: to, updatedAt: new Date() }).where(eq(s.orders.id, o.id));
    await tx.insert(s.payments).values({ orderId: o.id, provider, status: to === 'unpaid' ? 'pending' : to, amount: o.total, reference, raw });
    await tx.insert(s.orderEvents).values({ orderId: o.id, kind: 'payment', fromValue: o.paymentStatus, toValue: to, adminUserId: adminUserId || null, body: reference });
    return { ...o, paymentStatus: to };
  });
}

/** Manual stock change with audit trail. mode: 'delta' | 'set'. */
export async function adjustStock(variantId, { mode = 'delta', value, reason = 'adjustment', note = '', adminUserId }) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [v] = await tx.select().from(s.productVariants).where(eq(s.productVariants.id, variantId)).for('update');
    if (!v) throw new HttpError(404, 'Variant not found.');
    const n = Math.trunc(Number(value));
    if (!Number.isFinite(n)) throw new HttpError(422, 'Enter a whole number.');
    const next = mode === 'set' ? n : v.stock + n;
    if (next < 0) throw new HttpError(422, `Stock cannot go below zero (currently ${v.stock}).`);
    if (next === v.stock) return v;
    const [u] = await tx.update(s.productVariants).set({ stock: next }).where(eq(s.productVariants.id, v.id)).returning();
    await tx.insert(s.stockMovements).values({ variantId: v.id, delta: next - v.stock, stockAfter: next, reason, note, adminUserId });
    return u;
  });
}
