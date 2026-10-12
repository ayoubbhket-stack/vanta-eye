'use client';
import { useRouter } from 'next/navigation';
import { api, useAdmin } from './ui';

export default function InboxActions({ kind, id, state }) {
  const router = useRouter();
  const { toast, confirm } = useAdmin();
  const act = async (action, msg) => {
    if (action === 'delete' && !(await confirm({ title: 'Delete permanently?', danger: true, confirmLabel: 'Delete' }))) return;
    const r = await api('POST', '/api/admin/inbox', { kind, id, action });
    if (r.ok) { toast(msg); router.refresh(); } else toast(r.error, 'bad');
  };
  return (
    <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
      {kind === 'review' && state !== 'approved' && <button className="btn small" onClick={() => act('approved', 'Review published')}>Approve</button>}
      {kind === 'review' && state !== 'rejected' && <button className="btn small ghost" onClick={() => act('rejected', 'Review hidden')}>Reject</button>}
      {kind === 'message' && <button className="btn small ghost" onClick={() => act(state === 'read' ? 'unread' : 'read', state === 'read' ? 'Marked unread' : 'Marked read')}>{state === 'read' ? 'Mark unread' : 'Mark read'}</button>}
      <button className="btn small danger" onClick={() => act('delete', 'Deleted')}>Delete</button>
    </div>
  );
}
