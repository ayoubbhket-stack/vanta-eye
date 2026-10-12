import Link from 'next/link';
import '@fontsource-variable/unbounded';
import '@fontsource-variable/instrument-sans';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="nf">
      <div className="stack" style={{ alignItems: 'center', gap: 20 }}>
        <div className="code" aria-hidden="true">404</div>
        <h1 className="display-m">Out of focus.</h1>
        <p className="muted">This page does not exist or has moved.</p>
        <div className="row" style={{ justifyContent: 'center' }}><Link className="btn" href="/">Back home</Link><Link className="btn ghost" href="/shop">Shop frames</Link></div>
      </div>
    </main>
  );
}
