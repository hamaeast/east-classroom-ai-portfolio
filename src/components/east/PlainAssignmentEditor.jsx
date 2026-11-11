import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ReadingAssignmentModal from '@/components/east/ReadingAssignmentModal';
import AssignmentGradingGuide from '@/components/east/AssignmentGradingGuide';
import saveAssignmentAndRegrade from '@/lib/saveAssignmentAndRegrade';

export default function PlainAssignmentEditor({ assignment, onSaved, onCancel }) {
  const [form, setForm] = useState({ ...assignment });
  const [preview, setPreview] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState(''), [progress, setProgress] = useState('');
  const queryClient = useQueryClient();
  const submit = async event => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const { title, description, due_date, due_time, max_points, grading_rubric, grading_period } = form;
      await saveAssignmentAndRegrade(assignment, { title, description, due_date, due_time: due_time || '23:59', max_points: Number(max_points), grading_rubric: grading_rubric || '', grading_period: Number(grading_period) }, setProgress);
      await Promise.all(['AssignmentGrade', 'ReadingResponse'].map(entity => queryClient.invalidateQueries({ queryKey: ['entity', entity] })));
      await onSaved();
    } catch (err) { setError(err.response?.data?.error || err.message || 'Saving or regrading did not finish. Student work is preserved; save again to retry.'); }
    finally { setSaving(false); }
  };
  const field = (key, value) => setForm(current => ({ ...current, [key]: value }));
  return <><form onSubmit={submit} className="mt-4 space-y-4 rounded-lg border border-border p-4">
    <h3 className="font-semibold">Edit assignment</h3>
    <label className="east-label">Title<input required value={form.title} onChange={e => field('title', e.target.value)} /></label>
    <label className="east-label block">Student directions<textarea value={form.description || ''} onChange={e => field('description', e.target.value)} /></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="east-label">Points<input required type="number" min="1" value={form.max_points} onChange={e => field('max_points', e.target.value)} /></label><label className="east-label">Due date<input type="date" value={form.due_date || ''} onChange={e => field('due_date', e.target.value)} /></label><label className="east-label">Due time<input type="time" value={form.due_time || '23:59'} onChange={e => field('due_time', e.target.value)} /></label><label className="east-label">Nine weeks<select value={form.grading_period || 1} onChange={e => field('grading_period', e.target.value)}>{[1,2,3,4].map(period => <option key={period} value={period}>{period}</option>)}</select></label></div>
    <label className="east-label block">Grading rubric<textarea rows={4} placeholder="Describe what earns full and partial credit." value={form.grading_rubric || ''} onChange={e => field('grading_rubric', e.target.value)} /></label>
    <AssignmentGradingGuide assignment={form} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><button disabled={saving} className="east-button">{saving ? progress || 'Saving…' : 'Save changes & regrade'}</button><button type="button" disabled={saving} onClick={() => setPreview(true)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Student view</button><button type="button" disabled={saving} onClick={onCancel} className="rounded-lg border px-3 py-2 text-sm">Cancel</button></div>
  </form>{preview && <ReadingAssignmentModal assignment={form} previewMode onClose={() => setPreview(false)} />}</>;
}