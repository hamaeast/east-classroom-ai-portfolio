const lower = value => (value || '').trim().toLowerCase();
const listed = value => Array.isArray(value) ? value.map(lower) : String(value || '').split(',').map(lower);

export function belongsToStudent(item, student) {
  const id = student?.id, email = lower(student?.email), name = lower(student?.full_name);
  const idMatch = Boolean(id && (item.created_by_id === id || item.student_id === id || item.member_ids?.includes(id) || item.recipient_id === id));
  const emailMatch = Boolean(email && (listed(item.member_emails).includes(email) || listed(item.tagged_emails).includes(email) || lower(item.student_email) === email || listed(item.student_emails).includes(email)));
  const nameMatch = Boolean(name && (lower(item.student_name) === name || lower(item.student_names).includes(name)));
  return idMatch || emailMatch || nameMatch;
}

export function buildStudentRecommendationContext(student, { goals = [], pitches = [], checkIns = [] }) {
  const mine = items => items.filter(item => belongsToStudent(item, student)).slice().sort((a, b) => String(b.week_start || b.week_ending || b.updated_date || '').localeCompare(String(a.week_start || a.week_ending || a.updated_date || ''))).slice(0, 6);
  const goalText = mine(goals).map(item => `- Goal ${item.week_start}: ${item.goal_text || 'not submitted'}; reflection: ${item.reflection_notes || 'none'}`).join('\n');
  const pitchText = mine(pitches).map(item => `- Project ${item.project_title}: problem ${item.problem || 'not stated'}; solution ${item.solution || 'not stated'}; technology ${item.technology_use || 'not stated'}`).join('\n');
  const checkInText = mine(checkIns).map(item => `- Check-in ${item.week_ending} for ${item.project_title}: accomplished ${item.accomplishment || 'not stated'}; next ${item.next_step || 'not stated'}; challenge ${item.blocker || 'none'}; help ${item.help_needed || 'none'}`).join('\n');
  return `Use only this student-authored or team-tagged dashboard history when making a specific suggestion. Do not claim the student personally completed a teammate's work.\nGoals:\n${goalText || 'None'}\nProjects:\n${pitchText || 'None'}\nCheck-ins:\n${checkInText || 'None'}`;
}