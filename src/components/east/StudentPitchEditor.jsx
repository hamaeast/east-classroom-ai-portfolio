import { useState } from 'react';
import PitchEthicsFields from './PitchEthicsFields';
import StudentTagPicker from './StudentTagPicker';

export default function StudentPitchEditor({ pitch, partners, onSave, startOpen = false, ethicsOnly = false }) {
  const [editing, setEditing] = useState(startOpen);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ project_title: pitch.project_title || '', problem: pitch.problem || '', solution: pitch.solution || '', technology_use: pitch.technology_use || '', ethics_statement: pitch.ethics_statement || '', ethical_concerns: pitch.ethical_concerns || '', client_name: pitch.client_name || '', community_partner_name: pitch.community_partner_name || pitch.client_partner_name || '', tagged_emails: pitch.tagged_emails || '', tagged_names: [] });

  const save = async event => {
    event.preventDefault();
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };

  if (!editing) return <button type="button" onClick={() => setEditing(true)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">{ethicsOnly ? 'Add ethics information' : 'Edit pitch'}</button>;
  return <form onSubmit={save} className="grid w-full gap-2 rounded-lg border bg-muted/40 p-3">
    {!ethicsOnly && <><input required value={draft.project_title} onChange={event => setDraft({ ...draft, project_title: event.target.value })} placeholder="Project title" />
    <textarea required value={draft.problem} onChange={event => setDraft({ ...draft, problem: event.target.value })} placeholder="Problem" />
    <textarea required value={draft.solution} onChange={event => setDraft({ ...draft, solution: event.target.value })} placeholder="Solution" />
    <textarea required value={draft.technology_use} onChange={event => setDraft({ ...draft, technology_use: event.target.value })} placeholder="Technology use" /></>}
    <PitchEthicsFields draft={draft} setDraft={setDraft} />
    {!ethicsOnly && <><input value={draft.client_name} onChange={event => setDraft({ ...draft, client_name: event.target.value })} placeholder="Client (optional)" />
    <select value={draft.community_partner_name} onChange={event => setDraft({ ...draft, community_partner_name: event.target.value })}><option value="">Community partner (optional)…</option>{partners.map(partner => <option key={partner.id} value={partner.name}>{partner.name}</option>)}</select>
    <StudentTagPicker value={draft.tagged_emails} onChange={(tagged_emails, selectedStudents) => setDraft({ ...draft, tagged_emails, tagged_names: selectedStudents.map(student => student.name) })} /></>}
    <div className="flex gap-2"><button disabled={saving} className="east-button">{saving ? 'Saving…' : 'Save pitch changes'}</button><button type="button" onClick={() => setEditing(false)} className="rounded-lg border px-3 text-xs font-semibold">Cancel</button></div>
  </form>;
}