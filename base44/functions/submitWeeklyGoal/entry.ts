import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { isWeeklyGoalClosed } from '../../shared/gradingPeriods.ts';
import { awardWeeklyGoalGrade, lateMakeupPoints } from '../../shared/weeklyGoalGrading.ts';

const GOAL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const text = (value: any) => String(value ?? '').trim();

// Saves a weekly goal or reflection answer and sets the submitted time and grade
// server-side. Students send answers only; the server decides the points.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error: any) => (error.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const payload: any = await req.json().catch(() => ({}));
    const weeklyGoalId = text(payload.weeklyGoalId);
    const kind = text(payload.kind);
    if (!weeklyGoalId) return Response.json({ error: 'weeklyGoalId is required' }, { status: 400 });
    if (!['goal-suggestion', 'goal', 'reflection', 'cart-goal', 'cart-reflection'].includes(kind)) {
      return Response.json({ error: 'Invalid submission type' }, { status: 400 });
    }

    const service = base44.asServiceRole.entities;
    const weeklyGoal: any = await service.WeeklyGoal.get(weeklyGoalId).catch((error: any) => (error.status === 404 ? null : Promise.reject(error)));
    if (!weeklyGoal || weeklyGoal.student_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (isWeeklyGoalClosed(weeklyGoal)) return Response.json({ error: 'This nine-weeks period is closed. Grades and submissions are locked.' }, { status: 403 });

    const submittedAt = new Date().toISOString();
    let data: any = null;
    let phase = '';

    if (kind === 'goal-suggestion') {
      data = { goal_text: text(payload.goalText), ai_suggestion_used: true, ai_suggestion: text(payload.aiSuggestion) };
    } else if (kind === 'goal') {
      const goalText = text(payload.goalText);
      if (goalText.length < 8) return Response.json({ error: 'Write a goal you can finish in one week.' }, { status: 400 });
      phase = 'goal';
      data = { goal_text: goalText, goal_submitted_at: submittedAt, goal_grade: lateMakeupPoints(weeklyGoal.goal_due_at, submittedAt, user) };
    } else if (kind === 'reflection') {
      const answers = payload.answers || {};
      const metGoal = text(answers.met_goal);
      const goalTooHard = text(answers.goal_too_hard);
      const metGoalDay = text(answers.met_goal_day);
      if (!['yes', 'no'].includes(metGoal) || !['yes', 'no'].includes(goalTooHard)) {
        return Response.json({ error: 'Answer whether you met your goal and whether it was set too hard.' }, { status: 400 });
      }
      if (metGoal === 'yes' && !GOAL_DAYS.includes(metGoalDay)) return Response.json({ error: 'Choose the day you met your goal.' }, { status: 400 });
      phase = 'reflection';
      data = {
        met_goal: metGoal,
        met_goal_day: metGoal === 'yes' ? metGoalDay : undefined,
        goal_too_hard: goalTooHard,
        reflection_notes: text(answers.reflection_notes),
        collaboration_contribution: text(answers.collaboration_contribution),
        reflection_submitted_at: submittedAt,
        reflection_grade: lateMakeupPoints(weeklyGoal.reflection_due_at, submittedAt, user)
      };
    } else if (kind === 'cart-goal') {
      const answer = text(payload.answer);
      if (answer.length < 8) return Response.json({ error: 'Explain how CART applies to your project or skill.' }, { status: 400 });
      phase = 'goal';
      data = { cart_goal_answer: answer, cart_goal_submitted_at: submittedAt, goal_submitted_at: submittedAt, goal_grade: 4 };
    } else {
      const answer = text(payload.answer);
      if (answer.length < 8) return Response.json({ error: 'Explain how CART applies to your project or skill.' }, { status: 400 });
      phase = 'reflection';
      data = { cart_reflection_answer: answer, cart_reflection_submitted_at: submittedAt, reflection_submitted_at: submittedAt, reflection_grade: 4 };
    }

    const updated = await service.WeeklyGoal.update(weeklyGoal.id, data);
    if (!phase) return Response.json({ weeklyGoal: updated });

    const result = await awardWeeklyGoalGrade(base44, user, updated, phase);
    if (!result.ok) return Response.json({ error: result.message }, { status: result.status });
    return Response.json({ weeklyGoal: updated, points: result.points });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}