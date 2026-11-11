import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import ReadingAssignmentBuilder from './ReadingAssignmentBuilder';
import ReadingAssignmentModal from './ReadingAssignmentModal';
import QuickAssignmentPaste from './QuickAssignmentPaste';
import { assignmentReleaseDate, buildPeriodReleaseTimes } from '@/lib/assignmentRelease';
import { isInNineWeeks } from '@/lib/gradingPeriods';
import { announceNewAssignment } from '@/lib/announceAssignment';
import PlainAssignmentEditor from '@/components/east/PlainAssignmentEditor';
import AssignmentManagementRow from '@/components/east/AssignmentManagementRow';

export default function AssignmentManager({ assignments, schoolYear, reload }) {
  const [form, setForm] = useState({ title: '', description: '', max_points: 10, due_date: '' });
  const [saving, setSaving] = useState(false);
  const [readingEditor, setReadingEditor] = useState(null);
  const [previewAssignment, setPreviewAssignment] = useState(null);
  const [plainEditor, setPlainEditor] = useState(null);
  const edit = item => { setReadingEditor(null); setPlainEditor(null); if (item.assignment_type === 'reading') setReadingEditor(item); else setPlainEditor(item); };
  const submit = async event => { event.preventDefault(); setSaving(true); const gradingPeriod = form.due_date ? [1, 2, 3, 4].find(segment => isInNineWeeks(form.due_date, segment)) || 1 : 1;
    const record = { ...form, max_points: Number(form.max_points), is_active: true, school_year: schoolYear, grading_period: gradingPeriod, assignment_type: 'plain' };
    await base44.entities.Assignment.create(record); await announceNewAssignment(record); setForm({ title: '', description: '', max_points: 10, due_date: '' }); setSaving(false); reload(); };
  const toggle = async item => { await base44.entities.Assignment.update(item.id, { is_active: !item.is_active }); reload(); };
  const toggleInstant = async item => {
    const instantRelease = !item.instant_release;
    const releaseDate = assignmentReleaseDate(item);
    const releaseTimes = buildPeriodReleaseTimes(releaseDate, instantRelease);
    await base44.entities.Assignment.update(item.id, { instant_release: instantRelease, period_release_times: releaseTimes, publish_at: releaseTimes['1'] });
    reload();
  };
  const saved = async () => { await reload(); setReadingEditor(null); setPlainEditor(null); };
  return <section className="glass-panel mb-6 p-5">
    <QuickAssignmentPaste schoolYear={schoolYear} reload={reload} />
    <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">Manage assignments</h3><button onClick={() => setReadingEditor({})} className="east-button">New reading assignment</button></div>
    {!readingEditor && <form onSubmit={submit} className="grid gap-3 md:grid-cols-4"><input required placeholder="Assignment title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /><input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /><input required type="number" min="1" placeholder="Points" value={form.max_points} onChange={e => setForm({ ...form, max_points: e.target.value })} /><input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /><button disabled={saving} className="east-button md:col-span-4">{saving ? 'Adding…' : 'Add assignment'}</button></form>}
    {plainEditor && <PlainAssignmentEditor key={plainEditor.id} assignment={plainEditor} onSaved={saved} onCancel={() => setPlainEditor(null)} />}
    {readingEditor && <ReadingAssignmentBuilder key={readingEditor.id || 'new'} assignment={readingEditor.id ? readingEditor : null} schoolYear={schoolYear} onSaved={saved} onCancel={() => setReadingEditor(null)} />}
    <div className="mt-4 space-y-2">{assignments.map(item => <AssignmentManagementRow key={item.id} item={item} onEdit={edit} onPreview={setPreviewAssignment} toggle={toggle} toggleInstant={toggleInstant} />)}</div>
    {previewAssignment && <ReadingAssignmentModal assignment={previewAssignment} previewMode onClose={() => setPreviewAssignment(null)} />}
  </section>;
}