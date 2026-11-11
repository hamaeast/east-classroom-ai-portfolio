import { useState } from 'react';
import PitchEthicsFields from './PitchEthicsFields';
import StudentTagPicker from './StudentTagPicker';

export default function AdminPitchEditor({ pitch, partners, users = [], onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ project_title: pitch.project_title || '', problem: pitch.problem || '', solution: pitch.solution || '', technology_use: pitch.technology_use || '', ethics_statement: pitch.ethics_statement || '', ethical_concerns: pitch.ethical_concerns || '', client_name: pitch.client_name || '', community_partner_name: pitch.community_partner_name || pitch.client_partner_name || '', student_names: pitch.student_names || '', tagged_emails: pitch.tagged_emails || '' });
  const save = async () => { setSaving(true); await onSave(draft); setSaving(false); setEditing(false); };
  if (!editing) return <button type="button" onClick={() => setEditing(true)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-foreground">Edit pitch</button>;
  return <div className="grid w-full gap-2 rounded-lg border bg-muted/40 p-3">
    <input value={draft.project_title} onChange={e => setDraft({ ...draft, project_title: e.target.value })} placeholder="Project title" />
    <textarea value={draft.problem} onChange={e => setDraft({ ...draft, problem: e.target.value })} placeholder="Problem" />
    <textarea value={draft.solution} onChange={e => setDraft({ ...draft, solution: e.target.value })} placeholder="Solution" />
    <textarea value={draft.technology_use} onChange={e => setDraft({ ...draft, technology_use: e.target.value })} placeholder="Technology use" />
    <PitchEthicsFields draft={draft} setDraft={setDraft} />
    <input value={draft.client_name} onChange={e => setDraft({ ...draft, client_name: e.target.value })} placeholder="Client" />
    <select value={draft.community_partner_name} onChange={e => setDraft({ ...draft, community_partner_name: e.target.value })}><option value="">Community partner (optional)…</option>{partners.map(partner => <option key={partner.id} value={partner.name}>{partner.name}</option>)}</select>
    <StudentTagPicker value={draft.tagged_emails} onChange={(tagged_emails, selectedStudents) => setDraft({ ...draft, tagged_emails, student_names: selectedStudents.map(student => student.name).join(', ') })} />
    <div className="flex gap-2"><button type="button" disabled={saving} onClick={save} className="east-button">{saving ? 'Saving…' : 'Save changes'}</button><button type="button" onClick={() => setEditing(false)} className="rounded-lg border px-3 text-xs font-semibold">Cancel</button></div>
  </div>;
}