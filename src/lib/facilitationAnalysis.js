import { base44 } from '@/api/base44Client';
import { pitchStudentIds } from '@/lib/pitchStudents';

const sourceDate = item => item.updated_date || item.original_submitted_at || item.goal_submitted_at || item.reflection_submitted_at || item.created_date;
const recentEnough = item => !sourceDate(item) || new Date(sourceDate(item)).getTime() >= Date.now() - 70 * 86400000;
const trim = value => String(value || '').slice(0, 900);

function sourceRows(data, recentOnly = true) {
  const groups = [
    ['WeeklyCheckIn', data.checkIns], ['WeeklyGoal', data.goals], ['Project', data.projects], ['ProjectPitch', data.pitches],
    ['TaskRequest', data.tasks], ['HelpRequest', data.help], ['Comment', data.comments], ['ServiceEntry', data.service],
    ['ReadingResponse', data.readingResponses], ['DoNowResponse', data.doNowResponses], ['StudentSkill', data.skills]
  ];
  return groups.flatMap(([entity_type, rows = []]) => rows.filter(item => !recentOnly || recentEnough(item)).slice(0, 180).map(item => ({
    entity_type, id: item.id, date: sourceDate(item), student_id: item.student_id || item.created_by_id,
    member_ids: item.member_ids || item.assigned_student_ids || (item.assigned_student_id ? [item.assigned_student_id] : []), project_id: item.project_id || item.project_pitch_id,
    title: trim(item.project_title || item.title || item.skill_name), status: item.status || item.approval_status,
    accomplishment: trim(item.accomplishment), next_step: trim(item.next_step || item.next_milestone), challenge: trim(item.blocker), help_needed: trim(item.help_needed || item.message),
    goal: trim(item.goal_text), reflection: trim(item.reflection_notes), teamwork: trim(item.collaboration_contribution), progress: item.progress,
    student_response: trim(item.answer || (item.answers || []).map(answer => answer.answer).join(' | ')),
    project_input: trim([item.problem, item.solution, item.technology_use, item.ethics_statement, item.ethical_concerns, item.community_need].filter(Boolean).join(' | ')),
    details: trim([item.description, item.link_description, item.met_goal, item.goal_too_hard, item.client_name, item.community_partner_name, item.technology_tools].filter(value => value !== undefined && value !== '').join(' | ')),
    skill_input: trim([item.skill_name, item.software_tools, item.proficiency, item.certification_name, item.notes].filter(Boolean).join(' | ')),
    author_role: item.author_role,
    evidence: [...(item.evidence_links || []), ...(item.evidence_files || [])].map(entry => trim(entry.description || entry.url)),
    feedback: trim(item.teacher_feedback || item.admin_feedback || item.message), student_name: trim(item.student_name), student_names: trim(item.student_names),
    late: Boolean(item.is_late || item.is_backdated), grade_status: item.grade_status, partner: trim(item.partner_name)
  })));
}

const reviewSchema = { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: {
  subject_type: { type: 'string', enum: ['student', 'team', 'project'] }, student_id: { type: 'string' }, student_name: { type: 'string' }, team_name: { type: 'string' }, project_id: { type: 'string' }, project_name: { type: 'string' },
  concern_type: { type: 'string', enum: ['next_steps', 'repeated_challenge', 'help_request', 'project_progress', 'teamwork', 'communication', 'documentation', 'returned_work', 'positive_progress', 'other'] },
  priority: { type: 'string', enum: ['address', 'follow_up', 'monitor', 'positive_progress'] }, concern: { type: 'string' }, supporting_information: { type: 'array', items: { type: 'string' } },
  source_refs: { type: 'array', items: { type: 'object', properties: { entity_type: { type: 'string' }, record_id: { type: 'string' }, date: { type: 'string' }, label: { type: 'string' } }, required: ['entity_type', 'record_id', 'date', 'label'] } }
}, required: ['subject_type', 'concern_type', 'priority', 'concern', 'supporting_information', 'source_refs'] } } }, required: ['items'] };

