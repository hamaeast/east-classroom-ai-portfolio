import { base44 } from '@/api/base44Client';

const clip = value => String(value || '').slice(0, 1000);
const dated = (item, fallback) => item.submitted_at || item.original_submitted_at || item.generated_at || item.reflection_submitted_at || item.goal_submitted_at || item.created_date || item.updated_date || fallback;
const within = (date, from, to) => date && date.slice(0, 10) >= from && date.slice(0, 10) <= to;

function teacherActions(data, from, to) {
  const checkIns = new Map(data.checkIns.map(item => [item.id, item]));
  const pitches = new Map(data.pitches.map(item => [item.id, item]));
  const actions = [];
  data.facilitationRecords.forEach(item => actions.push({
    id: item.id, source: 'Facilitation Record', date: item.date_addressed, student_id: item.student_id, project_id: item.project_id,
    starting_source_ids: (item.source_refs || []).map(ref => ref.record_id).filter(Boolean),
    description: clip(`Documented struggle or need: ${item.concern}\nFacilitator intervention: ${item.facilitator_response}\nActions taken: ${(item.facilitator_actions || []).join('; ')}`)
  }));
  data.comments.filter(item => item.author_role === 'admin').forEach(item => {
    const parent = item.parent_type === 'check_in' ? checkIns.get(item.parent_id) : pitches.get(item.parent_id);
    if (!parent) return;
    actions.push({ id: item.id, source: 'Teacher Feedback', date: item.created_date, student_id: parent.created_by_id, project_id: parent.project_pitch_id || (item.parent_type === 'pitch' ? item.parent_id : ''), starting_source_ids: [parent.id], description: clip(item.message) });
  });
  data.checkIns.filter(item => item.teacher_feedback).forEach(item => actions.push({ id: item.id, source: 'Check-In Feedback', date: item.updated_date, student_id: item.created_by_id, project_id: item.project_pitch_id, starting_source_ids: [item.id], description: clip(item.teacher_feedback) }));
  data.assignmentGrades.filter(item => item.teacher_note).forEach(item => actions.push({ id: item.id, source: 'Assignment Feedback', date: item.updated_date || item.created_date, student_id: item.student_id, starting_assignment_id: item.assignment_id, description: clip(item.teacher_note) }));
  return actions.filter(item => item.description && within(item.date, from, to));
}

function studentEvidence(data, from, to) {
  const rows = [], studentByName = new Map(data.users.map(user => [(user.full_name || '').trim().toLowerCase(), user.id]));
  data.pitches.forEach(item => rows.push({ id: item.id, source: 'Project Pitch', date: dated(item), student_id: item.created_by_id, project_id: item.id, evidence: clip(`Problem: ${item.problem}\nProposed solution: ${item.solution}\nTechnology plan: ${item.technology_use}\nEthical considerations: ${item.ethics_statement || item.ethical_concerns || ''}`) }));
  data.checkIns.forEach(item => rows.push({ id: item.id, source: 'Weekly Check-In', date: dated(item), student_id: item.created_by_id, project_id: item.project_pitch_id, evidence: clip(`Accomplished: ${item.accomplishment}\nNext steps: ${item.next_step}\nChallenge: ${item.blocker}\nHelp needed: ${item.help_needed}\nEvidence review: ${JSON.stringify(item.evidence_analysis || [])}`) }));
  data.goals.forEach(item => { if (item.goal_submitted_at) rows.push({ id: `${item.id}:goal`, source: 'Weekly Goal', date: item.goal_submitted_at, student_id: item.student_id, evidence: clip(`Goal: ${item.goal_text}`) }); if (item.reflection_submitted_at) rows.push({ id: `${item.id}:reflection`, source: 'Goal Reflection', date: item.reflection_submitted_at, student_id: item.student_id, evidence: clip(`Met goal: ${item.met_goal}\nReflection: ${item.reflection_notes}\nTeam contribution: ${item.collaboration_contribution}`) }); });
  data.readingResponses.forEach(item => rows.push({ id: item.id, source: 'Reading Response', date: dated(item), student_id: item.student_id, assignment_id: item.assignment_id, evidence: clip(JSON.stringify(item.answers)) }));
  data.standards.forEach(item => rows.push({ id: item.id, source: 'EAST Standards Assessment', date: item.generated_at, student_id: item.student_id, evidence: clip(JSON.stringify(item.results)) }));
  data.skills.forEach(item => rows.push({ id: item.id, source: 'Skill Evidence', date: dated(item), student_id: studentByName.get((item.student_name || '').trim().toLowerCase()) || item.created_by_id, student_name: item.student_name, evidence: clip(`${item.skill_name}; ${item.software_tools}; ${item.proficiency}; ${item.notes}`) }));
  data.doNowResponses.forEach(item => rows.push({ id: item.id, source: 'Do Now Response', date: item.school_date, student_id: item.student_id, evidence: clip(item.answer) }));
  return rows.filter(item => item.evidence && within(item.date, from, to));
}

