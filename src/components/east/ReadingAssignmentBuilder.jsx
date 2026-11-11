import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import ReadingQuestionEditor from './ReadingQuestionEditor';
import GoogleDocQuestionImport from './GoogleDocQuestionImport';
import { assignmentReleaseDate, buildPeriodReleaseTimes } from '@/lib/assignmentRelease';
import { announceNewAssignment } from '@/lib/announceAssignment';
import { useQueryClient } from '@tanstack/react-query';
import ReadingAssignmentModal from '@/components/east/ReadingAssignmentModal';
import AssignmentGradingGuide from '@/components/east/AssignmentGradingGuide';
import saveAssignmentAndRegrade from '@/lib/saveAssignmentAndRegrade';

const newQuestion = type => ({ id: crypto.randomUUID(), type, prompt: '', choices: type === 'multiple_choice' ? ['', ''] : [], correct_choice: '', scoring_strategy: type === 'free_response' ? 'manual' : '', answer_key: '', points: 1 });
export default function ReadingAssignmentBuilder({ assignment, schoolYear, onSaved, onCancel }) {
  const [form, setForm] = useState(() => assignment ? { due_time: '23:59', passage_text: '', instant_release: false, ...assignment, release_date: assignmentReleaseDate(assignment) } : { title: '', description: '', article_url: '', passage_text: '', due_date: '', due_time: '23:59', release_date: '', instant_release: false, max_points: 10, grading_period: 1, questions: [newQuestion('multiple_choice')] });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false), [progress, setProgress] = useState('');
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const updateQuestion = (index, value) => setForm(current => ({ ...current, questions: current.questions.map((item, i) => i === index ? value : item) }));
  const removeQuestion = index => setForm(current => ({ ...current, questions: current.questions.filter((_, i) => i !== index) }));
  const importQuestions = questions => {
    const imported = questions.map((question, index) => ({
      ...question,
      id: assignment?.questions?.[index]?.id || crypto.randomUUID(),
      choices: question.type === 'multiple_choice' ? question.choices : [],
      scoring_strategy: question.type === 'free_response' ? (question.scoring_strategy || (question.answer_key ? 'ai' : 'manual')) : ''
    }));
    const total = imported.reduce((sum, question) => sum + Math.max(1, Number(question.points) || 1), 0);
    setForm(current => ({ ...current, questions: imported, max_points: total }));
    setError('');
  };
  const submit = async event => {
    event.preventDefault();
    const publicationAction = event.nativeEvent.submitter?.value || 'draft';
    if (publicationAction === 'schedule' && !form.release_date) return setError('Choose a release date.');
    const total = form.questions.reduce((sum, item) => sum + Number(item.points), 0);
    if (total !== Number(form.max_points)) return setError(`Question points total ${total}; it must equal ${form.max_points}.`);
    if (form.questions.some(item => item.type === 'multiple_choice' && !item.correct_choice)) return setError('Mark the correct answer for every multiple-choice question.');
    setSaving(true); setError('');
    try {
    const { publish_at, period_release_times, id, created_date, updated_date, created_by_id, ...formFields } = form;
    const releaseTimes = form.release_date ? buildPeriodReleaseTimes(form.release_date, form.instant_release) : {};
    const data = { ...formFields, ...(publicationAction === 'schedule' ? { publish_at: releaseTimes['1'], period_release_times: releaseTimes } : {}), max_points: Number(form.max_points), grading_period: Number(form.grading_period), assignment_type: 'reading', is_active: publicationAction === 'save' ? assignment.is_active : publicationAction === 'schedule', school_year: schoolYear };
    if (assignment?.id) await saveAssignmentAndRegrade(assignment, data, setProgress); else { const created = await base44.entities.Assignment.create(data); if (data.is_active) await announceNewAssignment(created); }
    await Promise.all(['AssignmentGrade', 'ReadingResponse'].map(entity => queryClient.invalidateQueries({ queryKey: ['entity', entity] })));
    await onSaved();
    } catch (err) { setError(err.response?.data?.error || err.message || 'Saving or regrading did not finish. Student answers are preserved; save again to retry.'); }
    finally { setSaving(false); }
  };
  return <><form onSubmit={submit} className="mt-4 space-y-4 border-t border-border/60 pt-4"><div className="grid gap-3 md:grid-cols-2"><input required placeholder="Assignment title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /><input required type="url" placeholder="https://article-url.com" value={form.article_url} onChange={e => setForm({ ...form, article_url: e.target.value })} /><label className="east-label md:col-span-2">Article image link<input type="url" placeholder="Paste the original article image link" value={form.article_image_url || ''} onChange={e => setForm({ ...form, article_image_url: e.target.value })} /></label><textarea className="md:col-span-2" placeholder="Student directions" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /><label className="east-label md:col-span-2">Passage text shown inside the assignment<textarea required className="mt-1 min-h-48" placeholder="Paste the complete reading passage here" value={form.passage_text || ''} onChange={e => setForm({ ...form, passage_text: e.target.value })} /></label><label className="east-label">Reading assignment due date<input required type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></label><label className="east-label">Reading assignment due time<input required type="time" value={form.due_time || '23:59'} onChange={e => setForm({ ...form, due_time: e.target.value })} /></label><label className="east-label">Release date<input type="date" value={form.release_date || ''} onChange={e => setForm({ ...form, release_date: e.target.value })} /><span className="mt-1 block font-normal">Periods 1, 2, 3, 6, and 7 release 15 minutes after class starts.</span></label><input required type="number" min="1" aria-label="Total points" value={form.max_points} onChange={e => setForm({ ...form, max_points: Number(e.target.value) })} /><label className="east-label">Nine weeks<select value={form.grading_period} onChange={e => setForm({ ...form, grading_period: Number(e.target.value) })}>{[1,2,3,4].map(value => <option key={value} value={value}>{value}</option>)}</select></label></div><AssignmentGradingGuide assignment={form} /><GoogleDocQuestionImport onImport={importQuestions} /><div className="space-y-3">{form.questions.map((question, index) => <ReadingQuestionEditor key={question.id} question={question} index={index} update={updateQuestion} remove={removeQuestion} />)}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setForm({ ...form, questions: [...form.questions, newQuestion('multiple_choice')] })} className="rounded-lg border px-3 py-2 text-sm font-semibold">+ Multiple choice</button><button type="button" onClick={() => setForm({ ...form, questions: [...form.questions, newQuestion('free_response')] })} className="rounded-lg border px-3 py-2 text-sm font-semibold">+ Free response</button></div>{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap gap-2">{assignment?.id && <button type="submit" value="save" disabled={saving} className="east-button">{saving ? progress || 'Saving…' : 'Save changes & regrade'}</button>}<button type="button" disabled={saving} onClick={() => setPreview(true)} className="rounded-lg border px-4 text-sm font-semibold">Student view</button><button type="submit" value="draft" disabled={saving} className="rounded-lg border px-4 text-sm font-semibold">{saving ? 'Saving…' : 'Save as draft'}</button><button type="submit" value="schedule" disabled={saving || !form.release_date} className="east-button">{saving ? 'Saving…' : 'Schedule publication'}</button><button type="button" onClick={onCancel} className="rounded-lg border px-4 text-sm font-semibold">Cancel</button></div></form>{preview && <ReadingAssignmentModal assignment={form} previewMode onClose={() => setPreview(false)} />}</>;
}