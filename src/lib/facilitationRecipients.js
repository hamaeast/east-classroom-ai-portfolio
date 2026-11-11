const sourceCollections = {
  WeeklyCheckIn: 'checkIns', WeeklyGoal: 'goals', Project: 'projects', ProjectPitch: 'pitches',
  TaskRequest: 'tasks', HelpRequest: 'help', Comment: 'comments', ServiceEntry: 'service'
};

const addMembers = (ids, row) => {
  if (!row) return;
  [row.student_id, row.created_by_id, row.assigned_student_id].filter(Boolean).forEach(id => ids.add(id));
  [...(row.member_ids || []), ...(row.assigned_student_ids || [])].forEach(id => ids.add(id));
};

export function applicableStudents(item, sources) {
  const ids = new Set();
  if (item.student_id) ids.add(item.student_id);
  if (item.subject_type !== 'student') {
    sources.projects.filter(row => row.id === item.project_id || row.project_pitch_id === item.project_id).forEach(row => addMembers(ids, row));
    const pitch = sources.pitches.find(row => row.id === item.project_id);
    (pitch?.member_emails || []).forEach(email => {
      const user = sources.users.find(row => row.email?.toLowerCase() === email.toLowerCase());
      if (user) ids.add(user.id);
    });
    (item.source_refs || []).forEach(ref => {
      const collection = sources[sourceCollections[ref.entity_type]] || [];
      addMembers(ids, collection.find(row => row.id === ref.record_id));
    });
  }
  return sources.users.filter(user => user.role !== 'admin' && ids.has(user.id));
}

export function suggestedInterventionMessage(item, response) {
  const subject = item.project_name || item.team_name || 'your recent work';
  return `I’m following up about ${subject}. Concern reviewed: ${item.concern} Intervention: ${response.trim()} Please let me know if you have questions or need more support.`;
}