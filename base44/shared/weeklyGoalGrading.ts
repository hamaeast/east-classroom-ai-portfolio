// Weekly goal + reflection grading shared by the submission and grading functions.
// Mirrors the scoring in src/lib/goalMakeups.js and the rules the screens rely on.

import { isAssignmentClosed } from './gradingPeriods.ts';
import { adjustedAssignmentDueDate, chicagoEndOfDay } from './deadlines.ts';

export function lateMakeupPoints(dueAt: string, submittedAt: string, student: any): number {
  const adjustedDue = adjustedAssignmentDueDate(dueAt, student);
  const deadline = adjustedDue && (String(adjustedDue).includes('T') ? adjustedDue : chicagoEndOfDay(String(adjustedDue).slice(0, 10)));
  return deadline && new Date(submittedAt).getTime() > new Date(deadline).getTime() ? 4 : 5;
}

// Awards the combined weekly assignment grade for a student's goal and reflection.
export async function awardWeeklyGoalGrade(base44: any, student: any, weeklyGoal: any, phase: string) {
  const submittedAt = phase === 'goal' ? weeklyGoal.goal_submitted_at : weeklyGoal.reflection_submitted_at;
  if (!submittedAt) return { ok: false, status: 400, message: 'Assignment is not submitted' };
  const service = base44.asServiceRole.entities;
  const expectedTitle = `Weekly Goal & Reflection — ${weeklyGoal.week_start}`;
  let assignmentId = weeklyGoal.goal_assignment_id || weeklyGoal.reflection_assignment_id;
  let assignment = assignmentId ? await service.Assignment.get(assignmentId).catch((error: any) => (error.status === 404 ? null : Promise.reject(error))) : null;
  if (!assignment || assignment.title !== expectedTitle || Number(assignment.max_points) !== 10) {
    const assignments = await service.Assignment.filter({ title: expectedTitle });
    assignment = assignments.find((item: any) => Number(item.max_points) === 10) || null;
    assignmentId = assignment?.id;
  }
  if (!assignmentId) return { ok: false, status: 404, message: 'Weekly assignment was not found' };
  if (isAssignmentClosed(assignment)) return { ok: false, status: 403, message: 'This nine-weeks period is closed. Grades are locked.' };
  if (weeklyGoal.goal_assignment_id !== assignmentId || weeklyGoal.reflection_assignment_id !== assignmentId) {
    await service.WeeklyGoal.update(weeklyGoal.id, { goal_assignment_id: assignmentId, reflection_assignment_id: assignmentId });
  }
  const [matches, relatedGoals] = await Promise.all([
    service.AssignmentGrade.filter({ assignment_id: assignmentId, student_id: student.id }),
    service.WeeklyGoal.filter({ student_id: student.id, week_start: weeklyGoal.week_start })
  ]);
  const manualOverride = matches.find((item: any) => String(item.teacher_note || '').startsWith('Manual full-credit override for week of '));
  if (manualOverride) return { ok: true, points: manualOverride.points };
  const goalSubmissions = relatedGoals.filter((item: any) => item.goal_submitted_at);
  const reflectionSubmissions = relatedGoals.filter((item: any) => item.reflection_submitted_at);
  const goalPoints = goalSubmissions.length ? Math.max(...goalSubmissions.map((item: any) => Math.min(Number(item.goal_grade ?? 5), 5))) : 0;
  const reflectionPoints = reflectionSubmissions.length ? Math.max(...reflectionSubmissions.map((item: any) => Math.min(Number(item.reflection_grade ?? 5), 5))) : 0;
  const points = goalPoints + reflectionPoints;
  const makeupType = weeklyGoal.cart_goal_submitted_at || weeklyGoal.cart_reflection_submitted_at ? 'CART make-up' : 'Late original submission';
  // A late original submission keeps its one-point deduction automatically. Only a
  // CART make-up answer still needs a teacher to read and confirm it.
  const needsReview = makeupType === 'CART make-up' && (goalPoints === 4 || reflectionPoints === 4);
  const reviewResponses: string[] = [];
  if (goalPoints === 4) reviewResponses.push(`Goal: ${weeklyGoal.cart_goal_answer || weeklyGoal.goal_text || 'Submitted'}`);
  if (reflectionPoints === 4) reviewResponses.push(`Reflection: ${weeklyGoal.cart_reflection_answer || weeklyGoal.reflection_notes || 'Submitted'}`);
  const data = {
    assignment_id: assignmentId,
    student_id: student.id,
    points,
    auto_points: points,
    excused: false,
    status: needsReview ? 'pending_review' : 'graded',
    teacher_note: needsReview ? `${makeupType} — ${reviewResponses.join(' | ')}` : ''
  };
  if (matches.length) await service.AssignmentGrade.update(matches[0].id, data);
  else await service.AssignmentGrade.create(data);
  return { ok: true, points };
}