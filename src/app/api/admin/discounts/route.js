import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { getDb, schema as s } from '@/db';
import { HttpError, requireAdminApi } from '@/lib/auth';
import { handler, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

const data = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Use 3–30 letters, numbers, dashes or underscores.'),
  description: z.string().trim().max(200).default(''),
  type: z.enum(['percent', 'fixed']),
  value: z.coerce.number().positive('Must be more than 0.'),
  minOrder: z.coerce.number().min(0).default(0),
  startsAt: z.string().nullable().optional(), endsAt: z.string().nullable().optional(),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  perCustomerOnce: z.boolean().default(false),
  appliesTo: z.enum(['all', 'category', 'collection']).default('all'),
  targetId: z.coerce.number().int().positive().nullable().optional(),
  active: z.boolean().default(true),
}).superRefine((d, ctx) => {
  if (d.type === 'percent' && d.value > 100) ctx.addIssue({ path: ['value'], code: 'custom', message: 'A percentage cannot exceed 100.' });
  if (d.appliesTo !== 'all' && !d.targetId) ctx.addIssue({ path: ['targetId'], code: 'custom', message: 'Choose which category or collection.' });
  if (d.startsAt && d.endsAt && new Date(d.startsAt) > new Date(d.endsAt)) ctx.addIssue({ path: ['endsAt'], code: 'custom', message: 'End date must be after the start date.' });
});
const toRow = (d) => ({
  ...d, value: d.type === 'fixed' ? Math.round(d.value * 100) : Math.round(d.value), minOrder: Math.round(d.minOrder * 100),
  startsAt: d.startsAt ? new Date(d.startsAt) : null, endsAt: d.endsAt ? new Date(d.endsAt) : null,
  usageLimit: d.usageLimit ?? null, targetId: d.appliesTo === 'all' ? null : d.targetId,
});

export const POST = handler(async (req) => {
  await requireAdminApi('discounts.write');
  const b = await req.json();
  const db = await getDb();
  if (b.action === 'delete') {
    const [{ n }] = await db.select({ n: sql`count(*)::int` }).from(s.discountRedemptions).where(eq(s.discountRedemptions.discountId, b.id));
    if (n) { await db.update(s.discounts).set({ active: false }).where(eq(s.discounts.id, b.id)); return ok({ disabled: true }); }
    await db.delete(s.discounts).where(eq(s.discounts.id, b.id));
    return ok({ deleted: true });
  }
  if (b.action === 'toggle') { await db.update(s.discounts).set({ active: !!b.active }).where(eq(s.discounts.id, b.id)); return ok({ ok: true }); }
  const row = toRow(data.parse(b.data));
  if (b.id) {
    const [d] = await db.update(s.discounts).set(row).where(eq(s.discounts.id, b.id)).returning();
    if (!d) throw new HttpError(404, 'Discount not found.');
    return ok({ id: d.id });
  }
  const [d] = await db.insert(s.discounts).values(row).returning();
  return ok({ id: d.id }, { status: 201 });
});
