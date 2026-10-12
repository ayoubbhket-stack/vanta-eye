import { requireAdminApi } from '@/lib/auth';
import { csvResponse, handler } from '@/lib/http';
import { getSetting } from '@/lib/settings';
import { inventorySnapshot } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireAdminApi('inventory.read');
  const store = await getSetting('store');
  const inv = await inventorySnapshot(store.lowStockThreshold);
  const out = [['Product', 'Status', 'SKU', 'Frame', 'Lens', 'Size', 'Active', 'Stock', 'State', 'Unit cost', 'Price']];
  for (const r of inv.rows) {
    if (/-RET\d+$/.test(r.v.sku)) continue;
    out.push([r.name, r.status, r.v.sku, r.v.frameColor, r.v.lensColor, r.v.size, r.v.active ? 'yes' : 'no', r.v.stock,
      r.v.stock <= 0 ? 'out of stock' : r.v.stock <= store.lowStockThreshold ? 'low' : 'ok', r.cost != null ? (r.cost / 100).toFixed(2) : '', ((r.salePrice ?? r.price) / 100).toFixed(2)]);
  }
  return csvResponse(`inventory-${new Date().toISOString().slice(0, 10)}.csv`, out);
});
