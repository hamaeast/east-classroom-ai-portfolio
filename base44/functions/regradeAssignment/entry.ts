import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { gradeAssignmentAnswers } from '../../shared/assignmentScoring.ts';
import { isAssignmentClosed, chicagoToday } from '../../shared/gradingPeriods.ts';
import { extendedDueDate, joinedAfterAssignmentDeadline } from '../../shared/schoolDeadline.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });
    const { assignmentId, cursor, dryRun = false } = await req.json();
    if (typeof assignmentId !== 'string' || !assignmentId) return Response.json({ error: 'Choose an assignment.' }, { status: 400 });
    const assignment = await base44.asServiceRole.entities.Assignment.get(assignmentId);
    if (!assignment || isAssignmentClosed(assignment)) return Response.json({ error: 'Closed or frozen assignments cannot be regraded.' }, { status: 403 });
    if (assignment.assignment_type === 'project_work' || /^(Weekly Goal|Goal Reflection|Student Standards)/.test(assignment.title)) return Response.json({ error: 'This assignment uses its own automatic grading system.' }, { status: 400 });
    const page = await base44.asServiceRole.entities.ReadingResponse.filter({ assignment_id: assignmentId }, { limit: 5, sort: 'created_date', cursor });
    if (dryRun) return Response.json({ processed: 0, submissionsInPage: page.items.length, questions: (assignment.questions || []).length, maxPoints: assignment.max_points, has_more: page.has_more, next_cursor: page.next_cursor, workPreserved: true });
    await Promise.all(page.items.map(async response => {
      const [result, student, gradePage] = await Promise.all([
        gradeAssignmentAnswers(base44, assignment, response.answers),
        base44.asServiceRole.entities.User.get(response.student_id),
        base44.asServiceRole.entities.AssignmentGrade.filter({ assignment_id: assignmentId, student_id: response.student_id }, { limit: 50 })
      ]);
      const submitted = new Date(response.submitted_at || response.created_date);
      const localTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(submitted);
      const due = extendedDueDate(assignment.due_date, student);
      const day = chicagoToday(submitted);
      const isLate = !joinedAfterAssignmentDeadline(student, assignment) && Boolean(due) && (day > due || (day === due && localTime > (assignment.due_time || '23:59')));
      const status = isLate || result.gradingPending ? 'pending_review' : 'graded';
      await base44.asServiceRole.entities.ReadingResponse.update(response.id, { score: result.score, grading_details: result.details, status, is_late: isLate });
      const grade = { assignment_id: assignmentId, student_id: response.student_id, points: result.score, auto_points: result.score, status, is_late: isLate, teacher_note: 'Regraded after assignment edit' };
      if (gradePage.items.length) {
        await Promise.all(gradePage.items.filter(item => !item.excused).map(item => base44.asServiceRole.entities.AssignmentGrade.update(item.id, grade)));
      } else await base44.asServiceRole.entities.AssignmentGrade.create({ ...grade, excused: false });
    }));
    return Response.json({ processed: page.items.length, has_more: page.has_more, next_cursor: page.next_cursor, workPreserved: true });
  } catch (error) { return Response.json({ error: error.message || 'Regrading could not finish. Student answers are still saved.' }, { status: 500 }); }
}