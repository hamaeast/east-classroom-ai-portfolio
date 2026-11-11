import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2 } from 'lucide-react';

export default function CheckInExemptionManager({ exemptions, reload }) {
  const [week, setWeek] = useState('');
  const [reason, setReason] = useState('');

  const add = async (e) => {
    e.preventDefault();
    if (!week || !reason.trim()) return;
    await base44.entities.CheckInExemption.create({ week_ending: week, reason: reason.trim() });
    await base44.entities.AdminMessage.create({
      message: `Week ending ${week} is exempt from the required weekly check-in${reason ? ` — ${reason}` : ''}.`,
      sent_date: new Date().toISOString().slice(0, 10),
      category: 'check_in_exemption',
    });
    setWeek(''); setReason(''); reload();
  };
  const remove = async (id) => { await base44.entities.CheckInExemption.delete(id); reload(); };

  return <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Exempt a week from required check-ins</p>
    <form onSubmit={add} className="mb-3 flex flex-wrap gap-2">
      <input type="date" value={week} onChange={e => setWeek(e.target.value)} className="w-auto" required />
      <input required placeholder="Reason for exemption" value={reason} onChange={e => setReason(e.target.value)} className="w-auto flex-1 min-w-[160px]" />
      <button className="east-button">Exempt week</button>
    </form>
    {exemptions.length > 0 && <ul className="space-y-1">
      {exemptions.sort((a, b) => new Date(a.week_ending) - new Date(b.week_ending)).map(x => <li key={x.id} className="flex items-center justify-between gap-2 text-sm text-slate-700">
        <span>{x.week_ending}{x.reason ? ` — ${x.reason}` : ''}</span>
        <button onClick={() => remove(x.id)} className="text-slate-400 hover:text-red-600" title="Remove exemption"><Trash2 className="h-4 w-4" /></button>
      </li>)}
    </ul>}
  </div>;
}