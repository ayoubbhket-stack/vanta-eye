export default function Loading() {
  return <div aria-busy="true" aria-label="Loading" style={{ display: 'grid', gap: 16 }}><div className="skeleton" style={{ height: 40, width: 260, borderRadius: 6 }} /><div className="skeleton" style={{ height: 120, borderRadius: 8 }} /><div className="skeleton" style={{ height: 300, borderRadius: 8 }} /></div>;
}
