import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { buildCurrentAssessment, standardsNineWeeksPoints } from '../../shared/standardsGrade.ts';
import { NINE_WEEK_PERIODS, isNineWeeksClosed } from '../../shared/gradingPeriods.ts';

const standardsTitle = (segment: number) => `Student Standards — Nine Weeks ${segment}`;

function currentSchoolYearLabel(date = new Date()): string {
  const year = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return `${year}–${String(year + 1).slice(-2)}`;
}

// Re-locks a student's closed-period unlock for a segment, recomputes the 20-point
// standards grade for every active student, and freezes the segment's standards
// assignment so that nine weeks becomes immutable. Admin-only; reuses the same
// computation the on-screen StandardsGradeReport uses to freeze.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const student_id = String(body?.student_id || '');
    const segment = Number(body?.segment);
    if (!student_id || ![1, 2, 3, 4].includes(segment)) return Response.json({ error: 'student_id and segment (1-4) are required' }, { status: 400 });
    if (isNineWeeksClosed(NINE_WEEK_PERIODS.find(item => item.number === segment)?.end)) return Response.json({ error: 'This nine-weeks period is closed. Existing grades cannot be recomputed.' }, { status: 403 });
    const service = base44.asServiceRole.entities;

    // Re-lock the student's closed-period unlock for this segment.
    const unlocks = await service.NineWeeksUnlock.filter({ student_id, nine_weeks: segment });
    if (unlocks.length) await service.NineWeeksUnlock.deleteMany({ student_id, nine_weeks: segment });

    // Ensure the 20-point standards assignment exists for the segment.
    const schoolYear = currentSchoolYearLabel();
    const title = standardsTitle(segment);
    let assignment = (await service.Assignment.filter({ title, school_year: schoolYear }))[0];
    if (!assignment) assignment = await service.Assignment.create({ title, description: `Grade from the strongest standards across Nine Weeks ${segment}.`, max_points: 20, is_active: true, school_year: schoolYear, grading_period: segment });
    else if (Number(assignment.max_points) !== 20) assignment = await service.Assignment.update(assignment.id, { max_points: 20, grading_period: segment, is_active: true });

    // Recompute and write the standards grade for every active student.
    const [students, assessments, grades] = await Promise.all([
      service.User.filter({ role: 'user' }),
      service.StandardsAssessment.filter({}),
      service.AssignmentGrade.filter({ assignment_id: assignment.id })
    ]);
    const gradeByStudent = new Map(grades.map(item => [item.student_id, item]));
    const updates: any[] = [], creates: any[] = [];
    let withoutAssessment = 0;
    for (const student of students) {
      if (student.is_archived) continue;
      const assessment = buildCurrentAssessment(assessments.filter(item => item.student_id === student.id));
      const points = standardsNineWeeksPoints(assessment, Number(student.grade) || 0, segment);
      const existing = gradeByStudent.get(student.id);
      if (existing) updates.push({ id: existing.id, points, status: 'graded' });
      else creates.push({ assignment_id: assignment.id, student_id: student.id, points, status: 'graded' });
      if (!assessment) withoutAssessment += 1;
    }
    for (let index = 0; index < updates.length; index += 500) await service.AssignmentGrade.bulkUpdate(updates.slice(index, index + 500));
    for (let index = 0; index < creates.length; index += 500) await service.AssignmentGrade.bulkCreate(creates.slice(index, index + 500));

    // Freeze the segment snapshot so it becomes immutable.
    const frozenAt = new Date().toISOString();
    await service.Assignment.update(assignment.id, { frozen_at: frozenAt });
    return Response.json({ ok: true, segment, student_id, frozen_at: frozenAt, grades_written: updates.length + creates.length, without_assessment: withoutAssessment });
  } catch (error) {
    return Response.json({ error: error.message || 'Freeze failed.' }, { status: 500 });
  }
}