import { requireAdminApi } from '@/lib/auth';
import { csvResponse, handler } from '@/lib/http';
import { getSetting } from '@/lib/settings';
import { dailySeries, discountUsage, inventorySnapshot, parseRange, summary, topProducts } from '@/lib/reports';

export const dynamic = 'force-dynamic';

const e = (v) => (v == null ? '' : (v / 100).toFixed(2));

export const GET = handler(async (req) => {
  await requireAdminApi('reports.read');
  const p = Object.fromEntries(new URL(req.url).searchParams);
  const r = parseRange(p);
  let out;
  if (p.type === 'products') out = [['Product', 'Units', 'Orders', 'Revenue', 'Gross margin (est.)'], ...(await topProducts(r, 1000)).map((x) => [x.name, x.units, x.orders, e(x.revenue), e(x.margin)])];
  else if (p.type === 'discounts') out = [['Code', 'Orders', 'Discount given', 'Order revenue'], ...(await discountUsage(r)).map((x) => [x.code, x.orders, e(x.amount), e(x.revenue)])];
  else if (p.type === 'payments') out = [['Method', 'Orders', 'Value', 'Collected'], ...(await summary(r)).payMethods.map((x) => [x.method, x.n, e(x.total), e(x.paid)])];
  else if (p.type === 'inventory') {
    const store = await getSetting('store');
    const inv = await inventorySnapshot(store.lowStockThreshold);
    out = [['Product', 'SKU', 'Variant', 'Stock', 'Unit cost', 'Price'], ...inv.rows.filter((x) => !/-RET\d+$/.test(x.v.sku)).map((x) => [x.name, x.v.sku, `${x.v.frameColor} / ${x.v.lensColor} / ${x.v.size}`, x.v.stock, e(x.cost), e(x.salePrice ?? x.price)])];
  } else out = [['Date', 'Orders', 'Revenue'], ...(await dailySeries(r)).map((x) => [x.label, x.orders, e(x.revenue)])];
  return csvResponse(`${p.type || 'sales'}-${r.from}-to-${r.to}.csv`, out);
});
