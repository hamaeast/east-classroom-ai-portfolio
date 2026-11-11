const values = text => (text || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);

export function isPitchStudent(pitch, user) {
  if (!pitch || !user) return false;
  if (pitch.created_by_id === user.id) return true;
  const emails = new Set([...values(pitch.tagged_emails), ...(pitch.member_emails || []).map(value => value.trim().toLowerCase())]);
  const names = new Set(values(pitch.student_names));
  return emails.has((user.email || '').trim().toLowerCase()) || names.has((user.full_name || '').trim().toLowerCase());
}

export function pitchStudentIds(pitch, users) {
  return [...new Set(users.filter(user => user.role !== 'admin' && isPitchStudent(pitch, user)).map(user => user.id))];
}