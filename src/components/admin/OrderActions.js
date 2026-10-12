'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, useAdmin, Toggle } from './ui';

const PAY = ['unpaid', 'pending', 'paid', 'failed', 'refunded'];

export default function OrderActions({ order, next, canWrite }) {
  const router = useRouter();
  const { toast, confirm } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [pay, setPay] = useState(order.paymentStatus);
  const [ref, setRef] = useState('');

  const setStatus = async (status) => {
    let restock = true;
    if (status === 'cancelled' || status === 'refunded') {
      const box = { restock: true };
      const okd = await confirm({
        title: `Mark order as ${status}?`, danger: true, confirmLabel: `Mark ${status}`,
        body: status === 'cancelled' ? 'The order will be excluded from revenue. This cannot be undone.' : 'Record a refund for this order. This cannot be undone.',
        extra: !order.stockRestored && <RestockToggle box={box} />,
      });
      if (!okd) return;
      restock = box.restock;
    }
    setBusy(true);
    const r = await api('PATCH', `/api/admin/orders/${order.id}`, { action: 'status', status, restock });
    setBusy(false);
    if (r.ok) { toast(`Order marked ${status}${r.data.notified?.sent ? ' · customer emailed' : ''}`); router.refresh(); } else toast(r.error, 'bad');
  };
  if (!canWrite) return null;
  return (
    <section className="panel">
      <div className="ph"><h2>Update order</h2></div>
      <div className="pb stack" style={{ gap: 18 }}>
        <div className="stack" style={{ gap: 8 }}>
          <span className="label">Move to</span>
          {next.length ? <div className="row" style={{ gap: 8 }}>{next.map((s) => <button key={s} className={`btn small${s === 'cancelled' || s === 'refunded' ? ' danger' : ''}`} disabled={busy} onClick={() => setStatus(s)}>{s}</button>)}</div>
            : <p className="muted" style={{ margin: 0 }}>This order is {order.status}; no further status changes.</p>}
          {order.paymentMethod === 'cod' && next.includes('delivered') && <span className="hint muted" style={{ fontSize: '.8rem' }}>Marking a COD order delivered also records the cash as paid.</span>}
        </div>
        <form className="stack" style={{ gap: 8 }} onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          const r = await api('PATCH', `/api/admin/orders/${order.id}`, { action: 'payment', paymentStatus: pay, reference: ref });
          setBusy(false);
          if (r.ok) { toast('Payment status updated'); setRef(''); router.refresh(); } else toast(r.error, 'bad');
        }}>
          <span className="label">Payment status</span>
          <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
            <select className="select" aria-label="Payment status" value={pay} onChange={(e) => setPay(e.target.value)}>{PAY.map((p) => <option key={p}>{p}</option>)}</select>
            <button className="btn small ghost" disabled={busy || pay === order.paymentStatus}>Save</button>
          </div>
          <input className="input" aria-label="Payment reference" placeholder="Reference (receipt no., transfer id…)" value={ref} onChange={(e) => setRef(e.target.value)} />
          {order.paymentMethod === 'online' && <span className="muted" style={{ fontSize: '.8rem' }}>Online payments are confirmed automatically by the payment provider. Change manually only after checking your Paymob dashboard.</span>}
        </form>
        <form className="stack" style={{ gap: 8 }} onSubmit={async (e) => {
          e.preventDefault(); if (!note.trim()) return; setBusy(true);
          const r = await api('PATCH', `/api/admin/orders/${order.id}`, { action: 'note', body: note });
          setBusy(false);
          if (r.ok) { toast('Note added'); setNote(''); router.refresh(); } else toast(r.error, 'bad');
        }}>
          <label className="label" htmlFor="note">Internal note</label>
          <textarea id="note" className="textarea" style={{ minHeight: 80 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible to staff only" />
          <button className="btn small ghost" disabled={busy || !note.trim()} style={{ justifySelf: 'start' }}>Add note</button>
        </form>
      </div>
    </section>
  );
}

function RestockToggle({ box }) {
  const [v, setV] = useState(true);
  return <Toggle id="restock" label="Return items to inventory" checked={v} onChange={(x) => { setV(x); box.restock = x; }} />;
}
