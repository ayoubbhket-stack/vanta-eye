'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: r.ok, ...(await r.json().catch(() => ({}))) };
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form className="stack" style={{ gap: 14 }} onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr('');
      const r = await post('/api/admin/auth/login', { email, password });
      if (r.ok) { router.replace('/admin'); router.refresh(); } else { setErr(r.error || 'Sign-in failed.'); setBusy(false); }
    }}>
      <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></div>
      <div className="field"><label htmlFor="pw">Password</label><input id="pw" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {err && <div className="notice bad" role="alert">{err}</div>}
      <button className="btn block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

export function SetupForm() {
  const router = useRouter();
  const [f, setF] = useState({ token: '', name: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="stack" style={{ gap: 14 }} onSubmit={async (e) => {
      e.preventDefault(); setErr('');
      if (f.password !== f.confirm) { setErr('Passwords do not match.'); return; }
      setBusy(true);
      const r = await post('/api/admin/auth/setup', f);
      if (r.ok) { router.replace('/admin'); router.refresh(); } else { setErr(r.error || 'Setup failed.'); setBusy(false); }
    }}>
      <div className="field"><label htmlFor="tok">Setup token</label><input id="tok" className="input mono" required value={f.token} onChange={set('token')} /><span className="hint">The SETUP_TOKEN value from your server environment.</span></div>
      <div className="field"><label htmlFor="nm">Your name</label><input id="nm" className="input" required value={f.name} onChange={set('name')} autoComplete="name" /></div>
      <div className="field"><label htmlFor="em">Email</label><input id="em" className="input" type="email" required value={f.email} onChange={set('email')} autoComplete="username" /></div>
      <div className="field"><label htmlFor="pw1">Password</label><input id="pw1" className="input" type="password" required value={f.password} onChange={set('password')} autoComplete="new-password" /><span className="hint">At least 10 characters with letters and numbers.</span></div>
      <div className="field"><label htmlFor="pw2">Confirm password</label><input id="pw2" className="input" type="password" required value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /></div>
      {err && <div className="notice bad" role="alert">{err}</div>}
      <button className="btn block" disabled={busy}>{busy ? 'Creating…' : 'Create owner account'}</button>
    </form>
  );
}

export function ResetForm({ token }) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  if (done) return <div className="stack"><div className="notice ok">Password updated. All other sessions were signed out.</div><button className="btn" onClick={() => router.replace('/admin/login')}>Sign in</button></div>;
  return (
    <form className="stack" style={{ gap: 14 }} onSubmit={async (e) => {
      e.preventDefault(); setErr('');
      if (pw !== pw2) { setErr('Passwords do not match.'); return; }
      const r = await post('/api/admin/auth/reset', { token, password: pw });
      if (r.ok) setDone(true); else setErr(r.error || 'Could not reset password.');
    }}>
      <div className="field"><label htmlFor="np">New password</label><input id="np" className="input" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /><span className="hint">At least 10 characters with letters and numbers.</span></div>
      <div className="field"><label htmlFor="np2">Confirm</label><input id="np2" className="input" type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></div>
      {err && <div className="notice bad" role="alert">{err}</div>}
      <button className="btn block">Set new password</button>
    </form>
  );
}
