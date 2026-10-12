'use client';
import { useState } from 'react';
import { api, F, useAdmin } from './ui';

export default function AccountForm() {
  const { toast } = useAdmin();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  return (
    <section className="panel" style={{ maxWidth: 520 }}><div className="ph"><h2>Change password</h2></div>
      <form className="pb stack" style={{ gap: 12 }} onSubmit={async (e) => {
        e.preventDefault();
        if (f.next !== f.confirm) { toast('New passwords do not match.', 'bad'); return; }
        const r = await api('POST', '/api/admin/auth/password', { current: f.current, next: f.next });
        if (r.ok) { toast('Password changed. Other sessions were signed out.'); setF({ current: '', next: '', confirm: '' }); } else toast(r.error, 'bad');
      }}>
        <F id="cur" label="Current password"><input id="cur" type="password" className="input" required autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></F>
        <F id="nw" label="New password" hint="At least 10 characters with letters and numbers."><input id="nw" type="password" className="input" required autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></F>
        <F id="cf" label="Confirm new password"><input id="cf" type="password" className="input" required autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></F>
        <button className="btn" style={{ justifySelf: 'start' }}>Update password</button>
      </form>
    </section>
  );
}
