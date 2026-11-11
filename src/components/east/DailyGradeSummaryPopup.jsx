import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import useEntityList from '@/hooks/useEntityList';
import { currentSchoolYearRange, inSchoolYear } from '@/lib/schoolYear';
import { NINE_WEEK_PERIODS, isInNineWeeks } from '@/lib/gradingPeriods';
import { buildWeeklyGrades } from '@/lib/gradebook';
import { gradeColumns, studentSummary } from '@/lib/gradebookReports';
import { adjustedAssignmentDueDate, isAssignmentAbsenceExempt } from '@/lib/assignmentDeadline';
import { isAssignmentReleased } from '@/lib/assignmentRelease';
import { chicagoToday } from '@/lib/weeklyGoals';
import { fridaysBetween, weekEndingFriday } from '@/lib/checkinWeeks';
import { expectedStandardsGrade } from '@/lib/standardsExpectedGrade';
import { frozenStandardsAssignments } from '@/lib/learningSummaryGrade';
import FirstNineWeeksGradeBox from '@/components/east/FirstNineWeeksGradeBox';

export default function DailyGradeSummaryPopup({ student }) {
  const { updateCurrentUser } = useAuth();
  const assignmentSource = useEntityList('Assignment'), gradeSource = useEntityList('AssignmentGrade');
  const checkInSource = useEntityList('WeeklyCheckIn'), exemptionSource = useEntityList('CheckInExemption');
  const dismissalSource = useEntityList('CheckInDismissal'), responseSource = useEntityList('ReadingResponse');
  const goalSource = useEntityList('WeeklyGoal'), assessmentSource = useEntityList('StandardsAssessment');
  const sources = [assignmentSource, gradeSource, checkInSource, exemptionSource, dismissalSource, responseSource, goalSource, assessmentSource];
  const [assignments, grades, checkIns, exemptions, dismissals, responses, goals, assessments] = sources.map(source => source.items);
  const today = chicagoToday(), period = NINE_WEEK_PERIODS.find(item => today >= item.start && today <= item.end)?.number || 1;
  const summaryGeneratedAt = student.learning_summary_popup_generated_at;
  const hasNewSummary = summaryGeneratedAt && summaryGeneratedAt > (student.learning_summary_popup_seen_at || '');
  const [open, setOpen] = useState(true);
  if (!open || sources.some(source => source.loading)) return null;
  const year = currentSchoolYearRange();
  const yearAssignments = assignments.filter(item => item.school_year === year.label);
  // Only count work that has actually been assigned (released) to the student's class period, so
  // upcoming or unreleased assignments don't drag down the current grade or show as missing.
  const gradebookAssignments = yearAssignments.filter(item => /^(Weekly Goal|Goal Reflection)/.test(item.title) || isAssignmentReleased(item, student.class_period));
  const exempt = new Set(exemptions.map(item => weekEndingFriday(item.week_ending)));
  const yearCheckIns = checkIns.filter(item => inSchoolYear(item.week_ending, year) && !exempt.has(weekEndingFriday(item.week_ending)));
  const visibleThrough = new Date(`${today}T12:00:00Z`);
  visibleThrough.setUTCDate(visibleThrough.getUTCDate() + 1);
  const weekDates = fridaysBetween(year.start, visibleThrough).filter(date => !exempt.has(date));
  const weeklyRows = buildWeeklyGrades(yearCheckIns, [student]);
  const columns = gradeColumns(gradebookAssignments, weeklyRows, period, weekDates);
  const { cells, earned, possible, percent } = studentSummary(student, columns, weeklyRows, grades);
  const { assessment: projectedAssessment, percent: projectedPercent, improvement, suggestions } = expectedStandardsGrade(student, assessments, period);
  const hasFrozen = frozenStandardsAssignments(yearAssignments).length > 0;
  const submitted = new Set(responses.filter(item => item.student_id === student.id).map(item => item.assignment_id));
  const regularMissing = gradebookAssignments.filter(item => item.assignment_type !== 'project_work' && item.is_active !== false && isInNineWeeks(item.due_date, period) && !/^(Weekly Goal|Goal Reflection|Student Standards)/.test(item.title) && !isAssignmentAbsenceExempt(item.due_date, student) && adjustedAssignmentDueDate(item.due_date, student).slice(0, 10) < today && !grades.some(grade => grade.assignment_id === item.id && grade.student_id === student.id && grade.teacher_note !== 'Missing at the end of the accommodated due date') && !submitted.has(item.id)).map(item => item.title);
  const goalResponses = new Map(goals.filter(item => item.student_id === student.id).map(item => [item.week_start?.slice(0, 10), item]));
  const goalMissing = columns.flatMap((column, index) => {
    if (!column.label.startsWith('Weekly Goal & Reflection —') || !cells[index].awaitingDeadline) return [];
    const response = goalResponses.get(column.eventDate);
    const isReflection = cells[index].reflectionMissing;
    if (isReflection ? response?.reflection_submitted_at : response?.goal_submitted_at) return [];
    return [`${isReflection ? 'Goal reflection' : 'Weekly goal'} — ${column.eventDate}`];
  });
  const checkMissing = columns.flatMap((column, index) => column.type === 'weekly' && cells[index].label === 'Missing' ? [`Weekly check-in — ${column.weekEnding}`] : []);
  const missing = [...new Set([...regularMissing, ...goalMissing, ...checkMissing])];
  const close = () => {
    setOpen(false);
    if (hasNewSummary) updateCurrentUser({ learning_summary_popup_seen_at: summaryGeneratedAt });
  };
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="daily-grade-title"><section className="glass-panel max-h-[85vh] w-full max-w-lg overflow-y-auto p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-neon-cyan">Nine Weeks {period}</p><h2 id="daily-grade-title" className="text-xl font-semibold">Your daily grade update</h2></div><button onClick={close} aria-label="Close daily grade update"><X size={20} /></button></div>{hasFrozen && <div className="mb-5"><FirstNineWeeksGradeBox student={student} assessments={assessments} assignments={yearAssignments} grades={grades} /></div>}
<div className={`my-5 rounded-lg border p-5 text-center ${percent < 70 ? 'border-destructive bg-destructive/15' : 'border-success/50 bg-success/10'}`}><p className="text-sm font-semibold">Current grade</p><p className={`mt-1 text-5xl font-bold ${percent < 70 ? 'text-destructive' : 'text-success'}`}>{percent}%</p><p className="mt-1 text-xs text-muted-foreground">{earned}/{possible} points</p></div>{!hasFrozen && <div className="mb-5 rounded-lg border border-neon-cyan/50 bg-neon-cyan/10 p-4"><p className="text-xs font-bold uppercase tracking-wide text-neon-cyan">Current Learning Summary Grade</p>{projectedAssessment ? <><p className={`mt-1 text-3xl font-bold ${projectedPercent < 70 ? 'text-destructive' : 'text-foreground'}`}>{projectedPercent}%</p><p className="mt-1 text-xs text-muted-foreground">Score as of {new Date(projectedAssessment.last_checked_at || projectedAssessment.generated_at).toLocaleString()}</p>{improvement > 0 && <p className="mt-2 rounded-lg border border-success/40 bg-success/10 p-2 text-sm font-bold text-success">Up {improvement} percentage {improvement === 1 ? 'point' : 'points'} since the previous summary.</p>}{suggestions.length > 0 && <div className="mt-3"><p className="text-sm font-semibold">Suggestions for improvement</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{suggestions.map(item => <li key={item}>{item}</li>)}</ul></div>}</> : <p className="mt-2 text-sm text-muted-foreground">Your learning summary grade will appear after your first standards report is run.</p>}</div>}{missing.length ? <><div className="flex items-center gap-2 text-destructive"><AlertTriangle size={18} /><h3 className="font-semibold">Missing assignments</h3></div><ul className="mt-3 space-y-2">{missing.map(item => <li key={item} className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold">{item}</li>)}</ul></> : <p className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm font-semibold text-success">You have no missing assignments.</p>}<button onClick={close} className="east-button mt-5 w-full">Continue to dashboard</button></section></div>;
}