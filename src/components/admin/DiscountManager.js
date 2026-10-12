'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, F, Toggle, useAdmin } from './ui';

const money = (p) => `EGP ${(p / 100).toLocaleString('en-US')}`;
const dateIn = (iso) => (iso ? iso.slice(0, 16) : '');
const BLANK = { code: '', description: '', type: 'percent', value: 10, minOrder: 0, startsAt: '', endsAt: '', usageLimit: '', perCustomerOnce: false, appliesTo: 'all', targetId: null, active: true };

export default function DiscountManager({ discounts, categories, collections }) {
  const router = useRouter();
  const { toast, confirm } = useAdmin();
  const [edit, setEdit] = useState(null);
  const [errs, setErrs] = useState({});
  const now = Date.now();
  const state = (d) => (!d.active ? ['inactive', 'Disabled'] : d.endsAt && new Date(d.endsAt) < now ? ['bad', 'Expired'] : d.startsAt && new Date(d.startsAt) > now ? ['pending', 'Scheduled'] : d.usageLimit != null && d.usedCount >= d.usageLimit ? ['bad', 'Used up'] : ['active', 'Active']);
  const save = async (e) => {
    e.preventDefault();
    const { id, ...data } = edit;
    const r = await api('POST', '/api/admin/discounts', { id, data: { ...data, usageLimit: data.usageLimit === '' ? null : data.usageLimit, startsAt: data.startsAt || null, endsAt: data.endsAt || null } });
    if (r.ok) { toast('Discount saved'); setEdit(null); setErrs({}); router.refresh(); } else { setErrs(r.fields); toast(r.error, 'bad'); }
  };
  return (
    <>
      <div className="adm-head"><div><h1>Discounts</h1><p className="sub">Codes are validated and calculated on the server at checkout.</p></div><button className="btn" onClick={() => { setErrs({}); setEdit({ ...BLANK }); }}>+ New code</button></div>
      <section className="panel"><div className="pb flush tbl-wrap">
        {discounts.length ? (
          <table className="tbl">
            <thead><tr><th>Code</th><th>Discount</th><th>Rules</th><th>Status</th><th className="r">Used</th><th className="r">Given / revenue</th><th></th></tr></thead>
            <tbody>{discounts.map((d) => { const [cls, label] = state(d); return (
              <tr key={d.id}>
                <td><strong className="mono">{d.code}</strong><div className="muted" style={{ fontSize: '.8rem' }}>{d.description}</div></td>
                <td className="mono">{d.type === 'percent' ? `${d.value}%` : money(d.value)}</td>
                <td className="muted" style={{ fontSize: '.82rem' }}>
                  {d.minOrder ? `Min ${money(d.minOrder)} · ` : ''}{d.appliesTo === 'all' ? 'All products' : `${d.appliesTo}: ${(d.appliesTo === 'category' ? categories : collections).find((x) => x.id === d.targetId)?.name || '?'}`}
                  {d.perCustomerOnce ? ' · once per customer' : ''}<br />{d.startsAt ? `From ${new Date(d.startsAt).toLocaleDateString('en-GB')} ` : ''}{d.endsAt ? `until ${new Date(d.endsAt).toLocaleDateString('en-GB')}` : ''}
                </td>
                <td><span className={`pill ${cls}`}>{label}</span></td>
                <td className="r mono">{d.usedCount}{d.usageLimit != null ? ` / ${d.usageLimit}` : ''}</td>
                <td className="r mono">{money(d.given)}<div className="muted" style={{ fontSize: '.78rem' }}>{money(d.revenue)}</div></td>
                <td className="r" style={{ whiteSpace: 'nowrap' }}>
                  <Toggle id={`dt${d.id}`} label="" checked={d.active} onChange={async (v) => { const r = await api('POST', '/api/admin/discounts', { action: 'toggle', id: d.id, active: v }); if (r.ok) router.refresh(); else toast(r.error, 'bad'); }} />{' '}
                  <button className="btn small ghost" onClick={() => { setErrs({}); setEdit({ ...d, value: d.type === 'fixed' ? d.value / 100 : d.value, minOrder: d.minOrder / 100, startsAt: dateIn(d.startsAt), endsAt: dateIn(d.endsAt), usageLimit: d.usageLimit ?? '' }); }}>Edit</button>{' '}
                  <button className="btn small danger" onClick={async () => { if (!(await confirm({ title: `Delete ${d.code}?`, body: d.usedCount ? 'This code has been used, so it will be disabled instead of deleted to keep order history intact.' : 'This cannot be undone.', danger: true, confirmLabel: d.usedCount ? 'Disable' : 'Delete' }))) return; const r = await api('POST', '/api/admin/discounts', { action: 'delete', id: d.id }); if (r.ok) { toast(r.data.disabled ? 'Code disabled' : 'Code deleted'); router.refresh(); } else toast(r.error, 'bad'); }}>Delete</button>
                </td>
              </tr>
            ); })}</tbody>
          </table>
        ) : <div className="empty-adm"><strong>No discount codes</strong><button className="btn small" onClick={() => setEdit({ ...BLANK })}>Create the first code</button></div>}
      </div></section>
      {edit && (
        <div className="dlg-scrim" onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <form className="dlg" style={{ width: 'min(640px, 100%)', maxHeight: 'calc(100vh - 32px)', overflow: 'auto' }} onSubmit={save} noValidate>
            <h2>{edit.id ? `Edit ${edit.code}` : 'New discount code'}</h2>
            <div className="form-grid">
              <F id="d-code" label="Code" err={errs.code}><input id="d-code" className="input mono" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} placeholder="SUMMER15" /></F>
              <F id="d-desc" label="Description (shown at checkout)"><input id="d-desc" className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></F>
              <F id="d-type" label="Type"><select id="d-type" className="select" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}><option value="percent">Percentage</option><option value="fixed">Fixed amount (EGP)</option></select></F>
              <F id="d-val" label={edit.type === 'percent' ? 'Percent off' : 'Amount off (EGP)'} err={errs.value}><input id="d-val" className="input mono" inputMode="decimal" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} /></F>
              <F id="d-min" label="Minimum order (EGP)" hint="Subtotal before discount"><input id="d-min" className="input mono" inputMode="decimal" value={edit.minOrder} onChange={(e) => setEdit({ ...edit, minOrder: e.target.value })} /></F>
              <F id="d-lim" label="Total usage limit" hint="Empty = unlimited"><input id="d-lim" className="input mono" inputMode="numeric" value={edit.usageLimit} onChange={(e) => setEdit({ ...edit, usageLimit: e.target.value.replace(/\D/g, '') })} /></F>
              <F id="d-from" label="Starts"><input id="d-from" type="datetime-local" className="input" value={edit.startsAt} onChange={(e) => setEdit({ ...edit, startsAt: e.target.value })} /></F>
              <F id="d-to" label="Expires" err={errs.endsAt}><input id="d-to" type="datetime-local" className="input" value={edit.endsAt} onChange={(e) => setEdit({ ...edit, endsAt: e.target.value })} /></F>
              <F id="d-app" label="Applies to"><select id="d-app" className="select" value={edit.appliesTo} onChange={(e) => setEdit({ ...edit, appliesTo: e.target.value, targetId: null })}><option value="all">All products</option><option value="category">One category</option><option value="collection">One collection</option></select></F>
              {edit.appliesTo !== 'all' && <F id="d-tgt" label={edit.appliesTo === 'category' ? 'Category' : 'Collection'} err={errs.targetId}><select id="d-tgt" className="select" value={edit.targetId || ''} onChange={(e) => setEdit({ ...edit, targetId: Number(e.target.value) || null })}><option value="">Choose…</option>{(edit.appliesTo === 'category' ? categories : collections).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></F>}
              <div className="full stack" style={{ gap: 10 }}>
                <Toggle id="d-once" label="Once per customer (matched by phone number)" checked={edit.perCustomerOnce} onChange={(v) => setEdit({ ...edit, perCustomerOnce: v })} />
                <Toggle id="d-act" label="Active" checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} />
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn ghost small" onClick={() => setEdit(null)}>Cancel</button><button className="btn small">Save code</button></div>
          </form>
        </div>
      )}
    </>
  );
}
