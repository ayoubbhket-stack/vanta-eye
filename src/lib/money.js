// All money is stored as integer piasters (1 EGP = 100 piasters).
export const toPiasters = (egp) => Math.round(Number(egp) * 100);
export const toEgp = (p) => (Number(p) || 0) / 100;

export function formatMoney(piasters, currency = 'EGP') {
  const v = toEgp(piasters);
  const s = v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return `${currency} ${s}`;
}

export const effectivePrice = (p) => (p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price);
