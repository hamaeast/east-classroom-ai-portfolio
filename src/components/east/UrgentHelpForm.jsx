import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import QuickPanel from './QuickPanel';

// Lets a student ask their teacher for immediate or urgent help without AI screening.
export default function UrgentHelpForm() {
  const { user: me } = useAuth();
  const { items, reload } = useEntityList('HelpRequest');
  const [message, setMessage] = useState('');

  const mine = items
    .filter(r => r.created_by_id === me?.id)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    await base44.entities.HelpRequest.create({ student_name: me?.full_name || 'Student', message: message.trim(), status: 'open' });
    setMessage('');
    reload();
  };

  return <QuickPanel title="Ask for immediate help">
    <form onSubmit={submit} className="mb-4 flex flex-col gap-2">
      <textarea required placeholder="What do you need urgent help with?" value={message} onChange={e => setMessage(e.target.value)} className="min-h-20 w-full" />
      <button className="east-button w-fit">Send urgent request</button>
    </form>
    {!mine.length ? <p className="text-sm text-slate-500">You haven't asked for urgent help yet.</p> : <ul className="max-h-72 space-y-2 overflow-y-auto">
      {mine.map(r => <li key={r.id} className="border-b pb-2 last:border-0 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">{new Date(r.created_date).toLocaleString()}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.status === 'answered' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{r.status === 'answered' ? 'Answered' : 'Waiting for reply'}</span>
        </div>
        <p className="mt-1 text-slate-700">{r.message}</p>
        {r.admin_response && <p className="mt-1 rounded-lg bg-slate-50 p-2 text-slate-700"><b>Teacher:</b> {r.admin_response}</p>}
      </li>)}
    </ul>}
  </QuickPanel>;
}