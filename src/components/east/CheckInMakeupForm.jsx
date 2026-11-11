import { useState } from 'react';
import { base44 } from '@/api/base44Client';

const FORMAT_OPTIONS = [
  { value: 'written', label: 'Written steps' },
  { value: 'video', label: 'Video (2–3 min)' },
];

export default function CheckInMakeupForm({ weekEnding, existing, onSubmitted, maxPoints = 5 }) {
  const prior = existing && existing.status === 'returned' ? existing : null;
  const [skillTitle, setSkillTitle] = useState(prior?.skill_title || '');
  const [format, setFormat] = useState(prior?.format || 'written');
  const [writtenSteps, setWrittenSteps] = useState(prior?.written_steps || '');
  const [videoUrl, setVideoUrl] = useState(prior?.video_url || '');
  const [videoDescription, setVideoDescription] = useState(prior?.video_description || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const creditLabel = maxPoints >= 10 ? 'full credit' : 'half credit';

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setResult(null);
    if (!skillTitle.trim()) { setError('Name the skill or technology your tutorial teaches.'); return; }
    if (format === 'written' && !writtenSteps.trim()) { setError('Write your step-by-step tutorial.'); return; }
    if (format === 'video' && !videoUrl.trim()) { setError('Paste your video link.'); return; }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('gradeCheckInMakeup', {
        week_ending: weekEnding,
        skill_title: skillTitle.trim(),
        format,
        written_steps: writtenSteps,
        video_url: videoUrl,
        video_description: videoDescription
      });
      const data = res.data || res;
      if (data?.error) { setError(data.error); }
      else { setResult(data); if (typeof onSubmitted === 'function') onSubmitted(data); }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Could not grade your tutorial. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5">
    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neon-magenta">Closed-week makeup · {weekEnding}</p>
    <h3 className="text-lg font-semibold">Teach a skill you used that week</h3>
    <p className="mb-4 mt-1 text-sm text-muted-foreground">Write a step-by-step tutorial (or link a 2–3 minute video) teaching a skill or technology you used during the week of {weekEnding}. The AI grades it on a 4th-grade writing bar; the most you can earn is {maxPoints}/10 — {creditLabel}.</p>

    <label className="east-label">What skill or technology are you teaching?
      <input required placeholder="Example: How to make a Google Form" value={skillTitle} onChange={e => setSkillTitle(e.target.value)} />
    </label>

    <div className="mt-3">
      <span className="east-label">Format</span>
      <div className="mt-1 flex gap-2">
        {FORMAT_OPTIONS.map(option => <button key={option.value} type="button" onClick={() => setFormat(option.value)} className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${format === option.value ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>{option.label}</button>)}
      </div>
    </div>

    {format === 'written' ? <label className="east-label mt-3 block">Your step-by-step tutorial
      <textarea required rows={8} placeholder="Step 1: &#10;Step 2: &#10;Step 3: …" value={writtenSteps} onChange={e => setWrittenSteps(e.target.value)} />
    </label> : <>
      <label className="east-label mt-3 block">Video link (Google Drive or YouTube)
        <input required placeholder="Paste your video link" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
      </label>
      <label className="east-label mt-3 block">Describe the steps your video teaches
        <textarea required rows={4} placeholder="Step 1: …&#10;Step 2: …" value={videoDescription} onChange={e => setVideoDescription(e.target.value)} />
      </label>
    </>}

    {error && <p className="mt-3 rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm font-semibold text-red-700">{error}</p>}
    {result && <div className="mt-3 rounded-lg border border-success/50 bg-success/10 p-4 text-sm">
      <p className="font-semibold text-foreground">AI grade: {result.ai_score}/{maxPoints} ({creditLabel})</p>
      {result.ai_feedback && <p className="mt-1 text-muted-foreground">{result.ai_feedback}</p>}
      {result.status === 'returned' && <p className="mt-2 font-semibold text-primary">This didn't earn credit yet — revise your tutorial and resubmit.</p>}
      {result.status === 'graded' && <p className="mt-2 font-semibold text-success">Saved to your gradebook for the week of {result.week_ending}.</p>}
    </div>}

    <div className="mt-4">
      <button type="submit" disabled={submitting} className="east-button">{submitting ? 'Grading…' : 'Submit makeup tutorial'}</button>
    </div>
  </form>;
}