export async function scanFacilitationData(data, existingItems, records) {
  const rows = sourceRows(data), validIds = new Set(rows.map(row => row.id));
  const recordKey = item => `${item.subject_type}:${item.student_id || item.team_name || item.project_id}:${item.concern_type}`.toLowerCase();
  const monitoredItems = new Map(existingItems.filter(item => item.queue_status === 'monitoring').map(item => [item.dedupe_key, item]));
  const monitoredRecords = new Map(records.filter(item => !['resolved', 'complete'].includes(item.status)).map(item => [recordKey(item), item]));
  const blockedKeys = new Set([...existingItems.filter(item => item.queue_status !== 'monitoring').map(item => item.dedupe_key), ...records.filter(item => ['resolved', 'complete'].includes(item.status)).map(recordKey)]);
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Review the EAST dashboard records below and return no more than 8 specific, meaningful facilitation items. Prioritize repeated concerns and actionable patterns; include positive progress only when it is meaningful. Use factual professional language and never infer motivation, diagnosis, or causation. Do not create an item from one weak data point. Every source_ref record_id must exactly match a supplied record. Identify the student, team, or project only when supported. Do not repeat blocked concern keys. A monitored concern may be returned only when the supplied records contain meaningful new evidence about that same topic.\n\nBLOCKED KEYS:\n${JSON.stringify([...blockedKeys])}\n\nMONITORED KEYS (new evidence may return these to review):\n${JSON.stringify([...monitoredItems.keys(), ...monitoredRecords.keys()])}\n\nSTUDENT DIRECTORY:\n${JSON.stringify(data.users.filter(user => user.role !== 'admin').map(user => ({ id: user.id, name: user.full_name, period: user.class_period })))}\n\nDASHBOARD RECORDS:\n${JSON.stringify(rows)}`,
    response_json_schema: reviewSchema
  });
  const used = new Set(blockedKeys);
  return (result.items || []).flatMap(item => {
    const subjectKey = item.student_id || item.team_name || item.project_id || item.student_name || item.project_name;
    const dedupe_key = `${item.subject_type}:${subjectKey}:${item.concern_type}`.toLowerCase();
    const refs = (item.source_refs || []).filter(ref => validIds.has(ref.record_id));
    if (!subjectKey || !refs.length || used.has(dedupe_key)) return [];
    const monitored = monitoredItems.get(dedupe_key);
    const knownIds = new Set([...(monitored?.source_refs || []), ...(monitoredRecords.get(dedupe_key)?.source_refs || [])].map(ref => ref.record_id));
    const newRefs = refs.filter(ref => !knownIds.has(ref.record_id));
    if ((monitored || monitoredRecords.has(dedupe_key)) && !newRefs.length) return [];
    used.add(dedupe_key);
    if (monitored) return [{ id: monitored.id, source_refs: [...(monitored.source_refs || []), ...newRefs], supporting_information: [...new Set([...(monitored.supporting_information || []), ...(item.supporting_information || [])])], queue_status: 'to_review', scanned_at: new Date().toISOString() }];
    const queue_status = monitoredRecords.has(dedupe_key) ? 'to_review' : item.priority === 'address' ? 'response_needed' : item.priority === 'monitor' ? 'monitoring' : 'to_review';
    return [{ ...item, source_refs: newRefs.length ? newRefs : refs, dedupe_key, queue_status, scanned_at: new Date().toISOString() }];
  });
}

const followUpSchema = { type: 'object', properties: { evidence: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, source: { type: 'string' }, source_id: { type: 'string' }, summary: { type: 'string' }, relevance_note: { type: 'string' } }, required: ['date', 'source', 'source_id', 'summary', 'relevance_note'] } } }, required: ['evidence'] };

function relatedGroupContext(record, data) {
  const studentIds = new Set(record.student_id ? [record.student_id] : []), projectIds = new Set(record.project_id ? [record.project_id] : []);
  const nameMatches = value => value && [record.team_name, record.project_name].some(name => name && value.toLowerCase().includes(name.toLowerCase()));
  const projects = data.projects.filter(project => projectIds.has(project.id) || projectIds.has(project.project_pitch_id) || project.member_ids?.some(id => studentIds.has(id)) || nameMatches(project.title));
  projects.forEach(project => { projectIds.add(project.id); if (project.project_pitch_id) projectIds.add(project.project_pitch_id); (project.member_ids || []).forEach(id => studentIds.add(id)); });
  const pitches = data.pitches.filter(pitch => projectIds.has(pitch.id) || pitchStudentIds(pitch, data.users).some(id => studentIds.has(id)) || nameMatches(pitch.project_title));
  pitches.forEach(pitch => { projectIds.add(pitch.id); pitchStudentIds(pitch, data.users).forEach(id => studentIds.add(id)); });
  data.projects.filter(project => projectIds.has(project.id) || projectIds.has(project.project_pitch_id) || project.member_ids?.some(id => studentIds.has(id))).forEach(project => { projectIds.add(project.id); if (project.project_pitch_id) projectIds.add(project.project_pitch_id); (project.member_ids || []).forEach(id => studentIds.add(id)); });
  return { studentIds, projectIds };
}

export async function scanRecordFollowUp(record, data) {
  const since = new Date(record.last_follow_up_scan_at || record.date_addressed).getTime();
  const dismissed = new Set([...(record.dismissed_source_ids || []), ...(record.follow_up_evidence || []).map(item => item.source_id)]);
  const { studentIds, projectIds } = relatedGroupContext(record, data);
  const rows = sourceRows(data, false).filter(row => new Date(row.date).getTime() > since && !dismissed.has(row.id)).filter(row =>
    studentIds.has(row.student_id) || row.member_ids?.some(id => studentIds.has(id)) || projectIds.has(row.project_id) || projectIds.has(row.id) ||
    (record.team_name && JSON.stringify(row).toLowerCase().includes(record.team_name.toLowerCase()))
  );
  if (!rows.length) return [];
  const result = await base44.integrations.Core.InvokeLLM({ prompt: `Find up to 5 strong pieces of newer follow-up evidence directly relevant to this facilitation record. Review every supplied student-input field, including check-ins, goals and reflections, project and pitch input, task and help requests, comments, service entries, reading answers, Do Now answers, and skill updates. Evidence may come from any student in the same project group, but clearly identify whose input it came from and do not attribute one student's statement to another. Do not claim the facilitator response caused a change. Use only exact source IDs supplied. If information is weak or unrelated, omit it.\nRECORD:${JSON.stringify({ concern: record.concern, response: record.facilitator_response, student: record.student_name, team: record.team_name, project: record.project_name, related_student_ids: [...studentIds], related_project_ids: [...projectIds] })}\nNEW RECORDS:${JSON.stringify(rows)}`, response_json_schema: followUpSchema });
  const validIds = new Set(rows.map(row => row.id));
  return (result.evidence || []).filter(item => validIds.has(item.source_id));
}