const categories = ['Critical Thinking', 'Project Planning & Management', 'Communication', 'Teamwork', 'Technical or Applied Skills', 'Independence & Ownership', 'Reflection & Self-Awareness'];
const statuses = ['Growth Evident', 'Some Growth Evident', 'Learning Evidence Emerging', 'No Clear Learning Evidence Yet', 'Continue Monitoring'];
const schema = { type: 'object', properties: { entries: { type: 'array', items: { type: 'object', properties: {
  case_id: { type: 'string' }, learning_categories: { type: 'array', items: { type: 'string', enum: categories } }, starting_summary: { type: 'string' }, teacher_feedback_summary: { type: 'string' }, later_work_summary: { type: 'string' }, growth_observed: { type: 'string' }, connection_to_facilitation: { type: 'string' }, applied_feedback: { type: 'boolean' }, learning_evidence_status: { type: 'string', enum: statuses }
}, required: ['case_id', 'learning_categories', 'starting_summary', 'teacher_feedback_summary', 'later_work_summary', 'growth_observed', 'connection_to_facilitation', 'applied_feedback', 'learning_evidence_status'] } } }, required: ['entries'] };

function evidenceCandidates(actions, evidence, users) {
  const names = new Map(users.map(user => [user.id, user.full_name || user.email || 'Student'])), candidates = [];
  actions.forEach(action => {
    const associated = evidence.filter(item => (action.student_id && item.student_id === action.student_id) || (action.project_id && item.project_id === action.project_id));
    const exact = associated.filter(item => action.starting_source_ids?.includes(item.id) || (action.starting_assignment_id && item.assignment_id === action.starting_assignment_id));
    const possibleStartingPoints = exact.length ? exact : associated;
    [...new Set(associated.map(item => item.student_id).filter(Boolean))].forEach(studentId => {
      const studentRows = associated.filter(item => item.student_id === studentId);
      const startingRows = possibleStartingPoints.filter(item => item.student_id === studentId && new Date(item.date) <= new Date(action.date));
      const before = startingRows.sort((a, b) => b.date.localeCompare(a.date))[0];
      const after = studentRows.filter(item => item.id !== before?.id && new Date(item.date) > new Date(action.date)).sort((a, b) => a.date.localeCompare(b.date));
      [...new Map([...after.slice(0, 3), after[after.length - 1]].filter(Boolean).map(item => [item.id, item])).values()].forEach(later => candidates.push({ case_id: `case:${candidates.length}`, student_id: studentId, student_name: names.get(studentId) || 'Student', teacher_action: action, starting_point: before, later_evidence: later, starting_match: exact.length ? 'direct source match' : 'same student or project before intervention' }));
    });
  });
  return candidates.filter(item => item.starting_point && item.later_evidence).slice(-80);
}

export async function runLearningGrowthAnalysis(data, from, to) {
  const actions = teacherActions(data, from, to).sort((a, b) => a.date.localeCompare(b.date)).slice(-120), evidence = studentEvidence(data, from, to), candidates = evidenceCandidates(actions, evidence, data.users);
  if (!candidates.length) return [];
  const result = await base44.integrations.Core.InvokeLLM({ prompt: `Audit these EAST evidence cases for strict instructional alignment. Select a case only when all three records concern the same specific skill, misconception, challenge, behavior, or project need: (1) the starting evidence clearly shows the struggle or need, (2) the teacher action directly addresses that same need, and (3) the later evidence demonstrates learning or a meaningful change in that same area. Shared student identity, shared project, close dates, participation, completion, uploads, activity, or a higher grade are not enough. Omit any case where the intervention could apply only generally, where the starting struggle must be guessed, or where the later work addresses a different topic. For every selected case, identify the precise aligned focus in the summaries and explain only the visible connection. Use only supplied case_id values. Do not claim causation; use professional language such as "Following the targeted support, subsequent documentation showed..." Do not force a category or fill a quota; returning no entries is correct when alignment is not defensible.\nCASES:${JSON.stringify(candidates)}`, response_json_schema: schema });
  const candidateMap = new Map(candidates.map(item => [item.case_id, item]));
  const entries = (result.entries || []).flatMap(entry => { const match = candidateMap.get(entry.case_id); if (!match) return []; return [{ student_id: match.student_id, student_name: match.student_name, learning_categories: entry.learning_categories || [], starting_summary: entry.starting_summary, teacher_feedback_summary: entry.teacher_feedback_summary, later_work_summary: entry.later_work_summary, teacher_action: { source_id: match.teacher_action.id, date: match.teacher_action.date, source: match.teacher_action.source, description: match.teacher_action.description }, starting_point: { source_id: match.starting_point.id, date: match.starting_point.date, source: match.starting_point.source, evidence: match.starting_point.evidence }, later_evidence: { source_id: match.later_evidence.id, date: match.later_evidence.date, source: match.later_evidence.source, evidence: match.later_evidence.evidence }, growth_observed: entry.growth_observed, connection_to_facilitation: entry.connection_to_facilitation, applied_feedback: entry.applied_feedback, learning_evidence_status: entry.learning_evidence_status }]; });
  return entries;
}