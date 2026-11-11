import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isFullSchoolWeekClosed } from '../../shared/schoolDeadline.ts';
import { isNineWeeksClosed } from '../../shared/gradingPeriods.ts';
import { chicagoEndOfDay, chicagoToday } from '../../shared/deadlines.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { weekStart, goalDueDate, reflectionDueDate: requestedReflectionDueDate, schoolYear } = await req.json();
    const reflectionDueDate = weekStart === '2026-10-05' ? '2026-10-19' : requestedReflectionDueDate;
    const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
    if (!validDate(weekStart) || !validDate(goalDueDate) || !validDate(reflectionDueDate) || !/^\d{4}[–-]\d{2}$/.test(schoolYear || '')) return Response.json({ error: 'Invalid assignment schedule' }, { status: 400 });
    if (isNineWeeksClosed(reflectionDueDate)) return Response.json({ error: 'This nine-weeks period is closed. Assignments and grades are locked.' }, { status: 403 });
    if (isFullSchoolWeekClosed(weekStart)) return Response.json({ active: false, skipped: true, reason: 'School is closed for the entire week' });
    const requested = new Date(`${weekStart}T12:00:00Z`);
    if (Math.abs(requested.getTime() - Date.now()) > 8 * 24 * 60 * 60 * 1000) return Response.json({ error: 'Only the current goal week can be prepared' }, { status: 403 });

    const title = `Weekly Goal & Reflection — ${weekStart}`;
    const legacyTitles = [`Weekly Goal — ${weekStart}`, `Goal Reflection — ${weekStart}`];
    const [combinedMatches, ...legacyMatches] = await Promise.all([
      base44.asServiceRole.entities.Assignment.filter({ title, school_year: schoolYear }),
      ...legacyTitles.map(legacyTitle => base44.asServiceRole.entities.Assignment.filter({ title: legacyTitle, school_year: schoolYear }))
    ]);
    const legacy = legacyMatches.flat();
    const isActive = !legacy.some(item => item.is_active === false);
    const gradingPeriod = reflectionDueDate <= '2026-09-30' ? 1 : reflectionDueDate <= '2027-01-08' ? 2 : reflectionDueDate <= '2027-03-18' ? 3 : 4;
    const assignmentData = { title, description: weekStart === '2026-10-05' ? 'Set one weekly goal and complete the reflection by October 19. Assignment time is paused during October 9–18.' : 'Set one weekly goal and complete the Friday reflection.', max_points: 10, due_date: reflectionDueDate, is_active: isActive, school_year: schoolYear, grading_period: gradingPeriod };
    const service = base44.asServiceRole.entities;
    const createdOrUpdated = combinedMatches.length
      ? await service.Assignment.update(combinedMatches[0].id, assignmentData)
      : await service.Assignment.create(assignmentData);
    const allCombined = await service.Assignment.filter({ title, school_year: schoolYear });
    const orderedCombined = allCombined.sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || '')) || a.id.localeCompare(b.id));
    const combined = orderedCombined[0] || createdOrUpdated;
    const duplicateCombined = orderedCombined.slice(1);
    if (duplicateCombined.length) {
      const canonicalGrades = await service.AssignmentGrade.filter({ assignment_id: combined.id });
      const canonicalByStudent = new Map(canonicalGrades.map(grade => [grade.student_id, grade]));
      for (const duplicate of duplicateCombined) {
        const duplicateGrades = await service.AssignmentGrade.filter({ assignment_id: duplicate.id });
        for (const grade of duplicateGrades) {
          const existing = canonicalByStudent.get(grade.student_id);
          if (existing) await service.AssignmentGrade.update(existing.id, { points: Math.max(Number(existing.points || 0), Number(grade.points || 0)), status: existing.status || grade.status || 'graded' });
          else {
            const migrated = await service.AssignmentGrade.create({ assignment_id: combined.id, student_id: grade.student_id, points: grade.points, status: grade.status || 'graded' });
            canonicalByStudent.set(grade.student_id, migrated);
          }
        }
        await service.AssignmentGrade.deleteMany({ assignment_id: duplicate.id });
        await service.Assignment.delete(duplicate.id);
      }
    }

    if (legacy.length) {
      const legacyGradeLists = await Promise.all(legacy.map(item => base44.asServiceRole.entities.AssignmentGrade.filter({ assignment_id: item.id })));
      const combinedGrades = await base44.asServiceRole.entities.AssignmentGrade.filter({ assignment_id: combined.id });
      const existingByStudent = new Map(combinedGrades.map(grade => [grade.student_id, grade]));
      const legacyPoints = new Map();
      legacyGradeLists.flat().forEach(grade => legacyPoints.set(grade.student_id, Math.min(10, (legacyPoints.get(grade.student_id) || 0) + Number(grade.points || 0))));
      for (const [studentId, points] of legacyPoints) {
        const existing = existingByStudent.get(studentId);
        const data = { assignment_id: combined.id, student_id: studentId, points: Math.max(points, Number(existing?.points || 0)), status: existing?.status || 'graded' };
        if (existing) await base44.asServiceRole.entities.AssignmentGrade.update(existing.id, data);
        else await base44.asServiceRole.entities.AssignmentGrade.create(data);
      }
      for (const item of legacy) {
        await base44.asServiceRole.entities.AssignmentGrade.deleteMany({ assignment_id: item.id });
        await base44.asServiceRole.entities.Assignment.delete(item.id);
      }
    }

    const weeklyGoals = await base44.asServiceRole.entities.WeeklyGoal.filter({ week_start: weekStart });
    if (weeklyGoals.length) await base44.asServiceRole.entities.WeeklyGoal.bulkUpdate(weeklyGoals.map(item => ({ id: item.id, goal_assignment_id: combined.id, reflection_assignment_id: combined.id, ...(weekStart === '2026-10-05' ? { reflection_due_at: '2026-10-19T23:59:59-05:00' } : {}) })));
    // A student opening their goal page for the week gets their own record created here,
    // with the due dates the screen used to set in the browser.
    if (user.role !== 'admin' && !weeklyGoals.some(item => item.student_id === user.id)) {
      await base44.asServiceRole.entities.WeeklyGoal.create({
        student_id: user.id,
        week_start: weekStart,
        goal_due_at: chicagoEndOfDay(chicagoToday()),
        reflection_due_at: chicagoEndOfDay(reflectionDueDate),
        goal_assignment_id: combined.id,
        reflection_assignment_id: combined.id
      });
    }
    return Response.json({ goalAssignmentId: combined.id, reflectionAssignmentId: combined.id, active: combined.is_active !== false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}