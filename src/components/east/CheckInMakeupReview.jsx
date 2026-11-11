import { useState } from 'react';
import useEntityList from '@/hooks/useEntityList';
import { base44 } from '@/api/base44Client';
import { MAKEUP_NOTE_PREFIX, FULL_CREDIT_MAKEUP_NOTE_PREFIX, isMakeupGrade, isFullCreditMakeup, isFullCreditMakeupStudent, MAKEUP_FULL_MAX_POINTS, MAKEUP_HALF_MAX_POINTS } from '@/lib/checkInMakeup';
import { weekEndingFriday } from '@/lib/checkinWeeks';
import { useToast } from '@/components/ui/use-toast';
import { isNineWeeksClosed } from '@/lib/gradingPeriods';

export default function CheckInMakeupReview() {
  const { items: makeups, reload: reloadMakeups } = useEntityList('CheckInMakeup');
  const { items: grades, reload: reloadGrades } = useEntityList('AssignmentGrade');
  const { items: users } = useEntityList('User');
  const { items: unlocks } = useEntityList('NineWeeksUnlock');
  const [busy, setBusy] = useState('');
  const { toast } = useToast();
  const gradedMakeups = makeups.filter(item => item.status === 'graded' && !isNineWeeksClosed(item.week_ending)).sort((a, b) => String(b.week_ending).localeCompare(String(a.week_ending)));
  const studentName = id => users.find(u => u.id === id)?.full_name || users.find(u => u.id === id)?.email || 'Student';
  const studentById = id => users.find(u => u.id === id);

  const overrideGrade = async (makeup, value, max, fullCredit) => {
    if (isNineWeeksClosed(makeup.week_ending)) return;
    const points = Math.max(0, Math.min(max, Number(value) || 0));
    const weeklyAssignmentId = `weekly-${weekEndingFriday(makeup.week_ending)}`;
    setBusy(`${makeup.id}:grade`);
    try {
      const existing = grades.find(g => g.assignment_id === weeklyAssignmentId && g.student_id === makeup.student_id);
      const data = { assignment_id: weeklyAssignmentId, student_id: makeup.student_id, points, auto_points: makeup.ai_score, status: 'graded', teacher_note: fullCredit ? FULL_CREDIT_MAKEUP_NOTE_PREFIX : MAKEUP_NOTE_PREFIX };
      if (existing) await base44.entities.AssignmentGrade.update(existing.id, data);
      else await base44.entities.AssignmentGrade.create(data);
      await reloadGrades();
    } catch (error) {
      toast({ title: 'Makeup grade change could not finish', description: 'Check your connection and reload grades before retrying to see which changes were saved.', variant: 'destructive' });
    } finally { setBusy(''); }
  };

  const returnToStudent = async (makeup) => {
    if (isNineWeeksClosed(makeup.week_ending)) return;
    const weeklyAssignmentId = `weekly-${weekEndingFriday(makeup.week_ending)}`;
    setBusy(`${makeup.id}:return`);
    try {
      const existing = grades.find(g => g.assignment_id === weeklyAssignmentId && g.student_id === makeup.student_id && isMakeupGrade(g));
      if (existing) await base44.entities.AssignmentGrade.delete(existing.id);
      await base44.entities.CheckInMakeup.update(makeup.id, { status: 'returned' });
      await Promise.all([reloadGrades(), reloadMakeups()]);
    } catch (error) {
      toast({ title: 'Makeup grade change could not finish', description: 'Check your connection and reload grades before retrying to see which changes were saved.', variant: 'destructive' });
    } finally { setBusy(''); }
  };

  if (!gradedMakeups.length) return null;

  return <section className="mb-5 rounded-lg border border-primary/40 bg-primary/5 p-4">
    <h3 className="font-semibold">Check-in makeup tutorials ({gradedMakeups.length})</h3>
    <p className="mt-1 text-sm text-muted-foreground">AI-graded makeup tutorials for closed weeks. Override the score up to each tutorial's max (5 for half credit, 10 for a full-credit rescue), or return a tutorial to the student for revision.</p>
    <div className="mt-4 space-y-2">
      {gradedMakeups.map(makeup => {
        const weeklyAssignmentId = `weekly-${weekEndingFriday(makeup.week_ending)}`;
        const grade = grades.find(g => g.assignment_id === weeklyAssignmentId && g.student_id === makeup.student_id && isMakeupGrade(g));
        const student = studentById(makeup.student_id);
        const fullCredit = isFullCreditMakeup(grade) || isFullCreditMakeupStudent(student, unlocks);
        const max = fullCredit ? MAKEUP_FULL_MAX_POINTS : MAKEUP_HALF_MAX_POINTS;
        const points = grade ? Number(grade.points) : Number(makeup.ai_score);
        return <div key={makeup.id} className="rounded-lg border bg-card p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{studentName(makeup.student_id)} · {makeup.week_ending}{fullCredit && <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">full credit</span>}</p>
              <p className="text-xs text-muted-foreground">{makeup.skill_title} · {makeup.format === 'video' ? 'Video' : 'Written'} · AI score {makeup.ai_score}/{max}</p>
              {makeup.ai_feedback && <p className="mt-1 text-xs text-muted-foreground">AI: {makeup.ai_feedback}</p>}
              {makeup.format === 'written' && makeup.written_steps && <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-primary">Read tutorial</summary><pre className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{makeup.written_steps}</pre></details>}
              {makeup.format === 'video' && makeup.video_url && <a href={makeup.video_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-primary underline">Open video</a>}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Grade /10
                <input type="number" min="0" max={max} defaultValue={points} onBlur={e => e.target.value !== '' && overrideGrade(makeup, e.target.value, max, fullCredit)} className="ml-2 w-16" />
              </label>
              <button type="button" disabled={busy === `${makeup.id}:grade`} onClick={() => overrideGrade(makeup, points, max, fullCredit)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">{busy === `${makeup.id}:grade` ? 'Saving…' : 'Save'}</button>
              <button type="button" disabled={busy === `${makeup.id}:return`} onClick={() => returnToStudent(makeup)} className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary">{busy === `${makeup.id}:return` ? 'Returning…' : 'Return to student'}</button>
            </div>
          </div>
        </div>;
      })}
    </div>
  </section>;
}