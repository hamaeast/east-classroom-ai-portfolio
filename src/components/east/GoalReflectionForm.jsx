import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { showSubmissionRequirements } from '@/lib/submissionRequirements';
import { reviewSecondGradeWriting, usesSecondGradeOnlyReview } from '@/lib/goalWritingCheck';
import DictationButton from './DictationButton';
import SpeakTextButton from './SpeakTextButton';
import { lateMakeupPoints } from '@/lib/goalMakeups';
import { isWeeklyGoalClosed } from '@/lib/gradingPeriods';
import GuidedGoalCoaching from './GuidedGoalCoaching';

export default function GoalReflectionForm({ record, reload, coachingProfile, studentId }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ met_goal: record.met_goal || '', met_goal_day: record.met_goal_day || '', goal_too_hard: record.goal_too_hard || '', reflection_notes: record.reflection_notes || '', collaboration_contribution: record.collaboration_contribution || '' });
  const [saving, setSaving] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [coachingContext, setCoachingContext] = useState(null);
  const writingRef = useRef(null);
  useEffect(() => { if (coachingContext !== null) writingRef.current?.focus(); }, [coachingContext]);
  const submit = async event => {
    event.preventDefault();
    if (isWeeklyGoalClosed(record)) { showSubmissionRequirements('This nine-weeks period is closed. Grades and submissions are locked.'); return; }
    if (coachingProfile?.needs_coaching && coachingContext === null) return;
    setSaving(true);
    const reviewKey = `reflection-ai-reviewed:${record.id}`;
    if (usesSecondGradeOnlyReview(record.week_start) && form.reflection_notes.trim() && !localStorage.getItem(reviewKey)) {
      let review;
      try {
        review = await reviewSecondGradeWriting(form.reflection_notes, 'weekly reflection', `Student planning answers: ${coachingContext || ''}`);
      } catch {
        review = { acceptable: true, suggestion: '' };
      }
      if (!review.acceptable) {
        localStorage.setItem(reviewKey, 'true');
        setSuggestion(review.suggestion);
        showSubmissionRequirements(review.suggestion || 'Please revise your reflection once, then submit it again.');
        setSaving(false);
        return;
      }
    }
    localStorage.removeItem(reviewKey);
    const submittedAt = new Date().toISOString();
    const data = { ...form, met_goal_day: form.met_goal === 'yes' ? form.met_goal_day : undefined, reflection_submitted_at: submittedAt, reflection_grade: lateMakeupPoints(record.reflection_due_at, submittedAt, user) };
    await base44.entities.WeeklyGoal.update(record.id, data);
    await base44.functions.invoke('awardWeeklyGoalGrade', { weeklyGoalId: record.id, phase: 'reflection' });
    setSaving(false); await reload();
  };
  return <form onSubmit={submit} className="grid gap-3 md:grid-cols-2"><div className="rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 p-4 md:col-span-2"><p className="text-xs font-bold uppercase tracking-wide text-neon-cyan">Your goal for this week</p><p className="mt-1 text-sm font-semibold text-foreground">{record.goal_text}</p></div>{coachingProfile?.needs_coaching && <div className="md:col-span-2"><GuidedGoalCoaching studentId={studentId} record={record} phase="reflection" onReady={setCoachingContext} /></div>}{(!coachingProfile?.needs_coaching || coachingContext !== null) && <><label className="east-label">Did you meet your goal? <SpeakTextButton text="Did you meet your goal?" /><select required value={form.met_goal} onChange={event => setForm({ ...form, met_goal: event.target.value })}><option value="">Choose…</option><option value="yes">Yes</option><option value="no">No</option></select></label>{form.met_goal === 'yes' && <label className="east-label">What day did you meet it? <SpeakTextButton text="What day did you meet it?" /><select required value={form.met_goal_day} onChange={event => setForm({ ...form, met_goal_day: event.target.value })}><option value="">Choose…</option>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => <option key={day}>{day}</option>)}</select></label>}<label className="east-label">Was your goal set too hard? <SpeakTextButton text="Was your goal set too hard?" /><select required value={form.goal_too_hard} onChange={event => setForm({ ...form, goal_too_hard: event.target.value })}><option value="">Choose…</option><option value="yes">Yes</option><option value="no">No</option></select></label><label className="east-label md:col-span-2">How did you help your team this week? <SpeakTextButton text="How did you help your team this week?" /><textarea value={form.collaboration_contribution} onChange={event => setForm({ ...form, collaboration_contribution: event.target.value })} placeholder="Describe something specific you did to help, support, organize, or work with your team." /><DictationButton value={form.collaboration_contribution} onChange={collaboration_contribution => setForm({ ...form, collaboration_contribution })} /></label><label className="east-label md:col-span-2">What challenges did you face, how did you overcome them, or what did you do to complete your goal? If you did not meet your goal, explain why. <SpeakTextButton text="What challenges did you face, how did you overcome them, or what did you do to complete your goal? If you did not meet your goal, explain why." /><textarea ref={writingRef} value={form.reflection_notes} onChange={event => setForm({ ...form, reflection_notes: event.target.value })} /><DictationButton value={form.reflection_notes} onChange={reflection_notes => setForm({ ...form, reflection_notes })} /></label>{suggestion && <p className="rounded-lg bg-primary/10 p-3 text-sm font-medium text-primary md:col-span-2">Writing suggestion: {suggestion}</p>}<button disabled={saving} className="east-button md:col-span-2">{saving ? 'Submitting…' : 'Submit goal reflection'}</button></>}</form>;
}