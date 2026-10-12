'use client';
export default function Error({ reset }) {
  return (
    <div className="nf">
      <div className="stack" style={{ alignItems: 'center', gap: 16 }}>
        <p className="label accent">Something went wrong</p>
        <h1 className="display-m">We could not load this page.</h1>
        <p className="muted">Check your connection and try again. If it keeps happening, contact us.</p>
        <button className="btn" onClick={() => reset()}>Try again</button>
      </div>
    </div>
  );
}
