import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { isNineWeeksClosed } from '@/lib/gradingPeriods';

export default function CheckInDateEditor({ checkIn, onSaved }) {
  const [date, setDate] = useState(checkIn.week_ending || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => setDate(checkIn.week_ending || ''), [checkIn.week_ending]);

  const save = async () => {
    if (!date || date === checkIn.week_ending || isNineWeeksClosed(date) || isNineWeeksClosed(checkIn.week_ending)) return;
    setSaving(true);
    await base44.entities.WeeklyCheckIn.update(checkIn.id, { week_ending: date, original_submitted_at: checkIn.original_submitted_at || checkIn.created_date });
    const serviceEntries = await base44.entities.ServiceEntry.filter({ weekly_check_in_id: checkIn.id });
    if (serviceEntries.length) await base44.entities.ServiceEntry.update(serviceEntries[0].id, { service_date: date });
    await onSaved();
    setSaving(false);
  };

  return <label className="east-label">Week ending
    <span className="mt-1 flex gap-2"><input type="date" value={date} onChange={event => setDate(event.target.value)} className="h-8 min-h-8 w-auto" /><button type="button" disabled={saving || !date || date === checkIn.week_ending} onClick={save} className="rounded-md border px-2 text-xs font-semibold">{saving ? 'Saving…' : 'Save date'}</button></span>
    <span className="mt-1 block font-normal text-muted-foreground">Actually submitted {new Date(checkIn.original_submitted_at || checkIn.created_date).toLocaleString()}</span>
  </label>;
}