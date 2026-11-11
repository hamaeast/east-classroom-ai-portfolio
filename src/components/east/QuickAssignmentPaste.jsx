import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { chicagoToday } from '@/lib/weeklyGoals';
import { buildPeriodReleaseTimes } from '@/lib/assignmentRelease';
import { isInNineWeeks, NINE_WEEK_PERIODS } from '@/lib/gradingPeriods';
import { announceNewAssignment } from '@/lib/announceAssignment';

const today = chicagoToday();
const defaultDue = () => {
  const current = NINE_WEEK_PERIODS.find(item => today >= item.start && today <= item.end);
  return current ? current.end : '';
};
const gradingPeriodFor = date => (date ? [1, 2, 3, 4].find(seg => isInNineWeeks(date, seg)) || 1 : 1);

const normalizeQuestions = (questions = []) => questions.map((q, i) => ({
id: `q${i + 1}`,
type: q.type === 'multiple_choice' ? 'multiple_choice' : 'free_response',
prompt: String(q.prompt || ''),
choices: Array.isArray(q.choices) ? q.choices : [],
correct_choice: String(q.correct_choice || ''),
scoring_strategy: q.scoring_strategy || (q.type === 'multiple_choice' ? 'keyword' : 'ai'),
answer_key: String(q.answer_key || ''),
points: Number(q.points) || 1
}));

