// Reporting queries. Every figure is computed from stored orders.
// "Revenue" = order totals of orders that are not cancelled/refunded.
// "Collected" = orders whose payment is recorded as paid.
// "Gross profit (est.)" = item revenue − unit cost × qty − discounts, for items
// that have a cost price; shipping and operating costs are not included.
import 'server-only';
import { and, desc, eq, gte, inArray, lt, notInArray, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';

export const TZ = 'Africa/Cairo';
const TZSQL = sql.raw(`'${TZ}'`);
const VOID = ['cancelled', 'refunded'];

export function parseRange(params) {
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const preset = params.range || (params.from || params.to ? 'custom' : '30d');
  let from; let to = iso(today);
  if (preset === '7d') from = iso(new Date(today.getTime() - 6 * 86400000));
  else if (preset === '90d') from = iso(new Date(today.getTime() - 89 * 86400000));
  else if (preset === 'month') from = iso(new Date(today.getFullYear(), today.getMonth(), 1));
  else if (preset === 'year') from = iso(new Date(today.getFullYear(), 0, 1));
  else if (preset === 'custom') { from = params.from || iso(new Date(today.getTime() - 29 * 86400000)); to = params.to || to; }
  else from = iso(new Date(today.getTime() - 29 * 86400000));
  if (from > to) [from, to] = [to, from];
  // boundaries as Cairo-local midnight
  const start = sql`(${from}::date)::timestamp at time zone ${TZSQL}`;
  const end = sql`((${to}::date + 1)::date)::timestamp at time zone ${TZSQL}`;
  return { preset, from, to, start, end };
}

const inRange = (r) => and(gte(s.orders.createdAt, r.start), lt(s.orders.createdAt, r.end));

export async function summary(r) {
  const db = await getDb();
  const [byStatus, money, profit, payMethods] = await Promise.all([
    db.select({ status: s.orders.status, n: sql`count(*)::int` }).from(s.orders).where(inRange(r)).groupBy(s.orders.status),
    db.select({
      revenue: sql`coalesce(sum(${s.orders.total}) filter (where ${s.orders.status} not in ('cancelled','refunded')), 0)::bigint`.mapWith(Number),
      orders: sql`count(*) filter (where ${s.orders.status} not in ('cancelled','refunded'))::int`,
      collected: sql`coalesce(sum(${s.orders.total}) filter (where ${s.orders.paymentStatus} = 'paid'), 0)::bigint`.mapWith(Number),
      refunded: sql`coalesce(sum(${s.orders.total}) filter (where ${s.orders.status} = 'refunded'), 0)::bigint`.mapWith(Number),
      cancelled: sql`coalesce(sum(${s.orders.total}) filter (where ${s.orders.status} = 'cancelled'), 0)::bigint`.mapWith(Number),
      shipping: sql`coalesce(sum(${s.orders.shippingFee}) filter (where ${s.orders.status} not in ('cancelled','refunded')), 0)::bigint`.mapWith(Number),
      discounts: sql`coalesce(sum(${s.orders.discountTotal}) filter (where ${s.orders.status} not in ('cancelled','refunded')), 0)::bigint`.mapWith(Number),
      tax: sql`coalesce(sum(${s.orders.taxTotal}) filter (where ${s.orders.status} not in ('cancelled','refunded')), 0)::bigint`.mapWith(Number),
    }).from(s.orders).where(inRange(r)),
    db.select({
      margin: sql`coalesce(sum(${s.orderItems.lineTotal} - ${s.orderItems.unitCost} * ${s.orderItems.qty}) filter (where ${s.orderItems.unitCost} is not null), 0)::bigint`.mapWith(Number),
      costed: sql`coalesce(sum(${s.orderItems.lineTotal}) filter (where ${s.orderItems.unitCost} is not null), 0)::bigint`.mapWith(Number),
      itemRevenue: sql`coalesce(sum(${s.orderItems.lineTotal}), 0)::bigint`.mapWith(Number),
      units: sql`coalesce(sum(${s.orderItems.qty}), 0)::int`,
    }).from(s.orderItems).innerJoin(s.orders, eq(s.orderItems.orderId, s.orders.id)).where(and(inRange(r), notInArray(s.orders.status, VOID))),
    db.select({ method: s.orders.paymentMethod, n: sql`count(*)::int`, total: sql`coalesce(sum(${s.orders.total}),0)::bigint`.mapWith(Number), paid: sql`coalesce(sum(${s.orders.total}) filter (where ${s.orders.paymentStatus}='paid'),0)::bigint`.mapWith(Number) })
      .from(s.orders).where(and(inRange(r), notInArray(s.orders.status, VOID))).groupBy(s.orders.paymentMethod),
  ]);
  const m = money[0]; const p = profit[0];
  const statuses = Object.fromEntries(byStatus.map((x) => [x.status, x.n]));
  const totalOrders = byStatus.reduce((n, x) => n + x.n, 0);
  return {
    statuses, totalOrders, ...m, units: p.units,
    aov: m.orders ? Math.round(m.revenue / m.orders) : 0,
    grossProfit: p.margin - Math.round(m.discounts * (p.itemRevenue ? p.costed / p.itemRevenue : 0)),
    costCoverage: p.itemRevenue ? p.costed / p.itemRevenue : 0,
    payMethods,
  };
}

export async function dailySeries(r) {
  const db = await getDb();
  const day = sql`(${s.orders.createdAt} at time zone ${TZSQL})::date`;
  const rows = await db.select({ d: sql`to_char(${day}, 'YYYY-MM-DD')`, revenue: sql`coalesce(sum(${s.orders.total}),0)::bigint`.mapWith(Number), orders: sql`count(*)::int` })
    .from(s.orders).where(and(inRange(r), notInArray(s.orders.status, VOID))).groupBy(day);
  const map = new Map(rows.map((x) => [x.d, x]));
  const out = [];
  for (let d = new Date(`${r.from}T00:00:00Z`); d <= new Date(`${r.to}T00:00:00Z`); d = new Date(d.getTime() + 86400000)) {
    const k = d.toISOString().slice(0, 10);
    out.push({ label: k, revenue: map.get(k)?.revenue || 0, orders: map.get(k)?.orders || 0 });
  }
  return out;
}

export async function topProducts(r, limit = 10) {
  const db = await getDb();
  return db.select({
    productId: s.orderItems.productId, name: s.orderItems.name,
    units: sql`sum(${s.orderItems.qty})::int`, revenue: sql`sum(${s.orderItems.lineTotal})::bigint`.mapWith(Number),
    margin: sql`sum(${s.orderItems.lineTotal} - coalesce(${s.orderItems.unitCost},0) * ${s.orderItems.qty}) filter (where ${s.orderItems.unitCost} is not null)`.mapWith(Number),
    orders: sql`count(distinct ${s.orderItems.orderId})::int`,
  }).from(s.orderItems).innerJoin(s.orders, eq(s.orderItems.orderId, s.orders.id))
    .where(and(inRange(r), notInArray(s.orders.status, VOID)))
    .groupBy(s.orderItems.productId, s.orderItems.name).orderBy(desc(sql`sum(${s.orderItems.qty})`)).limit(limit);
}

export async function discountUsage(r) {
  const db = await getDb();
  return db.select({ code: s.orders.discountCode, orders: sql`count(*)::int`, amount: sql`sum(${s.orders.discountTotal})::bigint`.mapWith(Number), revenue: sql`sum(${s.orders.total})::bigint`.mapWith(Number) })
    .from(s.orders).where(and(inRange(r), notInArray(s.orders.status, VOID), sql`${s.orders.discountCode} is not null`))
    .groupBy(s.orders.discountCode).orderBy(desc(sql`count(*)`));
}

export async function inventorySnapshot(threshold) {
  const db = await getDb();
  const rows = await db.select({ v: s.productVariants, name: s.products.name, productId: s.products.id, status: s.products.status, cost: s.products.costPrice, price: s.products.price, salePrice: s.products.salePrice })
    .from(s.productVariants).innerJoin(s.products, eq(s.productVariants.productId, s.products.id))
    .where(inArray(s.products.status, ['published', 'draft'])).orderBy(s.products.name, s.productVariants.sku);
  return {
    rows,
    low: rows.filter((x) => x.v.active && x.v.stock > 0 && x.v.stock <= threshold),
    out: rows.filter((x) => x.v.active && x.v.stock <= 0),
    units: rows.reduce((n, x) => n + Math.max(0, x.v.stock), 0),
    costValue: rows.reduce((n, x) => n + Math.max(0, x.v.stock) * (x.cost || 0), 0),
    retailValue: rows.reduce((n, x) => n + Math.max(0, x.v.stock) * (x.salePrice ?? x.price), 0),
  };
}
