'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const PRESETS = [['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['month', 'This month'], ['year', 'This year']];

export default function RangePicker({ preset, from, to }) {
  const router = useRouter();
  const path = usePathname();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  return (
    <div className="row" style={{ gap: 8 }}>
      <div className="seg" role="group" aria-label="Date range">
        {PRESETS.map(([k, l]) => <button key={k} style={{ padding: '8px 12px', fontSize: '.78rem' }} aria-pressed={preset === k} onClick={() => router.push(`${path}?range=${k}`)}>{l}</button>)}
      </div>
      <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); router.push(`${path}?from=${f}&to=${t}`); }}>
        <label className="sr-only" htmlFor="rf">From</label><input id="rf" type="date" className="input" style={{ minHeight: 36, width: 150 }} value={f} max={t} onChange={(e) => setF(e.target.value)} />
        <span className="muted">→</span>
        <label className="sr-only" htmlFor="rt">To</label><input id="rt" type="date" className="input" style={{ minHeight: 36, width: 150 }} value={t} min={f} onChange={(e) => setT(e.target.value)} />
        <button className="btn small ghost" aria-pressed={preset === 'custom'}>Apply</button>
      </form>
    </div>
  );
}
