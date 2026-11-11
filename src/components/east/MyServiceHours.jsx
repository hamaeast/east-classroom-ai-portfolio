import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import QuickPanel from './QuickPanel';
import { isNineWeeksClosed } from '@/lib/gradingPeriods';

export default function MyServiceHours({ entries, reload }) {
  const total = entries.filter(x => (x.approval_status || 'approved') === 'approved').reduce((s, x) => s + Number(x.hours || 0), 0);
  const sorted = entries.slice().sort((a, b) => new Date(b.service_date) - new Date(a.service_date));
  const [drafts, setDrafts] = useState({}), [messages, setMessages] = useState({}), [checking, setChecking] = useState('');
  const save = async (entry) => {
    if (entry.weekly_check_in_id && isNineWeeksClosed(entry.service_date)) return;
    const draft = drafts[entry.id] || { hours: entry.hours, description: entry.description || '' };
    if (entry.ai_retry_after && new Date(entry.ai_retry_after) > new Date()) {
      setMessages(m => ({ ...m, [entry.id]: 'Please take time to plan your writing and try submitting again later.' })); return;
    }
    setChecking(entry.id);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Check this community-service work description using a very lenient 2nd-grade reading/writing level. Short answers, typos, and simple grammar are fine. It is valid only if it meaningfully describes community-service work completed and is not blank, gibberish, or unrelated. Do not write the answer. Give one short suggestion if invalid.\n\nDescription: "${draft.description}"`,
      response_json_schema: { type: 'object', properties: { valid: { type: 'boolean' }, hint: { type: 'string' } }, required: ['valid', 'hint'] },
    });
    setChecking('');
    if (!result.valid) {
      const attempts = (entry.ai_check_attempts || 0) + 1, locked = attempts >= 2;
      await base44.entities.ServiceEntry.update(entry.id, { ai_check_attempts: locked ? 0 : attempts, ...(locked ? { ai_retry_after: new Date(Date.now() + 15 * 60 * 1000).toISOString() } : {}) });
      setMessages(m => ({ ...m, [entry.id]: locked ? 'Please take time to plan your writing and try submitting again later.' : (result.hint || 'Please describe the community-service work you completed.') }));
      await reload(); return;
    }
    await base44.entities.ServiceEntry.update(entry.id, { hours: Number(draft.hours), description: draft.description, approval_status: 'pending', admin_feedback: '', ai_check_attempts: 0 });
    if (entry.weekly_check_in_id) await base44.entities.WeeklyCheckIn.update(entry.weekly_check_in_id, { hours: Number(draft.hours), accomplishment: draft.description });
    setMessages(m => ({ ...m, [entry.id]: '' })); await reload();
  };
  return <div className="mt-6"><QuickPanel title={`My service hours — ${total.toFixed(1)} hrs this school year`}>
    {!sorted.length ? <p className="text-sm text-muted-foreground">No service hours logged yet.</p> : <div className="space-y-3">{sorted.map(x => x.approval_status === 'rejected' && !(x.weekly_check_in_id && isNineWeeksClosed(x.service_date)) ? <div key={x.id} className="rounded-xl border border-neon-magenta/50 bg-neon-magenta/10 p-4 text-sm">
      <p className="mb-2 font-semibold text-neon-magenta">Returned for changes: {x.admin_feedback || 'Please revise your hours and description.'}</p>
      <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]"><input type="number" min="0" step=".25" value={(drafts[x.id]?.hours ?? x.hours)} onChange={e => setDrafts(d => ({ ...d, [x.id]: { hours: e.target.value, description: d[x.id]?.description ?? x.description ?? '' } }))} /><input value={(drafts[x.id]?.description ?? x.description ?? '')} onChange={e => setDrafts(d => ({ ...d, [x.id]: { hours: d[x.id]?.hours ?? x.hours, description: e.target.value } }))} /><button disabled={checking === x.id} onClick={() => save(x)} className="east-button">{checking === x.id ? 'Checking…' : 'Resubmit'}</button></div>
      {messages[x.id] && <p className="mt-2 text-xs font-semibold text-neon-magenta">{messages[x.id]}</p>}
    </div> : <div key={x.id} className="flex items-center justify-between border-b border-border/60 py-2 last:border-0 text-sm"><div><p className="font-medium">{x.description || 'No description'}</p><p className="text-xs text-muted-foreground">{x.project_title} · {x.partner_name || 'No partner'} · {x.service_date}{x.approval_status === 'pending' ? ' · Pending review' : ''}</p></div><span className="whitespace-nowrap text-xs font-semibold text-neon-cyan">{x.hours} hrs</span></div>)}</div>}
  </QuickPanel></div>;
}