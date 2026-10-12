// Server-rendered admin helpers: pagination, sortable headers, status pills and charts.
import Link from 'next/link';

export function qs(params, patch) {
  const p = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v != null && v !== ''));
  for (const [k, v] of Object.entries(patch)) { if (v == null || v === '') p.delete(k); else p.set(k, String(v)); }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function SortTh({ label, k, params, base, className }) {
  const on = params.sort === k;
  const dir = on && params.dir === 'asc' ? 'desc' : 'asc';
  return (
    <th className={className} aria-sort={on ? (params.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <Link className={on ? 'on' : ''} href={`${base}${qs(params, { sort: k, dir, page: '' })}`}>{label}{on ? (params.dir === 'asc' ? ' ↑' : ' ↓') : ''}</Link>
    </th>
  );
}

export function Pager({ page, pages, total, params, base, per }) {
  const from = total ? (page - 1) * per + 1 : 0;
  return (
    <div className="pager">
      <span className="num">{from}–{Math.min(page * per, total)} of {total}</span>
      <div className="row" style={{ gap: 6 }}>
        {page > 1 ? <Link href={`${base}${qs(params, { page: page - 1 })}`}>← Prev</Link> : <span className="dis">← Prev</span>}
        <span className="num">{page} / {Math.max(1, pages)}</span>
        {page < pages ? <Link href={`${base}${qs(params, { page: page + 1 })}`}>Next →</Link> : <span className="dis">Next →</span>}
      </div>
    </div>
  );
}

export const Pill = ({ s, children }) => <span className={`pill ${s}`}>{children || s}</span>;

/** Daily revenue bars + order-count line. data: [{ label, revenue, orders }] */
export function SalesChart({ data, currency = 'EGP' }) {
  const W = 760, H = 240, P = { l: 56, r: 36, t: 14, b: 28 };
  if (!data.length) return <div className="empty-adm">No sales in this period.</div>;
  const maxR = Math.max(1, ...data.map((d) => d.revenue));
  const maxO = Math.max(1, ...data.map((d) => d.orders));
  const nice = (v) => { const p = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / p) * p; };
  const topR = nice(maxR / 100) * 100;
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const bw = Math.max(2, (iw / data.length) * 0.66);
  const x = (i) => P.l + (iw / data.length) * (i + 0.5);
  const yR = (v) => P.t + ih - (v / topR) * ih;
  const yO = (v) => P.t + ih - (v / Math.max(maxO, 1)) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const every = Math.ceil(data.length / 10);
  const fmt = (v) => (v >= 100000 ? `${Math.round(v / 100000)}k` : `${Math.round(v / 100)}`);
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Revenue and orders per day">
        {ticks.map((t) => <g key={t}><line className="grid" x1={P.l} x2={W - P.r} y1={yR(topR * t)} y2={yR(topR * t)} /><text x={P.l - 8} y={yR(topR * t) + 3} textAnchor="end">{fmt(topR * t)}</text></g>)}
        <text x={W - P.r + 6} y={yO(maxO) + 3}>{maxO}</text><text x={W - P.r + 6} y={yO(0) + 3}>0</text>
        {data.map((d, i) => (
          <g key={d.label}>
            <rect className="bar" x={x(i) - bw / 2} y={yR(d.revenue)} width={bw} height={Math.max(0, P.t + ih - yR(d.revenue))} rx="1.5"><title>{`${d.label}: ${currency} ${(d.revenue / 100).toLocaleString('en-US')} · ${d.orders} orders`}</title></rect>
            {i % every === 0 && <text x={x(i)} y={H - 8} textAnchor="middle">{d.label.slice(5)}</text>}
          </g>
        ))}
        <polyline className="line" points={data.map((d, i) => `${x(i)},${yO(d.orders)}`).join(' ')} />
        {data.map((d, i) => (i === data.length - 1 ? <circle key="end" className="dot" cx={x(i)} cy={yO(d.orders)} r="3.5" /> : null))}
      </svg>
      <div className="legend"><span><i style={{ background: 'var(--accent)' }} />Revenue ({currency})</span><span><i style={{ background: 'var(--fg)', height: 2 }} />Orders</span></div>
    </div>
  );
}

export function BarList({ items, format = (v) => v }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div className="empty-adm">Nothing to show yet.</div>;
  return (
    <div className="bar-list">
      {items.map((i) => (
        <div className="it" key={i.label}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.href ? <Link href={i.href}>{i.label}</Link> : i.label}</span>
          <span className="mono">{format(i.value)}{i.extra ? <span className="muted"> · {i.extra}</span> : null}</span>
          <div className="track"><span style={{ width: `${(i.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
