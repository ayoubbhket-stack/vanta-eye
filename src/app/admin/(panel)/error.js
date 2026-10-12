'use client';
export default function Error({ error, reset }) {
  return <div className="panel"><div className="pb stack"><strong>Something went wrong loading this page.</strong><p className="muted" style={{ margin: 0 }}>{error?.digest ? `Reference: ${error.digest}` : 'Please try again.'}</p><button className="btn small" style={{ justifySelf: 'start' }} onClick={() => reset()}>Try again</button></div></div>;
}
