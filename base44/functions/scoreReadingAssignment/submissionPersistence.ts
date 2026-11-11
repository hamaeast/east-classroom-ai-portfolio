export async function saveSubmissionGrade(base44, response, onlyIfMissing = false) {
  const { items } = await base44.asServiceRole.entities.AssignmentGrade.filter({ assignment_id: response.assignment_id, student_id: response.student_id }, { limit: 1 });
  const existing = items[0];
  if (existing && (onlyIfMissing || existing.excused || (existing.teacher_note && !['Missing at the end of the accommodated due date'].includes(existing.teacher_note)))) return existing;
  const data = { assignment_id: response.assignment_id, student_id: response.student_id, points: response.score, auto_points: response.score, is_late: response.is_late, excused: false, status: response.status, teacher_note: '' };
  return existing ? await base44.asServiceRole.entities.AssignmentGrade.update(existing.id, data) : await base44.asServiceRole.entities.AssignmentGrade.create(data);
}

export async function clearMissingNotices(base44, response) {
  await base44.asServiceRole.entities.AssignmentReminder.deleteMany({ assignment_id: response.assignment_id, student_id: response.student_id, message_type: 'missing' });
}