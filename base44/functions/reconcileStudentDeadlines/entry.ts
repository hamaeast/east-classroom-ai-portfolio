import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { extendedDueDate, joinedAfterAssignmentDeadline } from '../../shared/schoolDeadline.ts';
import { isAssignmentClosed } from '../../shared/gradingPeriods.ts';

function chicagoDateTime(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(value).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function isAfterDeadline(date, time, dueDate, dueTime) {
  return Boolean(dueDate) && (date > dueDate || (date === dueDate && time > dueTime));
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { studentId } = await req.json();
    if (!studentId) return Response.json({ error: 'Student is required' }, { status: 400 });
    const student = await base44.asServiceRole.entities.User.get(studentId);
    if (!student || student.role === 'admin') return Response.json({ error: 'Student not found' }, { status: 404 });
    const [assignments, responses, grades, reminders] = await Promise.all([
      base44.asServiceRole.entities.Assignment.filter({ assignment_type: 'reading' }),
      base44.asServiceRole.entities.ReadingResponse.filter({ student_id: studentId }),
      base44.asServiceRole.entities.AssignmentGrade.filter({ student_id: studentId }),
      base44.asServiceRole.entities.AssignmentReminder.filter({ student_id: studentId })
    ]);
    const responseByAssignment = new Map(responses.map(item => [item.assignment_id, item]));
    const gradeByAssignment = new Map(grades.map(item => [item.assignment_id, item]));
    const reminderByAssignment = new Map(reminders.filter(item => item.message_type === 'missing').map(item => [item.assignment_id, item]));
    const responseUpdates = [], gradeUpdates = [], reminderUpdates = [], gradesToCreate = [], remindersToCreate = [], deleteIds = [];
    const now = chicagoDateTime();
    for (const assignment of assignments) {
      if (!assignment.due_date || isAssignmentClosed(assignment)) continue;
      const dueDate = extendedDueDate(assignment.due_date, student);
      const dueTime = assignment.due_time || '23:59';
      const response = responseByAssignment.get(assignment.id);
      const grade = gradeByAssignment.get(assignment.id);
      const reminder = reminderByAssignment.get(assignment.id);
      const joinedAfterDeadline = joinedAfterAssignmentDeadline(student, assignment);
      if (response) {
        const submitted = chicagoDateTime(new Date(response.submitted_at));
        const isLate = !joinedAfterDeadline && isAfterDeadline(submitted.date, submitted.time, dueDate, dueTime);
        if (response.is_late !== isLate || response.status !== (isLate ? 'pending_review' : 'graded')) responseUpdates.push({ id: response.id, is_late: isLate, status: isLate ? 'pending_review' : 'graded' });
        if (grade && !grade.excused && (grade.is_late !== isLate || grade.status !== (isLate ? 'pending_review' : 'graded'))) gradeUpdates.push({ id: grade.id, is_late: isLate, status: isLate ? 'pending_review' : 'graded' });
        if (!isLate && reminder) deleteIds.push({ entity: 'AssignmentReminder', id: reminder.id });
        continue;
      }
      const isMissing = !joinedAfterDeadline && assignment.is_active && isAfterDeadline(now.date, now.time, dueDate, dueTime);
      const automatedGrade = grade?.teacher_note === 'Missing at the end of the accommodated due date';
      if (!isMissing) {
        if (automatedGrade) deleteIds.push({ entity: 'AssignmentGrade', id: grade.id });
        if (reminder) deleteIds.push({ entity: 'AssignmentReminder', id: reminder.id });
      } else {
        if (!grade) gradesToCreate.push({ assignment_id: assignment.id, student_id: studentId, points: 0, status: 'graded', teacher_note: 'Missing at the end of the accommodated due date' });
        const reminderData = { due_date: dueDate, due_time: dueTime, read: false };
        if (reminder) reminderUpdates.push({ id: reminder.id, ...reminderData });
        else remindersToCreate.push({ assignment_id: assignment.id, student_id: studentId, student_name: student.display_name || student.full_name || student.email, assignment_title: assignment.title, ...reminderData, message: `Reading assignment “${assignment.title}” is late. Submit it from Assignments; your late submission will be sent to your teacher for manual review. A zero remains recorded until it is reviewed.`, message_type: 'missing', zero_recorded_at: new Date().toISOString() });
      }
    }
    await Promise.all([
      responseUpdates.length ? base44.asServiceRole.entities.ReadingResponse.bulkUpdate(responseUpdates) : null,
      gradeUpdates.length ? base44.asServiceRole.entities.AssignmentGrade.bulkUpdate(gradeUpdates) : null,
      reminderUpdates.length ? base44.asServiceRole.entities.AssignmentReminder.bulkUpdate(reminderUpdates) : null,
      gradesToCreate.length ? base44.asServiceRole.entities.AssignmentGrade.bulkCreate(gradesToCreate) : null,
      remindersToCreate.length ? base44.asServiceRole.entities.AssignmentReminder.bulkCreate(remindersToCreate) : null,
      ...deleteIds.map(item => base44.asServiceRole.entities[item.entity].delete(item.id))
    ]);
    return Response.json({ corrected: responseUpdates.length + gradeUpdates.length + reminderUpdates.length + gradesToCreate.length + remindersToCreate.length + deleteIds.length });
  } catch (error) {
    return Response.json({ error: error.message || 'Deadlines could not be reconciled.' }, { status: 500 });
  }
}