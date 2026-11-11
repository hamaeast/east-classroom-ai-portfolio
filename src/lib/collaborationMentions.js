const normalize = value => String(value || '').trim().toLowerCase();
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function aliasesFor(student) {
  const email = normalize(student.email);
  const local = email.split('@')[0];
  const name = normalize(student.full_name || student.display_name);
  return [...new Set([
    email,
    local,
    name,
    ...name.split(/\s+/),
    ...local.split(/[^a-z0-9]+/),
  ].filter(alias => alias.length >= 3))];
}

export function collaboratorsMentioned(goal, roster = [], authorId) {
  const text = normalize(`${goal.collaboration_contribution || ''} ${goal.reflection_notes || ''}`);
  if (!text) return [];
  return roster.filter(student => student.id !== authorId && aliasesFor(student).some(alias => new RegExp(`(^|[^a-z0-9])${escapePattern(alias)}([^a-z0-9]|$)`, 'i').test(text))).map(student => ({ student_id: student.id, name: student.full_name || student.display_name || student.email, email: student.email }));
}