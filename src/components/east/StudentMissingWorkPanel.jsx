import { Link } from 'react-router-dom';
import useEntityList from '@/hooks/useEntityList';
import { currentSchoolYearRange } from '@/lib/schoolYear';
import { chicagoToday, currentGoalWeekStart } from '@/lib/weeklyGoals';
import { adjustedAssignmentDueDate, isAssignmentAbsenceExempt } from '@/lib/assignmentDeadline';
import { isAssignmentReleased } from '@/lib/assignmentRelease';
import { isNineWeeksClosed, isCurrentNineWeeksAssignment } from '@/lib/gradingPeriods';
import { missingCheckInWeeks } from '@/lib/checkInReminder';
import { isFullSchoolWeekClosed } from '@/lib/schoolCalendar';

const Action = ({ to, title, detail }) => <Link to={to} className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 py-3 first:border-0"><div><p className="text-sm font-semibold text-foreground">{title}</p><p className="text-xs text-muted-foreground">{detail}</p></div><span className="east-button">Complete now</span></Link>;

export default function StudentMissingWorkPanel({ student }) {
  const { items: assignments, loading: assignmentsLoading } = useEntityList('Assignment');
  const { items: responses, loading: responsesLoading } = useEntityList('ReadingResponse');
  const { items: checkIns, loading: checkInsLoading } = useEntityList('WeeklyCheckIn');
  const { items: exemptions, loading: exemptionsLoading } = useEntityList('CheckInExemption');
  const { items: dismissals, loading: dismissalsLoading } = useEntityList('CheckInDismissal');
  const { items: goals, loading: goalsLoading } = useEntityList('WeeklyGoal');
  const { items: grades, loading: gradesLoading } = useEntityList('AssignmentGrade');
  const { items: pitches, loading: pitchesLoading } = useEntityList('ProjectPitch');
  const today = chicagoToday();
  const submitted = new Set(responses.filter(item => item.student_id === student.id).map(item => item.assignment_id));
  const missingReadings = assignments.filter(item => isCurrentNineWeeksAssignment(item) && item.school_year === currentSchoolYearRange().label && item.assignment_type === 'reading' && !isAssignmentAbsenceExempt(item.due_date, student) && isAssignmentReleased(item, student.class_period) && adjustedAssignmentDueDate(item.due_date, student).slice(0, 10) <= today && !isNineWeeksClosed(String(item.due_date).slice(0, 10)) && !submitted.has(item.id));
  const missingWeeks = missingCheckInWeeks(student, checkIns, exemptions, dismissals, new Date(), grades).filter(week => !isNineWeeksClosed(week));
  const goal = goals.find(item => item.student_id === student.id && item.week_start === currentGoalWeekStart() && !isFullSchoolWeekClosed(item.week_start));
  const goalDue = adjustedAssignmentDueDate(goal?.goal_due_at, student);
  const reflectionDue = adjustedAssignmentDueDate(goal?.reflection_due_at, student);
  const isPast = value => value && new Date(value.includes('T') ? value : `${value}T23:59:59`).getTime() < Date.now();
  const needsGoal = goal && !goal.goal_submitted_at && !isAssignmentAbsenceExempt(goal.goal_due_at, student) && isPast(goalDue);
  const needsReflection = goal?.goal_submitted_at && !goal.reflection_submitted_at && !isAssignmentAbsenceExempt(goal.reflection_due_at, student) && isPast(reflectionDue);
  const revisions = pitches.filter(item => item.approval_status === 'revision_requested' && (item.created_by_id === student.id || item.member_emails?.includes(student.email)));
  const count = missingReadings.length + missingWeeks.length + Number(needsGoal) + Number(needsReflection) + revisions.length;
  const loading = assignmentsLoading || responsesLoading || checkInsLoading || exemptionsLoading || dismissalsLoading || goalsLoading || gradesLoading || pitchesLoading;
  if (loading) return <section className="glass-panel mb-6 p-5"><p className="text-sm text-muted-foreground">Checking for missing work…</p></section>;
  if (!count) return <section className="glass-panel mb-6 border-success/50 p-5"><h3 className="font-semibold text-success">No missing work</h3><p className="mt-1 text-sm text-muted-foreground">You are caught up on work that can be completed online.</p></section>;
  return <section className="glass-panel mb-6 border-destructive/60 p-5"><h3 className="font-semibold text-destructive">Missing work · {count}</h3><p className="mb-2 mt-1 text-sm text-muted-foreground">Complete each item below. Late work will still follow the existing grading and teacher-review rules.</p>
    {missingWeeks.map(week => <Action key={`check-${week}`} to={`/check-ins?requiredWeek=${week}`} title="Weekly check-in" detail={`Week ending ${week}`} />)}
    {missingReadings.map(item => <Action key={item.id} to="/assignments" title={item.title} detail={`Reading assignment · Due ${adjustedAssignmentDueDate(item.due_date, student).slice(0, 10)}`} />)}
    {needsGoal && <Action to="/goals" title="Weekly goal" detail={`Due ${String(goalDue).slice(0, 10)}`} />}
    {needsReflection && <Action to="/goals" title="Goal reflection" detail={`Due ${String(reflectionDue).slice(0, 10)}`} />}
    {revisions.map(item => <Action key={item.id} to="/project-pitch" title={item.project_title} detail="Project pitch revisions requested" />)}
  </section>;
}