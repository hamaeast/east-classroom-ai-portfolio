import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import QuickPanel from './QuickPanel';

const PERIODS = ['1', '2', '3', '4', '5', '6', '7'];

export default function AdminMessageComposer() {
  const { items: messages, reload } = useEntityList('AdminMessage');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedPeriods, setSelectedPeriods] = useState([]); // empty = all periods

  const remove = async (id) => {
    setDeletingId(id);
    await base44.entities.AdminMessage.delete(id);
    setDeletingId(null);
    reload();
  };

  const togglePeriod = (p) => setSelectedPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const today = new Date().toISOString().slice(0, 10);
    await base44.entities.AdminMessage.create({ message: text.trim(), sent_date: today, category: 'announcement', target_periods: selectedPeriods });
    setText(''); setSelectedPeriods([]); setSending(false); reload();
  };

  const sorted = [...messages].sort((a, b) => new Date(b.sent_date) - new Date(a.sent_date));

  return <QuickPanel title="Send a message to all students">
    <form onSubmit={send} className="mb-4 flex flex-col gap-2">
      <textarea required placeholder="Type a message for students to see next time they log in…" value={text} onChange={e => setText(e.target.value)} className="min-h-20 w-full" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">Send to:</span>
        <button type="button" onClick={() => setSelectedPeriods([])} className={`rounded-full px-3 py-1 text-xs font-semibold ${!selectedPeriods.length ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-700'}`}>All periods</button>
        {PERIODS.map(p => <button key={p} type="button" onClick={() => togglePeriod(p)} className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedPeriods.includes(p) ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Period {p}</button>)}
      </div>
      <button disabled={sending} className="east-button w-fit">{sending ? 'Sending…' : selectedPeriods.length ? `Send to selected period${selectedPeriods.length > 1 ? 's' : ''}` : 'Send to all students'}</button>
    </form>
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Message log</p>
    {!sorted.length ? <p className="text-sm text-slate-500">No messages sent yet.</p> : <ul className="max-h-72 space-y-2 overflow-y-auto">
      {sorted.map(m => <li key={m.id} className="border-b pb-2 last:border-0 text-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-xs text-slate-500">{m.sent_date}</span>{' '}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.category === 'check_in_exemption' ? 'bg-amber-50 text-amber-700' : 'bg-cyan-50 text-cyan-700'}`}>{m.category === 'check_in_exemption' ? 'Check-in exemption' : 'Announcement'}</span>{' '}
            <span className="text-[11px] font-semibold text-slate-500">{m.target_periods?.length ? `Periods: ${m.target_periods.join(', ')}` : 'All periods'}</span>
          </div>
          <button onClick={() => remove(m.id)} disabled={deletingId === m.id} className="text-xs font-semibold text-red-600 disabled:opacity-50">{deletingId === m.id ? 'Deleting…' : 'Delete'}</button>
        </div>
        <p className="mt-1 text-slate-700">{m.message}</p>
      </li>)}
    </ul>}
  </QuickPanel>;
}