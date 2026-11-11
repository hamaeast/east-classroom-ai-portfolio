import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { currentSchoolYearRange } from '@/lib/schoolYear';
import { chicagoEndOfDay, chicagoToday, currentGoalWeekStart, isChicagoSchoolDay, isEnrollmentExemptWeek, suggestedReflectionDue } from '@/lib/weeklyGoals';
import { isFullSchoolWeekClosed } from '@/lib/schoolCalendar';
import { buildStudentRecommendationContext } from '@/lib/studentRecommendationContext';
import WeeklyGoalForm from './WeeklyGoalForm';
import GoalReflectionForm from './GoalReflectionForm';
import CartMakeupForm from './CartMakeupForm';
import { isOverSevenDaysOld, isGoalPhasePastDue } from '@/lib/goalMakeups';
import { hasFullCreditOverride } from '@/lib/gradeOverrides';
import { isWeeklyGoalClosed, isCurrentNineWeeksDate } from '@/lib/gradingPeriods';

const LATE_REFLECTION_PENALTY_START = '2026-09-04';

export default function WeeklyGoalPopup({ student }) {
  const { items, loading, reload } = useEntityList('WeeklyGoal');
  const { items: grades, loading: gradesLoading } = useEntityList('AssignmentGrade');
  const { items: assignments, loading: assignmentsLoading } = useEntityList('Assignment');
  const { items: coachingProfiles, loading: coachingLoading } = useEntityList('GoalCoachingProfile');
  const coachingProfile = coachingProfiles.find(item => item.student_id === student.id);
  const { items: pitches, loading: loadingPitches } = useEntityList('ProjectPitch');
  const { items: checkIns, loading: loadingCheckIns } = useEntityList('WeeklyCheckIn');
  const { items: doNowQuestions, loading: loadingDoNowQuestions } = useEntityList('DoNowQuestion');
  const { items: doNowResponses, loading: loadingDoNowResponses } = useEntityList('DoNowResponse');
  const [creating, setCreating] = useState(false);
  const weekStart = currentGoalWeekStart();
  const closedWeek = isFullSchoolWeekClosed(weekStart);
  const enrollmentExempt = isEnrollmentExemptWeek(student, weekStart);
  const todayQuestion = doNowQuestions.find(item => item.school_date === chicagoToday());
  const doNowComplete = !todayQuestion || doNowResponses.some(item => item.question_id === todayQuestion.id && item.student_id === student.id);
  const record = items.filter(item => item.student_id === student.id && item.week_start === weekStart).sort((a, b) => Number(Boolean(b.goal_submitted_at)) - Number(Boolean(a.goal_submitted_at)) || Number(Boolean(b.reflection_submitted_at)) - Number(Boolean(a.reflection_submitted_at)))[0];
  const recommendationContext = buildStudentRecommendationContext(student, { goals: items, pitches, checkIns });
  const overdueReflection = items
    .filter(item => item.student_id === student.id && item.week_start < weekStart && isCurrentNineWeeksDate(item.reflection_due_at || item.week_start) && !isWeeklyGoalClosed(item) && item.goal_submitted_at && !item.reflection_submitted_at && isGoalPhasePastDue(item, 'reflection', student) && !items.some(other => other.student_id === student.id && other.week_start === item.week_start && other.reflection_submitted_at) && item.reflection_due_at?.slice(0, 10) >= LATE_REFLECTION_PENALTY_START && !isFullSchoolWeekClosed(item.week_start) && !hasFullCreditOverride(grades, student.id, assignments.find(assignment => assignment.title === `Weekly Goal & Reflection — ${item.week_start}`)?.id))
    .sort((a, b) => b.week_start.localeCompare(a.week_start))[0] || null;

  useEffect(() => {
    if (loading || creating || closedWeek || enrollmentExempt || !isChicagoSchoolDay() || (record?.goal_assignment_id && record?.reflection_assignment_id)) return;
    setCreating(true);
    const setup = async () => {
      const year = currentSchoolYearRange();
      const { data } = await base44.functions.invoke('ensureWeeklyGoalAssignments', { weekStart, goalDueDate: weekStart, reflectionDueDate: suggestedReflectionDue(weekStart).slice(0, 10), schoolYear: year.label });
      if (data.skipped || data.active === false) { setCreating(false); return; }
      const assignmentData = { goal_assignment_id: data.goalAssignmentId, reflection_assignment_id: data.reflectionAssignmentId };
      if (record) await base44.entities.WeeklyGoal.update(record.id, assignmentData);
      else await base44.entities.WeeklyGoal.create({ student_id: student.id, week_start: weekStart, goal_due_at: chicagoEndOfDay(chicagoToday()), reflection_due_at: suggestedReflectionDue(weekStart), ...assignmentData });
      await reload(); setCreating(false);
    };
    setup();
  }, [creating, loading, record, reload, student.id, weekStart]);

  if (closedWeek || enrollmentExempt || loading || gradesLoading || assignmentsLoading || coachingLoading || loadingPitches || loadingCheckIns || loadingDoNowQuestions || loadingDoNowResponses || !doNowComplete) return null;
  if (overdueReflection) return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm"><section className="glass-panel max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto p-6"><h2 className="mb-2 text-xl font-semibold">Finish your overdue reflection</h2><p className="mb-4 text-xs text-muted-foreground">Complete the work for the week of {overdueReflection.week_start} to continue. Late work is worth 4 of 5 points and goes to your teacher for review.</p>{isOverSevenDaysOld(overdueReflection.reflection_due_at) ? <CartMakeupForm record={overdueReflection} phase="reflection" reload={reload} /> : <GoalReflectionForm record={overdueReflection} reload={reload} coachingProfile={coachingProfile} studentId={student.id} />}</section></div>;
  if (!isChicagoSchoolDay() || creating || !record || record.goal_submitted_at) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"><section className="glass-panel max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto p-6"><h2 className="mb-2 text-xl font-semibold">Set your goal for this week</h2><p className="mb-4 text-xs text-muted-foreground">Due today by midnight. You must submit this before any weekly check-in.</p><WeeklyGoalForm record={record} reload={reload} recommendationContext={recommendationContext} coachingProfile={coachingProfile} studentId={student.id} /></section></div>;
}