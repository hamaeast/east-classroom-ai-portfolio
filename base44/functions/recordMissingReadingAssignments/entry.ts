import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { extendedDueDate, isAssignmentAbsenceExempt, joinedAfterAssignmentDeadline } from '../../shared/schoolDeadline.ts';
import { isAssignmentClosed } from '../../shared/gradingPeriods.ts';

function chicagoDate() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { dryRun = false } = await req.json().catch(() => ({}));
    const today = chicagoDate();
    const now = new Date().toISOString();
    const assignments = (await base44.asServiceRole.entities.Assignment.filter({ assignment_type: 'reading' }))
      .filter(item => item.is_active && item.due_date && item.due_date < today && (!item.publish_at || item.publish_at <= now));
    const students = (await base44.asServiceRole.entities.User.filter({ role: 'user' })).filter(item => !item.is_archived);
    const gradesToCreate = [];
    const remindersToCreate = [];

    for (const assignment of assignments) {
      if (isAssignmentClosed(assignment)) continue;
      const [responses, grades, reminders] = await Promise.all([
        base44.asServiceRole.entities.ReadingResponse.filter({ assignment_id: assignment.id }),
        base44.asServiceRole.entities.AssignmentGrade.filter({ assignment_id: assignment.id }),
        base44.asServiceRole.entities.AssignmentReminder.filter({ assignment_id: assignment.id })
      ]);
      const submitted = new Set(responses.map(item => item.student_id));
      const graded = new Set(grades.map(item => item.student_id));
      const reminded = new Set(reminders.map(item => item.student_id));
      for (const student of students) {
        const dueDate = extendedDueDate(assignment.due_date, student);
        if (joinedAfterAssignmentDeadline(student, assignment) || isAssignmentAbsenceExempt(assignment.due_date, student) || submitted.has(student.id) || dueDate >= today) continue;
        if (!graded.has(student.id)) gradesToCreate.push({ assignment_id: assignment.id, student_id: student.id, points: 0, status: 'graded', teacher_note: 'Missing at the end of the accommodated due date' });
        if (!reminded.has(student.id)) remindersToCreate.push({ assignment_id: assignment.id, student_id: student.id, student_name: student.display_name || student.full_name || student.email, assignment_title: assignment.title, due_date: dueDate, due_time: assignment.due_time || '23:59', message: `Reading assignment “${assignment.title}” is late. Submit it from Assignments; your late submission will be sent to your teacher for manual review. A zero remains recorded until it is reviewed.`, message_type: 'missing', read: false, zero_recorded_at: now });
      }
    }
    if (!dryRun) {
      if (gradesToCreate.length) await base44.asServiceRole.entities.AssignmentGrade.bulkCreate(gradesToCreate);
      if (remindersToCreate.length) await base44.asServiceRole.entities.AssignmentReminder.bulkCreate(remindersToCreate);
    }
    return Response.json({ dryRun, date: today, assignmentsChecked: assignments.length, zeros: gradesToCreate.length, reminders: remindersToCreate.length });
  } catch (error) {
    return Response.json({ error: error.message || 'Missing reading assignments could not be processed.' }, { status: 500 });
  }
}