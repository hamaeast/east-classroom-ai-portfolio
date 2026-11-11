import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import QuickPanel from './QuickPanel';
import { isNineWeeksClosed } from '@/lib/gradingPeriods';

export default function MyServiceHours({ entries, reload }) {
  const total = entries.filter(x => (x.approval_status || 'approved') === 'approved').reduce((s, x) => s + Number(x.hours || 0), 0);
  const sorted = entries.slice().sort((a, b) => new Date(b.service_date) - new Date(a.service_date));
  const [drafts, setDrafts] = useState({}), [messages, setMessages] = useState({}), [checking, setChecking] = useState('');
  // The server re-checks the writing and always returns the entry to "pending" for the teacher.
  const save = async (entry) => {
    if (entry.weekly_check_in_id && isNineWeeksClosed(entry.service_date)) return;
    const draft = drafts[entry.id] || { hours: entry.hours, description: entry.description || '' };
    setChecking(entry.id);
    try {
      const { data } = await base44.functions.invoke('resubmitServiceHours', { entryId: entry.id, hours: Number(draft.hours), description: draft.description });
      setMessages(m => ({ ...m, [entry.id]: data?.status === 'invalid' ? data.message : '' }));
    } catch (error) {
      setMessages(m => ({ ...m, [entry.id]: error?.response?.data?.error || 'Your changes could not be saved. Please try again.' }));
    }
    setChecking('');
    await reload();
  };
  return <div className="mt-6"><QuickPanel title={`My service hours — ${total.toFixed(1)} hrs this school year`}>
    {!sorted.length ? <p className="text-sm text-muted-foreground">No service hours logged yet.</p> : <div className="space-y-3">{sorted.map(x => x.approval_status === 'rejected' && !(x.weekly_check_in_id && isNineWeeksClosed(x.service_date)) ? <div key={x.id} className="rounded-xl border border-neon-magenta/50 bg-neon-magenta/10 p-4 text-sm">
      <p className="mb-2 font-semibold text-neon-magenta">Returned for changes: {x.admin_feedback || 'Please revise your hours and description.'}</p>
      <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]"><input type="number" min="0" step=".25" value={(drafts[x.id]?.hours ?? x.hours)} onChange={e => setDrafts(d => ({ ...d, [x.id]: { hours: e.target.value, description: d[x.id]?.description ?? x.description ?? '' } }))} /><input value={(drafts[x.id]?.description ?? x.description ?? '')} onChange={e => setDrafts(d => ({ ...d, [x.id]: { hours: d[x.id]?.hours ?? x.hours, description: e.target.value } }))} /><button disabled={checking === x.id} onClick={() => save(x)} className="east-button">{checking === x.id ? 'Checking…' : 'Resubmit'}</button></div>
      {messages[x.id] && <p className="mt-2 text-xs font-semibold text-neon-magenta">{messages[x.id]}</p>}
    </div> : <div key={x.id} className="flex items-center justify-between border-b border-border/60 py-2 last:border-0 text-sm"><div><p className="font-medium">{x.description || 'No description'}</p><p className="text-xs text-muted-foreground">{x.project_title} · {x.partner_name || 'No partner'} · {x.service_date}{x.approval_status === 'pending' ? ' · Pending review' : ''}</p></div><span className="whitespace-nowrap text-xs font-semibold text-neon-cyan">{x.hours} hrs</span></div>)}</div>}
  </QuickPanel></div>;
}