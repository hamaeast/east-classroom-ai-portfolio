import WeeklyGoalForm from './WeeklyGoalForm';
import GoalReflectionForm from './GoalReflectionForm';
import CartMakeupForm from './CartMakeupForm';
import { isOverSevenDaysOld, isGoalPhasePastDue } from '@/lib/goalMakeups';
import { currentSchoolYearRange, inSchoolYear } from '@/lib/schoolYear';
import { currentGoalWeekStart, isEnrollmentExemptWeek } from '@/lib/weeklyGoals';
import { isFullSchoolWeekClosed } from '@/lib/schoolCalendar';
import { isWeeklyGoalClosed, isCurrentNineWeeksDate } from '@/lib/gradingPeriods';
import { hasFullCreditOverride } from '@/lib/gradeOverrides';

export default function MissingGoalMakeups({ student, goals, grades = [], assignments = [], reload, recommendationContext, coachingProfile }) {
  const year = currentSchoolYearRange();
  const currentWeek = currentGoalWeekStart();
  const missing = goals.filter(item => item.student_id === student?.id && inSchoolYear(item.week_start, year) && item.week_start < currentWeek && isCurrentNineWeeksDate(item.reflection_due_at || item.week_start) && !isWeeklyGoalClosed(item) && !isEnrollmentExemptWeek(student, item.week_start) && !isFullSchoolWeekClosed(item.week_start) && (!item.goal_submitted_at || (!item.reflection_submitted_at && isGoalPhasePastDue(item, 'reflection', student) && !goals.some(other => other.student_id === student.id && other.week_start === item.week_start && other.reflection_submitted_at))) && !hasFullCreditOverride(grades, student.id, assignments.find(assignment => assignment.title === `Weekly Goal & Reflection — ${item.week_start}`)?.id)).sort((a, b) => b.week_start.localeCompare(a.week_start));
  if (!missing.length) return null;
  return <section className="glass-panel mb-6 p-5"><h3 className="font-semibold">Missing goals and reflections</h3><p className="mt-1 text-sm text-muted-foreground">Complete missing work from this school year. Late work earns 4/5 and is sent to your teacher for review.</p><div className="mt-4 space-y-5">{missing.map(record => <div key={record.id} className="rounded-lg border border-border p-4"><h4 className="mb-3 text-sm font-semibold">Week of {record.week_start}</h4>{!record.goal_submitted_at && <div className="mb-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">Missing weekly goal</p>{isOverSevenDaysOld(record.goal_due_at) ? <CartMakeupForm record={record} phase="goal" reload={reload} /> : <WeeklyGoalForm record={record} reload={reload} recommendationContext={recommendationContext} coachingProfile={coachingProfile} studentId={student.id} />}</div>}{record.goal_submitted_at && !record.reflection_submitted_at && <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">Missing goal reflection</p>{isOverSevenDaysOld(record.reflection_due_at) ? <CartMakeupForm record={record} phase="reflection" reload={reload} /> : <GoalReflectionForm record={record} reload={reload} coachingProfile={coachingProfile} studentId={student.id} />}</div>}</div>)}</div></section>;
}