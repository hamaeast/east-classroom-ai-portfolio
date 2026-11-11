import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/east/PageHeader';
import EmptyState from '@/components/east/EmptyState';
import SpellCheckModal from '@/components/east/SpellCheckModal';
import { currentSchoolYearRange } from '@/lib/schoolYear';

export default function Skills() {
  const { items, loading, reload } = useEntityList('StudentSkill');
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';
  const blank = { student_name: '', skill_name: '', software_tools: '', proficiency: 'beginner', certification_name: '', certificate_url: '', notes: '' };
  const [form, setForm] = useState(blank);
  useEffect(() => { if (!isAdmin && me?.full_name) setForm(f => ({ ...f, student_name: me.full_name })); }, [isAdmin, me]);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState(null);
  const schoolYear = currentSchoolYearRange();
  const saveSkill = async (data) => { await base44.entities.StudentSkill.create({ ...data, school_year: schoolYear.label }); setForm(blank); reload(); };
  const submit = async (e) => {
    e.preventDefault();
    setChecking(true);
    const original = { skill_name: form.skill_name, software_tools: form.software_tools, notes: form.notes, certification_name: form.certification_name };
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Check the following student-submitted text fields for spelling and grammar mistakes only (do not change meaning). Return the corrected version of each field, or the same text if it's already correct. Leave a field empty if it was empty.\n\nSkill: "${original.skill_name}"\nSoftware/tools: "${original.software_tools}"\nNotes: "${original.notes}"\nCertification name: "${original.certification_name}"`,
      response_json_schema: { type: 'object', properties: { skill_name: { type: 'string' }, software_tools: { type: 'string' }, notes: { type: 'string' }, certification_name: { type: 'string' } }, required: ['skill_name', 'software_tools', 'notes', 'certification_name'] },
    });
    setChecking(false);
    const diffs = Object.entries({ skill_name: 'Skill', software_tools: 'Software / tools', notes: 'Notes', certification_name: 'Certification name' })
      .filter(([key]) => original[key].trim() && result[key].trim() !== original[key].trim())
      .map(([key, label]) => ({ key, label, original: original[key], corrected: result[key] }));
    if (!diffs.length) { await saveSkill(form); return; }
    setPending({ diffs, corrected: { ...form, ...result } });
  };
  const acceptCorrections = async () => { const corrected = pending.corrected; setPending(null); await saveSkill(corrected); };
  const declineCorrections = async () => { setPending(null); await saveSkill(form); };
  const uploadCertificate = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, certificate_url: file_url }));
    setUploading(false);
  };
  const grouped = items.reduce((acc, x) => { (acc[x.student_name] = acc[x.student_name] || []).push(x); return acc; }, {});

  return <><PageHeader title="Student Skill & Software Log" description="Students record the skills they're building, the software or tools they've learned, and any certificates earned." />
    <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5">
      {isAdmin ? <input required placeholder="Student name" value={form.student_name} onChange={e => setForm({ ...form, student_name: e.target.value })} /> : <input required disabled value={form.student_name} />}
      <input required placeholder="Skill (e.g. video editing)" value={form.skill_name} onChange={e => setForm({ ...form, skill_name: e.target.value })} />
      <input placeholder="Software / tools used" value={form.software_tools} onChange={e => setForm({ ...form, software_tools: e.target.value })} />
      <select value={form.proficiency} onChange={e => setForm({ ...form, proficiency: e.target.value })}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select>
      <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      <input placeholder="Certification name (optional)" value={form.certification_name} onChange={e => setForm({ ...form, certification_name: e.target.value })} />
      <label className="east-label flex flex-col justify-center">Certificate upload (optional)
        <input type="file" accept="image/*,.pdf" onChange={uploadCertificate} />
        {uploading && <span className="text-xs text-slate-500">Uploading…</span>}
        {form.certificate_url && !uploading && <span className="text-xs text-green-700">Certificate attached ✓</span>}
      </label>
      <button disabled={checking} className="east-button md:col-span-2 xl:col-span-1">{checking ? 'Checking spelling…' : 'Add skill'}</button>
    </form>
    <SpellCheckModal diffs={pending?.diffs} onAccept={acceptCorrections} onDecline={declineCorrections} />
    {loading ? <p>Loading…</p> : !Object.keys(grouped).length ? <EmptyState>Students can log their first skill above.</EmptyState> : <div className="space-y-5">
      {Object.entries(grouped).map(([name, skills]) => <div key={name} className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold">{name}</h3>
        <table className="east-table"><thead><tr><th>Year</th><th>Skill</th><th>Software / tools</th><th>Proficiency</th><th>Certification</th><th>Notes</th></tr></thead>
          <tbody>{skills.map(s => <tr key={s.id}><td className="text-xs text-slate-500">{s.school_year || '—'}</td><td className="font-medium">{s.skill_name}</td><td>{s.software_tools || '—'}</td><td className="capitalize">{s.proficiency}</td><td>{s.certification_name || '—'}{s.certificate_url && <a href={s.certificate_url} target="_blank" rel="noreferrer" className="ml-2 text-cyan-700 underline">view</a>}</td><td>{s.notes || '—'}</td></tr>)}</tbody>
        </table>
      </div>)}
    </div>}
  </>;
}