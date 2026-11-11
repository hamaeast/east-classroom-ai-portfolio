import { useEffect, useState } from 'react';
import { Printer, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DEFAULT_PGP_GOAL } from '@/lib/facilitationConstants';

export default function PGPReportControls({ settings, range, setRange, onSaved, onWritingReport, writingLoading }) {
  const setting = settings.find(item => item.key === 'pgp_goal');
  const [goal, setGoal] = useState(setting?.text_value || DEFAULT_PGP_GOAL), [saving, setSaving] = useState(false);
  useEffect(() => setGoal(setting?.text_value || DEFAULT_PGP_GOAL), [setting?.text_value]);
  const save = async () => { setSaving(true); if (setting) await base44.entities.FacilitationSetting.update(setting.id, { text_value: goal }); else await base44.entities.FacilitationSetting.create({ key: 'pgp_goal', text_value: goal }); setSaving(false); onSaved(); };
  return <section className="glass-panel mb-5 grid gap-3 p-4 print:hidden"><div className="grid gap-3 sm:grid-cols-2"><label className="east-label">Reporting period starts<input type="date" value={range.from} onChange={event => setRange({ ...range, from: event.target.value })} className="mt-1" /></label><label className="east-label">Reporting period ends<input type="date" value={range.to} onChange={event => setRange({ ...range, to: event.target.value })} className="mt-1" /></label></div><label className="east-label">Professional goal<textarea rows="4" value={goal} onChange={event => setGoal(event.target.value)} className="mt-1" /></label><div className="flex flex-wrap gap-2"><button disabled={saving} onClick={save} className="rounded-lg border px-4 py-2 text-sm font-semibold"><Save size={15} className="mr-2 inline" />Save goal</button><button onClick={() => window.print()} className="east-button"><Printer size={16} />Print / Save PDF</button><button disabled={writingLoading} onClick={onWritingReport} className="rounded-lg border px-4 py-2 text-sm font-semibold">{writingLoading ? 'Building writing portfolio…' : 'Run Student Writing Growth Report'}</button></div></section>;
}