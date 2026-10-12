'use client';
// Shared admin client utilities: toasts, confirmation dialog, API helper,
// toggles and the media uploader.
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const Ctx = createContext(null);

export function AdminProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dlg, setDlg] = useState(null);
  const id = useRef(0);
  const toast = useCallback((text, tone = 'ok') => {
    const k = ++id.current;
    setToasts((t) => [...t.slice(-3), { k, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.k !== k)), tone === 'bad' ? 7000 : 3500);
  }, []);
  const confirm = useCallback((opts) => new Promise((resolve) => setDlg({ ...opts, resolve })), []);
  const close = (v) => { dlg?.resolve(v); setDlg(null); };
  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="adm-toasts" role="status" aria-live="polite">{toasts.map((t) => <div key={t.k} className={`adm-toast${t.tone === 'bad' ? ' bad' : ''}`}>{t.text}</div>)}</div>
      {dlg && (
        <div className="dlg-scrim" onClick={(e) => e.target === e.currentTarget && close(false)}>
          <div className="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t">
            <h2 id="dlg-t">{dlg.title}</h2>
            {dlg.body && <p className="muted" style={{ margin: 0 }}>{dlg.body}</p>}
            {dlg.extra}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn ghost small" onClick={() => close(false)} autoFocus>Cancel</button>
              <button className={`btn small${dlg.danger ? ' danger' : ''}`} onClick={() => close(true)}>{dlg.confirmLabel || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
export const useAdmin = () => useContext(Ctx);

export async function api(method, url, body) {
  try {
    const r = await fetch(url, {
      method, headers: body instanceof FormData ? undefined : { 'content-type': 'application/json' },
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) { window.location.href = '/admin/login'; }
    return { ok: r.ok, status: r.status, data, error: data.error, fields: data.fields || {} };
  } catch {
    return { ok: false, status: 0, data: {}, error: 'Network error. Check your connection.', fields: {} };
  }
}

export function Toggle({ id, label, checked, onChange, disabled }) {
  return <label className="toggle" htmlFor={id}><input id={id} type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}

export function F({ id, label, err, hint, children, full, style }) {
  return (
    <div className={`field${err ? ' has-error' : ''}${full ? ' full' : ''}`} style={style}>
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {hint && !err && <span className="hint">{hint}</span>}
      {err && <span className="err" role="alert">{err}</span>}
    </div>
  );
}

/** Upload files to /api/admin/upload. Returns [{id, url, filename}] */
export async function uploadFiles(files, kind = 'image') {
  const out = [];
  for (const f of files) {
    const fd = new FormData(); fd.append('file', f); fd.append('kind', kind);
    const r = await api('POST', '/api/admin/upload', fd);
    if (!r.ok) throw new Error(r.error || `Upload failed for ${f.name}`);
    out.push(r.data);
  }
  return out;
}

export function Dropzone({ onFiles, accept = 'image/jpeg,image/png,image/webp,image/avif', multiple = true, label = 'Drop images here or click to upload', busy }) {
  const [over, setOver] = useState(false);
  const input = useRef(null);
  return (
    <div className={`dropzone${over ? ' over' : ''}`} role="button" tabIndex={0}
      onClick={() => input.current?.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]); }}>
      <span style={{ fontSize: '1.4rem', color: 'var(--accent)' }}>↑</span>
      <span>{busy ? 'Uploading…' : label}</span>
      <span className="label" style={{ fontSize: '.6rem' }}>{accept.includes('gltf') ? 'GLB up to 20 MB' : 'JPG, PNG, WEBP or AVIF up to 8 MB'}</span>
      <input ref={input} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => { onFiles([...e.target.files]); e.target.value = ''; }} />
    </div>
  );
}

export function SingleImage({ value, onChange, label = 'Image' }) {
  const { toast } = useAdmin();
  const [busy, setBusy] = useState(false);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <span className="label" style={{ fontSize: '.64rem' }}>{label}</span>
      {value && <div className="img-tile" style={{ maxWidth: 260 }}><img src={`/api/media/${value}`} alt="" style={{ aspectRatio: '16/10' }} /><div className="bar"><span className="label" style={{ fontSize: '.6rem' }}>Current</span><button type="button" onClick={() => onChange(null)}>Remove</button></div></div>}
      <Dropzone multiple={false} busy={busy} label={value ? 'Replace image' : 'Upload image'} onFiles={async (files) => {
        if (!files.length) return; setBusy(true);
        try { const [m] = await uploadFiles(files.slice(0, 1)); onChange(m.id); toast('Image uploaded'); } catch (e) { toast(e.message, 'bad'); } finally { setBusy(false); }
      }} />
    </div>
  );
}
