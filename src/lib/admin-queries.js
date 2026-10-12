import 'server-only';
import { and, asc, desc, eq, gte, ilike, lt, or, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { TZ } from './reports';

const TZSQL = sql.raw(`'${TZ}'`);

export function orderWhere(p) {
  const w = [];
  if (p.q) {
    const t = `%${p.q.trim()}%`;
    const digits = p.q.replace(/\D/g, '');
    w.push(or(ilike(s.orders.number, t), ilike(s.orders.name, t), ilike(s.orders.email, t), ilike(s.orders.phone, digits ? `%${digits.replace(/^20/, '')}%` : t)));
  }
  if (p.status) w.push(eq(s.orders.status, p.status));
  if (p.method) w.push(eq(s.orders.paymentMethod, p.method));
  if (p.pay) w.push(eq(s.orders.paymentStatus, p.pay));
  if (p.from) w.push(gte(s.orders.createdAt, sql`(${p.from}::date)::timestamp at time zone ${TZSQL}`));
  if (p.to) w.push(lt(s.orders.createdAt, sql`((${p.to}::date + 1)::date)::timestamp at time zone ${TZSQL}`));
  return w.length ? and(...w) : undefined;
}

export async function listOrders(p, { per = 25, all = false } = {}) {
  const db = await getDb();
  const where = orderWhere(p);
  const col = { created: s.orders.createdAt, total: s.orders.total, number: s.orders.id, name: s.orders.name, status: s.orders.status }[p.sort] || s.orders.createdAt;
  const order = p.dir === 'asc' ? asc(col) : desc(col);
  const page = Math.max(1, Number(p.page) || 1);
  let q = db.select().from(s.orders).where(where).orderBy(order, desc(s.orders.id));
  if (!all) q = q.limit(per).offset((page - 1) * per);
  const [rows, [{ n }]] = await Promise.all([q, db.select({ n: sql`count(*)::int` }).from(s.orders).where(where)]);
  return { rows, total: n, page, pages: Math.ceil(n / per), per };
}
