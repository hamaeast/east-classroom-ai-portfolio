import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import QuickPanel from './QuickPanel';

// Admin-facing panel: students' urgent help requests, respond to open ones.
export default function UrgentHelpPanel() {
  const { items, reload } = useEntityList('HelpRequest');
  const [drafts, setDrafts] = useState({});
  const [sendingId, setSendingId] = useState(null);

  const open = items.filter(r => !['answered', 'dismissed'].includes(r.status)).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const answered = items.filter(r => r.status === 'answered').sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const dismissed = items.filter(r => r.status === 'dismissed').sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));

  const respond = async (r) => {
    const admin_response = (drafts[r.id] || '').trim();
    if (!admin_response) return;
    setSendingId(r.id);
    await base44.entities.HelpRequest.update(r.id, { admin_response, status: 'answered' });
    setSendingId(null);
    reload();
  };

  const dismiss = async (r) => {
    setSendingId(r.id);
    await base44.entities.HelpRequest.update(r.id, { status: 'dismissed' });
    setSendingId(null);
    reload();
  };

  return <QuickPanel title="Urgent help requests">
    {!open.length ? <p className="text-sm text-muted-foreground">No open urgent requests.</p> : <div className="space-y-3">
      {open.map(r => <div key={r.id} className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
        <p className="text-xs font-semibold text-muted-foreground">{r.student_name} · {new Date(r.created_date).toLocaleString()}</p>
        <p className="mt-1 text-sm text-foreground">{r.message}</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <textarea placeholder="Type your reply…" value={drafts[r.id] || ''} onChange={e => setDrafts(d => ({ ...d, [r.id]: e.target.value }))} className="min-h-10 flex-1" />
          <button onClick={() => respond(r)} disabled={sendingId === r.id} className="east-button w-fit self-start">{sendingId === r.id ? 'Saving…' : 'Reply'}</button>
          <button onClick={() => dismiss(r)} disabled={sendingId === r.id} className="w-fit self-start rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">Dismiss</button>
        </div>
      </div>)}
    </div>}
    {!!answered.length && <>
      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Answered</p>
      <ul className="max-h-56 space-y-2 overflow-y-auto">
        {answered.map(r => <li key={r.id} className="border-b pb-2 last:border-0 text-sm">
          <p className="text-xs text-muted-foreground">{r.student_name} · {new Date(r.created_date).toLocaleString()}</p>
          <p className="text-foreground">{r.message}</p>
          <p className="mt-1 rounded-lg bg-muted/60 p-2 text-foreground"><b>You replied:</b> {r.admin_response}</p>
        </li>)}
      </ul>
    </>}
    {!!dismissed.length && <>
      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dismissed</p>
      <ul className="max-h-56 space-y-2 overflow-y-auto">
        {dismissed.map(r => <li key={r.id} className="border-b pb-2 text-sm last:border-0">
          <p className="text-xs text-muted-foreground">{r.student_name} · {new Date(r.created_date).toLocaleString()}</p>
          <p className="text-foreground">{r.message}</p>
        </li>)}
      </ul>
    </>}
  </QuickPanel>;
}