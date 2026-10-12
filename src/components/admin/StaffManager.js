'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, F, useAdmin } from './ui';

const ROLE_DESC = {
  owner: 'Everything, including store settings, staff accounts and customer exports.',
  manager: 'Products, collections, content, discounts, orders, customers and reports. No settings or staff.',
  staff: 'Orders and inventory only. Cannot see revenue, customers list or edit products.',
};

export default function StaffManager({ users, me }) {
  const router = useRouter();
  const { toast, confirm } = useAdmin();
  const [f, setF] = useState({ name: '', email: '', role: 'staff', password: '' });
  const [link, setLink] = useState(null);
  const act = async (body, msg) => { const r = await api('POST', '/api/admin/staff', body); if (r.ok) { if (msg) toast(msg); router.refresh(); return r.data; } toast(r.error + (r.fields ? ` ${Object.values(r.fields)[0] || ''}` : ''), 'bad'); return null; };
  return (
    <>
      <div className="adm-head"><div><h1>Staff &amp; roles</h1><p className="sub">Permissions are checked on the server for every page and action.</p></div></div>
      <div className="grid-2">
        <section className="panel"><div className="ph"><h2>Accounts</h2></div><div className="pb flush tbl-wrap">
          <table className="tbl"><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong>{u.id === me && <span className="pill" style={{ marginInlineStart: 6 }}>you</span>}<div className="muted" style={{ fontSize: '.8rem' }}>{u.email}</div></td>
                <td><select className="select" style={{ minHeight: 32, width: 120 }} aria-label="Role" value={u.role} onChange={(e) => act({ action: 'update', id: u.id, role: e.target.value, active: u.active }, 'Role updated')}><option>owner</option><option>manager</option><option>staff</option></select></td>
                <td>{u.locked ? <span className="pill bad">locked</span> : <span className={`pill ${u.active ? 'active' : 'inactive'}`}>{u.active ? 'active' : 'disabled'}</span>}</td>
                <td className="mono muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : 'never'}</td>
                <td className="r" style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn small ghost" onClick={async () => { const d = await act({ action: 'reset-link', id: u.id }); if (d) setLink({ name: u.name, url: d.url }); }}>Reset link</button>{' '}
                  {u.id !== me && <button className="btn small ghost" onClick={() => act({ action: 'update', id: u.id, role: u.role, active: !u.active }, u.active ? 'Account disabled and signed out' : 'Account enabled')}>{u.active ? 'Disable' : 'Enable'}</button>}{' '}
                  {u.id !== me && <button className="btn small danger" onClick={async () => { if (await confirm({ title: `Delete ${u.name}?`, body: 'Their history in orders and stock movements is kept.', danger: true, confirmLabel: 'Delete' })) act({ action: 'delete', id: u.id }, 'Account deleted'); }}>Delete</button>}
                </td>
              </tr>
            ))}</tbody></table>
        </div></section>
        <section className="panel"><div className="ph"><h2>Add staff member</h2></div>
          <form className="pb stack" style={{ gap: 12 }} onSubmit={async (e) => { e.preventDefault(); if (await act({ action: 'create', ...f }, 'Account created')) setF({ name: '', email: '', role: 'staff', password: '' }); }}>
            <F id="sn" label="Name"><input id="sn" className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></F>
            <F id="se" label="Email"><input id="se" type="email" className="input" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></F>
            <F id="sr" label="Role" hint={ROLE_DESC[f.role]}><select id="sr" className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option>staff</option><option>manager</option><option>owner</option></select></F>
            <F id="sp" label="Temporary password" hint="10+ characters with letters and numbers. Share it privately; they can change it under Account."><input id="sp" type="text" className="input mono" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="off" /></F>
            <button className="btn">Create account</button>
          </form>
        </section>
      </div>
      {link && (
        <div className="dlg-scrim" onClick={(e) => e.target === e.currentTarget && setLink(null)}>
          <div className="dlg"><h2>Reset link for {link.name}</h2><p className="muted" style={{ margin: 0 }}>Valid for 60 minutes and works once. Send it privately.</p>
            <input className="input mono" readOnly value={link.url} onFocus={(e) => e.target.select()} aria-label="Reset link" />
            <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn small ghost" onClick={() => navigator.clipboard?.writeText(link.url).then(() => toast('Copied')).catch(() => {})}>Copy</button><button className="btn small" onClick={() => setLink(null)}>Done</button></div>
          </div>
        </div>
      )}
    </>
  );
}
