import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="nf">
      <div className="stack" style={{ alignItems: 'center', gap: 20 }}>
        <div className="code" aria-hidden="true">404</div>
        <h1 className="display-m">Out of focus.</h1>
        <p className="muted">This page or product does not exist, or it is no longer available.</p>
        <div className="row" style={{ justifyContent: 'center' }}><Link className="btn" href="/shop">Shop frames</Link><Link className="btn ghost" href="/">Back home</Link></div>
      </div>
    </div>
  );
}
