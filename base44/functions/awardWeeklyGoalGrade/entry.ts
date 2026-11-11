import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { awardWeeklyGoalGrade } from '../../shared/weeklyGoalGrading.ts';
import { isWeeklyGoalClosed } from '../../shared/gradingPeriods.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error: any) => (error.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { weeklyGoalId, phase } = await req.json().catch(() => ({}) as any);
    if (!weeklyGoalId) return Response.json({ error: 'weeklyGoalId is required' }, { status: 400 });
    if (!['goal', 'reflection'].includes(phase)) return Response.json({ error: 'Invalid phase' }, { status: 400 });
    const weeklyGoal = await base44.asServiceRole.entities.WeeklyGoal.get(weeklyGoalId).catch((error: any) => (error.status === 404 ? null : Promise.reject(error)));
    if (!weeklyGoal || weeklyGoal.student_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (isWeeklyGoalClosed(weeklyGoal)) return Response.json({ error: 'This nine-weeks period is closed. Grades and submissions are locked.' }, { status: 403 });
    const result = await awardWeeklyGoalGrade(base44, user, weeklyGoal, phase);
    if (!result.ok) return Response.json({ error: result.message }, { status: result.status });
    return Response.json({ awarded: true, points: result.points });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}