export default function QuickAssignmentPaste({ schoolYear, reload }) {
  const [text, setText] = useState('');
  const [directions, setDirections] = useState('');
  const [dueOverride, setDueOverride] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [last, setLast] = useState('');
  const [preview, setPreview] = useState(null); // editable parsed draft
  const [saving, setSaving] = useState(false);

  const build = async event => {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setError(''); setPreview(null);
    try {
      const directionsBlock = directions.trim()
        ? `\n\nThe teacher also gave these DIRECTIONS about how to build the assignment. Follow them closely — they override any defaults below:\n"""\n${directions.trim()}\n"""`
        : '';
      const parsed = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert instructional designer. The teacher pastes raw text below (a worksheet, an article + questions, a topic, or just a prompt) and you turn it into a single ready-to-assign class assignment for an EAST program high school class.${directionsBlock}

INTERPRET THE TEACHER'S INTENT and act on it:
- If the text says "make it interactive", "interactive", "add questions", "turn this into a quiz", "check for understanding", "make it engaging", or similar — actually build it into an interactive assignment. That means a reading assignment (assignment_type "reading") with multiple questions the student answers inside the platform: generate clear multiple-choice questions WITH plausible answer options and the correct choice, plus at least one short free-response question. Do not leave it as one plain prompt.
- If the teacher gives a topic only (no passage), write a short student-facing description and generate 3-5 interactive questions about the topic (mix of multiple choice with generated options/correct answers and free response). Use assignment_type "reading" with a short passage_text that frames the topic, OR "plain" with the questions as questions if no passage is needed. Prefer "reading" + questions when you want interactivity.
- If the text already contains a reading passage and questions, treat it as a reading assignment and include the passage and every question exactly as written, preserving the wording. If those questions are plain prompts with no choices and the text also asks to make it interactive, generate plausible multiple-choice options and the correct answer for each.
- If it is just a worksheet or a single prompt with no interactive intent, keep it simple: assignment_type "plain" with a clear description of what the student should do.

GRADING AND SCORING — apply the teacher's directions when given:
- For free-response questions, set scoring_strategy to "ai" when the directions ask for AI grading, "keyword" when the directions ask for keyword matching, and "manual" when the directions ask for manual teacher review. With no directions, default to "ai".
- When the directions give a rubric or scoring criteria for free-response questions, put that rubric in the answer_key field for each affected question so it is used at grading time.
- For multiple-choice questions, keep scoring_strategy "keyword" (the correct_choice is the key) and set answer_key to "".
- When the directions ask for AI grading, include a clear answer_key (rubric) for every free-response question even if you also wrote it in the directions, so the grader has a per-question rubric to score against.

Only set a due_date (YYYY-MM-DD) if one is clearly stated in the text; otherwise leave it empty. Default max_points to 10 unless a different point value is stated. Make multiple-choice correct_choice values match one of the choices exactly. Keep prompts and options classroom-appropriate and high-school level.

Return JSON with exactly these fields:
- title: short assignment title
- description: the student-facing instructions (what to do). Empty for reading assignments that are all passage + questions.
- max_points: number
- due_date: "YYYY-MM-DD" or ""
- assignment_type: "plain" or "reading"
- passage_text: the reading passage verbatim, or "" for plain
- article_url: a source link only if one is clearly in the text, else ""
- questions: array of { type: "multiple_choice"|"free_response", prompt, choices (array of strings, empty for free_response), correct_choice (string, empty if unknown), scoring_strategy ("ai"|"keyword"|"manual"), answer_key (string — rubric or required keywords for free-response; "" for multiple choice), points (number) }

Teacher's pasted text:
"""
${text}
"""`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            max_points: { type: 'number' },
            due_date: { type: 'string' },
            assignment_type: { type: 'string', enum: ['plain', 'reading'] },
            passage_text: { type: 'string' },
            article_url: { type: 'string' },
            questions: { type: 'array', items: { type: 'object', properties: {
              type: { type: 'string', enum: ['multiple_choice', 'free_response'] },
              prompt: { type: 'string' },
              choices: { type: 'array', items: { type: 'string' } },
              correct_choice: { type: 'string' },
              scoring_strategy: { type: 'string', enum: ['ai', 'keyword', 'manual'] },
              answer_key: { type: 'string' },
              points: { type: 'number' }
            }, required: ['type', 'prompt', 'points'] } }
          },
          required: ['title', 'max_points', 'assignment_type']
        }
      });

      setPreview({
        title: String(parsed.title || 'Untitled assignment').slice(0, 200),
        description: String(parsed.description || ''),
        max_points: Number(parsed.max_points) || 10,
        due_date: dueOverride || parsed.due_date || defaultDue(),
        assignment_type: parsed.assignment_type === 'reading' ? 'reading' : 'plain',
        passage_text: String(parsed.passage_text || ''),
        article_url: String(parsed.article_url || ''),
        questions: normalizeQuestions(parsed.questions)
      });
    } catch (err) {
      setError(err.message || 'Could not read the pasted text.');
    } finally {
      setBusy(false);
    }
  };

  const setField = (key, value) => setPreview(prev => ({ ...prev, [key]: value }));
  const setQuestion = (index, key, value) => setPreview(prev => ({ ...prev, questions: prev.questions.map((q, i) => i === index ? { ...q, [key]: value } : q) }));
  const setChoices = (index, value) => setPreview(prev => ({ ...prev, questions: prev.questions.map((q, i) => i === index ? { ...q, choices: String(value).split('\n').map(c => c.trim()).filter(Boolean) } : q) }));
  const addQuestion = () => setPreview(prev => ({ ...prev, questions: [...prev.questions, { id: `q${prev.questions.length + 1}`, type: 'free_response', prompt: '', choices: [], correct_choice: '', scoring_strategy: 'ai', points: 1 }] }));
  const removeQuestion = index => setPreview(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }));

  const confirm = async event => {
    event.preventDefault();
    if (!preview) return;
    setSaving(true); setError(''); setLast('');
    try {
      const isReading = preview.assignment_type === 'reading';
      const record = {
        title: preview.title.slice(0, 200),
        description: preview.description,
        max_points: Number(preview.max_points) || 10,
        due_date: preview.due_date,
        due_time: '23:59',
        is_active: true,
        school_year: schoolYear,
        grading_period: gradingPeriodFor(preview.due_date),
        assignment_type: isReading ? 'reading' : 'plain',
        release_date: today,
        period_release_times: buildPeriodReleaseTimes(today),
        publish_at: buildPeriodReleaseTimes(today)['1']
      };
      if (isReading) {
        record.passage_text = preview.passage_text;
        if (preview.article_url) record.article_url = preview.article_url;
      }
      if (preview.questions.length) record.questions = preview.questions.map((q, i) => ({ ...q, id: `q${i + 1}`, points: Number(q.points) || 0 }));
      await base44.entities.Assignment.create(record);
      await announceNewAssignment(record);
      setLast(`${record.title} · ${record.max_points} pts${preview.due_date ? ` · due ${preview.due_date}` : ''}`);
      setPreview(null); setText(''); setDirections(''); setDueOverride('');
      reload();
    } catch (err) {
      setError(err.message || 'Could not create the assignment.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="mb-6 rounded-lg border border-neon-cyan/40 bg-card/60 p-4">
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="font-semibold text-neon-cyan">Quick paste</h3>
      <span className="text-xs text-muted-foreground">Paste anything — a worksheet, article + questions, or a prompt — then review and edit before it's created.</span>
    </div>
    <textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder="Paste your assignment, reading passage + questions, or prompt here…" className="w-full" />
    <label className="east-label mt-3">Directions for the AI (optional) — how to build or grade it
      <textarea value={directions} onChange={e => setDirections(e.target.value)} rows={3} placeholder="e.g. Use the AI to grade free-response questions. Rubric: 2 pts for naming the main idea, 3 pts for citing evidence, 2 pts for a complete sentence, 3 pts for explaining it in your own words." />
    </label>
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <label className="east-label mb-0">
        Due date (optional — leaves it blank to let the AI find one, or default to this nine weeks)
        <input type="date" value={dueOverride} onChange={e => setDueOverride(e.target.value)} />
      </label>
      <button onClick={build} disabled={busy || !text.trim()} className="east-button">{busy ? 'Reading…' : 'Build preview'}</button>
      {last && !busy && <span className="text-xs text-success">Created: {last}</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>

    {preview && <form onSubmit={confirm} className="mt-5 space-y-4 border-t border-border/60 pt-4">
      <h4 className="text-sm font-semibold text-neon-cyan">Preview & edit</h4>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="east-label">Title<input value={preview.title} onChange={e => setField('title', e.target.value)} required /></label>
        <label className="east-label">Points<input type="number" min="1" value={preview.max_points} onChange={e => setField('max_points', e.target.value)} /></label>
        <label className="east-label">Due date<input type="date" value={preview.due_date} onChange={e => setField('due_date', e.target.value)} /></label>
        <label className="east-label">Type
          <select value={preview.assignment_type} onChange={e => setField('assignment_type', e.target.value)}>
            <option value="plain">Plain</option>
            <option value="reading">Reading</option>
          </select>
        </label>
      </div>
      <label className="east-label">Description / instructions
        <textarea value={preview.description} onChange={e => setField('description', e.target.value)} rows={3} />
      </label>
      {preview.assignment_type === 'reading' && <>
        <label className="east-label">Reading passage
          <textarea value={preview.passage_text} onChange={e => setField('passage_text', e.target.value)} rows={6} />
        </label>
        <label className="east-label">Source URL (optional)<input value={preview.article_url} onChange={e => setField('article_url', e.target.value)} /></label>
      </>}
        <div>
          <div className="mb-2 flex items-center justify-between"><span className="east-label mb-0">Questions</span><button type="button" onClick={addQuestion} className="rounded-lg border px-3 py-1 text-xs font-semibold">Add question</button></div>
          <div className="space-y-3">
            {preview.questions.map((q, i) => <div key={i} className="rounded-lg border border-border/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <select value={q.type} onChange={e => setQuestion(i, 'type', e.target.value)} className="w-auto">
                  <option value="free_response">Free response</option>
                  <option value="multiple_choice">Multiple choice</option>
                </select>
                <label className="east-label mb-0 flex items-center gap-2">Points<input type="number" min="0" value={q.points} onChange={e => setQuestion(i, 'points', e.target.value)} className="w-20" /></label>
                <button type="button" onClick={() => removeQuestion(i)} className="rounded-lg border px-2 py-1 text-xs font-semibold text-destructive">Remove</button>
              </div>
              <textarea value={q.prompt} onChange={e => setQuestion(i, 'prompt', e.target.value)} rows={2} placeholder="Question prompt" />
              {q.type === 'free_response' && <label className="east-label mt-2">Scoring strategy
                <select value={q.scoring_strategy || 'ai'} onChange={e => setQuestion(i, 'scoring_strategy', e.target.value)}>
                  <option value="ai">AI score against rubric</option>
                  <option value="keyword">Required keyword match</option>
                  <option value="manual">Send to manual review</option>
                </select>
              </label>}
              {q.type === 'free_response' && <label className="east-label mt-2">Answer key / rubric (used by the AI or keyword grader)
                <textarea value={q.answer_key || ''} onChange={e => setQuestion(i, 'answer_key', e.target.value)} rows={3} placeholder="Rubric or required keywords for this question" />
              </label>}
              {q.type === 'multiple_choice' && <>
                <label className="east-label mt-2">Choices (one per line)
                  <textarea value={q.choices.join('\n')} onChange={e => setChoices(i, e.target.value)} rows={q.choices.length || 2} />
                </label>
                <label className="east-label mt-2">Correct choice (must match a choice exactly)
                  <input value={q.correct_choice} onChange={e => setQuestion(i, 'correct_choice', e.target.value)} />
                </label>
              </>}
            </div>)}
            {!preview.questions.length && <p className="text-xs text-muted-foreground">No questions yet — add one, or save without questions.</p>}
          </div>
        </div>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={saving} className="east-button">{saving ? 'Creating…' : 'Create assignment'}</button>
        <button type="button" onClick={() => setPreview(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button>
      </div>
    </form>}
  </div>;
}