import { useState } from 'react';
import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { isInstructionDay } from '@/lib/schoolCalendar';
import { chicagoToday } from '@/lib/weeklyGoals';
import InstructionDayPicker from './InstructionDayPicker';

export default function AbsenceDeadlineAdjustments({ value, onChange }) {
  const [startDate, setStartDate] = useState(chicagoToday);
  const [days, setDays] = useState(1);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const save = () => {
    if (!isInstructionDay(startDate)) { setError('Choose a school instructional day.'); return; }
    const entry = { id: editingId || `${startDate}-${Date.now()}`, start_date: startDate, days };
    onChange(editingId ? value.map(item => item.id === editingId ? entry : item) : [...value, entry]);
    setStartDate(chicagoToday()); setDays(1); setEditingId(''); setError('');
  };
  const edit = item => { setStartDate(item.start_date); setDays(item.days); setEditingId(item.id); setError(''); };
  return <div className="mt-5 border-t border-border/60 pt-4">
    <div className="flex items-center gap-2"><CalendarDays size={17} className="text-neon-cyan" /><h4 className="font-semibold">Absence deadline adjustment</h4></div>
    <p className="mt-1 text-xs text-muted-foreground">Absences of 1–3 instructional days move affected deadlines. Absences of 4 or more instructional days exempt assignments due during the absence.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_9rem_auto]"><label className="east-label">First absent date<InstructionDayPicker value={startDate} onChange={setStartDate} /></label><label className="east-label">Days absent<input type="number" min="1" max="30" value={days} onChange={event => setDays(Math.max(1, Math.min(30, Number(event.target.value) || 1)))} /></label><button type="button" onClick={save} className="east-button self-end">{editingId ? 'Update absence' : 'Add absence'}</button></div>
    {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    {value.length > 0 && <div className="mt-3 space-y-2">{value.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm"><span><b>{item.start_date}</b> · {item.days} instructional day{item.days === 1 ? '' : 's'}</span><div className="flex gap-2"><button type="button" aria-label="Edit absence" onClick={() => edit(item)} className="rounded-lg border p-2"><Pencil size={14} /></button><button type="button" aria-label="Remove absence" onClick={() => onChange(value.filter(entry => entry.id !== item.id))} className="rounded-lg border p-2 text-destructive"><Trash2 size={14} /></button></div></div>)}</div>}
  </div>;
}