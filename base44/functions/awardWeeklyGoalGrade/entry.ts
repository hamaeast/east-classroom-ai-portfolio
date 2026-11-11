import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isWeeklyGoalClosed, isAssignmentClosed } from '../../shared/gradingPeriods.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { weeklyGoalId, phase } = await req.json();
    if (!['goal', 'reflection'].includes(phase)) return Response.json({ error: 'Invalid phase' }, { status: 400 });
    const weeklyGoal = await base44.entities.WeeklyGoal.get(weeklyGoalId);
    if (!weeklyGoal || weeklyGoal.student_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (isWeeklyGoalClosed(weeklyGoal)) return Response.json({ error: 'This nine-weeks period is closed. Grades and submissions are locked.' }, { status: 403 });
    const submittedAt = phase === 'goal' ? weeklyGoal.goal_submitted_at : weeklyGoal.reflection_submitted_at;
    if (!submittedAt) return Response.json({ error: 'Assignment is not submitted' }, { status: 400 });
    const expectedTitle = `Weekly Goal & Reflection — ${weeklyGoal.week_start}`;
    let assignmentId = weeklyGoal.goal_assignment_id || weeklyGoal.reflection_assignment_id;
    let assignment = assignmentId ? await base44.asServiceRole.entities.Assignment.get(assignmentId) : null;
    if (!assignment || assignment.title !== expectedTitle || Number(assignment.max_points) !== 10) {
      const assignments = await base44.asServiceRole.entities.Assignment.filter({ title: expectedTitle });
      assignment = assignments.find(item => Number(item.max_points) === 10);
      assignmentId = assignment?.id;
    }
    if (!assignmentId) return Response.json({ error: 'Weekly assignment was not found' }, { status: 404 });
    if (isAssignmentClosed(assignment)) return Response.json({ error: 'This nine-weeks period is closed. Grades are locked.' }, { status: 403 });
    if (weeklyGoal.goal_assignment_id !== assignmentId || weeklyGoal.reflection_assignment_id !== assignmentId) await base44.entities.WeeklyGoal.update(weeklyGoal.id, { goal_assignment_id: assignmentId, reflection_assignment_id: assignmentId });
    const [matches, relatedGoals] = await Promise.all([
      base44.asServiceRole.entities.AssignmentGrade.filter({ assignment_id: assignmentId, student_id: user.id }),
      base44.asServiceRole.entities.WeeklyGoal.filter({ student_id: user.id, week_start: weeklyGoal.week_start })
    ]);
    const manualOverride = matches.find(item => item.teacher_note?.startsWith('Manual full-credit override for week of '));
    if (manualOverride) return Response.json({ awarded: true, points: manualOverride.points });
    const goalSubmissions = relatedGoals.filter(item => item.goal_submitted_at);
    const reflectionSubmissions = relatedGoals.filter(item => item.reflection_submitted_at);
    const goalPoints = goalSubmissions.length ? Math.max(...goalSubmissions.map(item => Math.min(Number(item.goal_grade ?? 5), 5))) : 0;
    const reflectionPoints = reflectionSubmissions.length ? Math.max(...reflectionSubmissions.map(item => Math.min(Number(item.reflection_grade ?? 5), 5))) : 0;
    const points = goalPoints + reflectionPoints;
    const needsReview = goalPoints === 4 || reflectionPoints === 4;
    const reviewResponses = [];
    if (goalPoints === 4) reviewResponses.push(`Goal: ${weeklyGoal.cart_goal_answer || weeklyGoal.goal_text || 'Submitted'}`);
    if (reflectionPoints === 4) reviewResponses.push(`Reflection: ${weeklyGoal.cart_reflection_answer || weeklyGoal.reflection_notes || 'Submitted'}`);
    const makeupType = weeklyGoal.cart_goal_submitted_at || weeklyGoal.cart_reflection_submitted_at ? 'CART make-up' : 'Late original submission';
    const data = { assignment_id: assignmentId, student_id: user.id, points, auto_points: points, excused: false, status: needsReview ? 'pending_review' : 'graded', teacher_note: needsReview ? `${makeupType} — ${reviewResponses.join(' | ')}` : '' };
    if (matches.length) await base44.asServiceRole.entities.AssignmentGrade.update(matches[0].id, data);
    else await base44.asServiceRole.entities.AssignmentGrade.create(data);
    return Response.json({ awarded: true, points });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}