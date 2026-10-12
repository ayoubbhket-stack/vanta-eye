import Link from 'next/link';
export default function NotFound() {
  return <div className="empty-adm"><strong>Not found</strong><span>This record does not exist or was deleted.</span><Link className="btn small" href="/admin">Back to dashboard</Link></div>;
}
