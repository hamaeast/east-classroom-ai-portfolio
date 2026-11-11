import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { extendedDueDate, isAssignmentAbsenceExempt, isFullSchoolWeekClosed } from '../../shared/schoolDeadline.ts';
import { isAssignmentClosed } from '../../shared/gradingPeriods.ts';

function chicagoDate(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function previousDate(dateText) {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { dryRun = false, dueDate } = await req.json().catch(() => ({}));
    const targetDate = dueDate || previousDate(chicagoDate());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return Response.json({ error: 'Invalid due date' }, { status: 400 });
    const [assignments, students] = await Promise.all([
      base44.asServiceRole.entities.Assignment.filter({ is_active: true }),
      base44.asServiceRole.entities.User.filter({ role: 'user' })
    ]);
    const reflections = assignments.filter(item => item.title?.startsWith('Weekly Goal & Reflection —') && item.due_date <= targetDate && !isFullSchoolWeekClosed(item.title.split(' — ')[1]));
    const activeStudents = students.filter(item => !item.is_archived);
    const creates = [];
    const updates = [];
    for (const assignment of reflections) {
      if (isAssignmentClosed(assignment)) continue;
      const weekStart = assignment.title.split(' — ')[1];
      const [grades, goals] = await Promise.all([
        base44.asServiceRole.entities.AssignmentGrade.filter({ assignment_id: assignment.id }),
        base44.asServiceRole.entities.WeeklyGoal.filter({ week_start: weekStart })
      ]);
      for (const student of activeStudents) {
        if ((student.created_date && student.created_date.slice(0, 10) > weekStart) || isAssignmentAbsenceExempt(assignment.due_date, student) || extendedDueDate(assignment.due_date, student) > targetDate) continue;
        const studentGoals = goals.filter(item => item.student_id === student.id);
        if (studentGoals.some(goal => goal.reflection_submitted_at)) continue;
        const existing = grades.find(item => item.student_id === student.id);
        if (existing?.teacher_note?.startsWith('Manual full-credit override for week of ')) continue;
        const submittedGoals = studentGoals.filter(goal => goal.goal_submitted_at);
        const goalPoints = submittedGoals.length ? Math.max(...submittedGoals.map(goal => Math.min(5, Number(goal.goal_grade ?? 5)))) : 0;
        const data = { assignment_id: assignment.id, student_id: student.id, points: goalPoints, status: 'graded', teacher_note: 'Goal reflection not submitted by the accommodated deadline' };
        if (existing && existing.teacher_note !== data.teacher_note) updates.push({ id: existing.id, ...data });
        else if (!existing) creates.push(data);
      }
    }
    if (!dryRun && creates.length) await base44.asServiceRole.entities.AssignmentGrade.bulkCreate(creates);
    if (!dryRun && updates.length) await base44.asServiceRole.entities.AssignmentGrade.bulkUpdate(updates);
    return Response.json({ dryRun, dueDate: targetDate, assignmentsChecked: reflections.length, created: creates.length, updated: updates.length });
  } catch (error) {
    return Response.json({ error: error.message || 'Missing goal reflections could not be processed.' }, { status: 500 });
  }
}