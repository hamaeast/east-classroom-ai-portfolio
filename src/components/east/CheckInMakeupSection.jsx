import { useEffect, useMemo, useState } from 'react';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import { missingCheckInWeeks } from '@/lib/checkInReminder';
import { closedMissingWeeksForStudent, activeUnlockForDate, isNineWeeksClosedForStudent } from '@/lib/nineWeeksUnlock';
import { makeupMaxPoints } from '@/lib/checkInMakeup';
import CheckInMakeupForm from './CheckInMakeupForm';

export default function CheckInMakeupSection({ preselectWeek = '' }) {
  const { items: checks, reload: reloadChecks } = useEntityList('WeeklyCheckIn');
  const { items: exemptions } = useEntityList('CheckInExemption');
  const { items: dismissals } = useEntityList('CheckInDismissal');
  const { items: grades, loading: gradesLoading, reload: reloadGrades } = useEntityList('AssignmentGrade');
  const { items: makeups, reload: reloadMakeups } = useEntityList('CheckInMakeup');
  const { items: unlocks } = useEntityList('NineWeeksUnlock');
  const { user: me } = useAuth();
  const [activeWeek, setActiveWeek] = useState('');

  const missing = useMemo(() => (me && !gradesLoading ? missingCheckInWeeks(me, checks, exemptions, dismissals, new Date(), grades) : []), [me, checks, exemptions, dismissals, grades, gradesLoading]);
  const closed = useMemo(() => closedMissingWeeksForStudent(missing, me, unlocks).filter(week => !isNineWeeksClosedForStudent(week, me?.id, unlocks)), [missing, me, unlocks]);
  const rescueWeeks = useMemo(() => closed.filter(week => activeUnlockForDate(unlocks, me?.id, week)), [closed, unlocks, me]);
  const myMakeups = useMemo(() => (me ? makeups.filter(item => item.student_id === me.id) : []), [makeups, me]);
  const maxPoints = me ? makeupMaxPoints(me, unlocks) : 5;
  const creditLabel = maxPoints >= 10 ? 'full credit (10/10)' : 'half credit (5/10)';
  const creditShort = maxPoints >= 10 ? 'full credit' : 'half credit';

  useEffect(() => {
    if (preselectWeek && closed.includes(preselectWeek)) setActiveWeek(preselectWeek);
  }, [preselectWeek, closed.join(',')]);

  if (!me || gradesLoading || (!closed.length && !myMakeups.length)) return null;
  const activeMakeup = activeWeek ? myMakeups.find(item => item.week_ending === activeWeek) : null;
  const rescueDeadline = rescueWeeks.length ? rescueWeeks.map(week => activeUnlockForDate(unlocks, me.id, week)?.unlocked_until).filter(Boolean).sort().at(-1) : null;

  return <section className="mb-6 space-y-3">
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-5">
      <h3 className="text-sm font-semibold text-primary">Closed-week makeup tutorials</h3>
      <p className="mt-1 text-xs text-muted-foreground">These weekly check-ins are past the two-week submission window. You can't submit them normally, but you can earn up to {creditLabel} by teaching a skill you used that week in a step-by-step tutorial.</p>
      {rescueDeadline && <p className="mt-2 rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">⏰ Rescue window: these tutorials are due by {new Date(rescueDeadline).toLocaleString()}.</p>}
      {closed.length ? <div className="mt-3 flex flex-wrap gap-2">{closed.map(week => <button key={week} type="button" onClick={() => setActiveWeek(week)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${activeWeek === week ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground'}`}>{week}</button>)}</div> : !myMakeups.length ? <p className="mt-3 text-xs text-muted-foreground">No closed missing weeks right now.</p> : null}
    </div>
    {activeWeek && <CheckInMakeupForm key={activeWeek} weekEnding={activeWeek} existing={activeMakeup} maxPoints={maxPoints} onSubmitted={() => { reloadChecks(); reloadGrades(); reloadMakeups(); }} />}
    {myMakeups.length > 0 && <div className="rounded-xl border border-border bg-card p-5">
      <h4 className="text-sm font-semibold">Your makeup tutorials</h4>
      <div className="mt-3 space-y-3">
        {myMakeups.map(makeup => <div key={makeup.id} className="rounded-lg border border-border/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">{makeup.skill_title} · {makeup.week_ending}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${makeup.status === 'graded' ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary'}`}>{makeup.status === 'graded' ? `${makeup.ai_score}/${maxPoints} ${creditShort}` : 'Returned — revise & resubmit'}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{makeup.format === 'video' ? 'Video tutorial' : 'Written tutorial'} · graded {makeup.graded_at ? new Date(makeup.graded_at).toLocaleDateString() : ''}</p>
          {makeup.ai_feedback && <p className="mt-1 text-xs text-muted-foreground">AI feedback: {makeup.ai_feedback}</p>}
          {makeup.status === 'returned' && !isNineWeeksClosedForStudent(makeup.week_ending, me?.id, unlocks) && <button type="button" onClick={() => setActiveWeek(makeup.week_ending)} className="mt-2 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Revise this tutorial</button>}
        </div>)}
      </div>
    </div>}
  </section>;
}