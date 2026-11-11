import { EAST_TARGETS, STANDARD_KEYS, STANDARD_NAMES } from '@/lib/eastStandards';
import { CART_EVIDENCE_GUIDANCE } from '@/lib/cartFramework';
import { belongsToStudent } from '@/lib/studentRecommendationContext';
import { collaboratorsMentioned } from '@/lib/collaborationMentions';

const belongs = (item, student) => belongsToStudent(item, student);
const compact = (items) => items.map(({ id, created_date, updated_date, created_by_id, ...data }) => data);

function studentStandardsItems(student, data) {
  const mine = {
    pitches: data.pitches.filter(x => belongs(x, student)), goals: data.goals.filter(x => belongs(x, student)).map(goal => ({ ...goal, collaborators_mentioned: collaboratorsMentioned(goal, data.users, student.id) })),
    checkIns: data.checkIns.filter(x => belongs(x, student)), service: data.service.filter(x => belongs(x, student)),
    skills: data.skills.filter(x => belongs(x, student)), tasks: data.tasks.filter(x => belongs(x, student)),
    grades: data.grades.filter(x => belongs(x, student)), help: data.help.filter(x => belongs(x, student)),
    linkNotes: data.linkNotes.filter(x => belongs(x, student)), projects: data.projects.filter(x => belongs(x, student)),
    doNowResponses: data.doNowResponses.filter(x => belongs(x, student)),
    readingResponses: data.readingResponses.filter(x => belongs(x, student)),
  };
  mine.doNowQuestions = data.doNowQuestions.filter(question => mine.doNowResponses.some(response => response.question_id === question.id));
  const parentIds = new Set([...mine.pitches, ...mine.checkIns].map(x => x.id));
  mine.comments = data.comments.filter(x => parentIds.has(x.parent_id) || belongs(x, student));
  mine.assignments = data.assignments.filter(x => mine.grades.some(grade => grade.assignment_id === x.id) || mine.readingResponses.some(response => response.assignment_id === x.id));
  return mine;
}

export function buildStandardsContext(student, data) {
  return Object.entries(studentStandardsItems(student, data)).map(([label, items]) => `${label}:\n${JSON.stringify(compact(items))}`).join('\n\n');
}

export function hasStandardsDataChanged(student, data, since) {
  const assessedAt = new Date(since).getTime();
  return Object.values(studentStandardsItems(student, data)).flat().some(item => new Date(item.updated_date || item.created_date).getTime() > assessedAt);
}

export function buildStandardsPrompt(student, context) {
  const rubric = STANDARD_KEYS.map(key => {
    const bands = Object.keys(EAST_TARGETS).map(band => `${band}\nEmerging: ${EAST_TARGETS[band][key].Emerging}\nProficient: ${EAST_TARGETS[band][key].Proficient}\nMastery: ${EAST_TARGETS[band][key].Mastery}`).join('\n');
    return `${key} — ${STANDARD_NAMES[key]}\n${bands}`;
  }).join('\n\n');
  return `Assess this grade ${student.grade} EAST student's demonstrated work against every exact K-2, 3-6, 7-8, and 9-12 playbook target below. Review every submitted student-authored field in the dashboard data as potential standards evidence, including reading-assignment answers, Do Now responses, project pitches (especially ethics_statement and ethical_concerns), goals, reflections (especially collaboration_contribution), check-ins, service descriptions, task requests, help requests, skill notes, link notes, evidence descriptions, public evidence analyses, and comments. Treat public evidence analysis as corroboration of visible work, not proof that the student personally authored everything at the link. A reflection's collaborators_mentioned list is roster-matched from full names, email addresses, or recognizable parts of email addresses in the student's writing. Count a matched teammate mention itself as collaboration evidence even when the reflection does not describe the teamwork, and use the matched roster details to identify who the student worked with. Do not ignore relevant evidence because it was written in an informal area of the dashboard or in response to an assignment. Count each specific statement toward every standard it genuinely demonstrates, while never awarding a level merely because text exists or because an adult wrote feedback. Score demonstrated evidence, never potential or enrolled grade. For each standard independently, choose the highest grade band and proficiency level fully supported by the dashboard evidence. Standards may receive different grade bands, and a standard may jump directly across one or more bands when the evidence supports it; never require sequential progression. Emerging placement in the student's enrolled grade band is attainable with two clear, specific pieces of evidence across submitted work, or one well-documented artifact that directly demonstrates the target; do not require a completed long-term project. Proficient and Mastery require stronger quality, independence, and repeated evidence. When evidence for a standard is missing or too limited, return K-2 Emerging and make the evidence summary begin with "Not enough dashboard evidence yet." Use CART as an evidence lens for the quality and authenticity of project work, but award no CART evidence unless the student's data demonstrates it. For every result below Mastery, write a concise, student-friendly evidence summary followed by "Next step:" with one improvement suggestion and "Examples:" with exactly two numbered, concrete examples of work the student could add or complete for that standard. For Mastery results, give one short evidence sentence. Never invent completed work.\n\n${CART_EVIDENCE_GUIDANCE}\n\nALL PLAYBOOK TARGETS:\n${rubric}\n\nSTUDENT DASHBOARD DATA:\n${context}`;
}

export const standardsResponseSchema = {
  type: 'object', properties: Object.fromEntries(STANDARD_KEYS.map(key => [key, { type: 'object', properties: { grade_band: { type: 'string', enum: ['K-2', '3-6', '7-8', '9-12'] }, level: { type: 'string', enum: ['Emerging', 'Proficient', 'Mastery'] }, evidence_summary: { type: 'string' } }, required: ['grade_band', 'level', 'evidence_summary'] }])), required: STANDARD_KEYS,
};

export function assessmentResults(aiResult) {
  return STANDARD_KEYS.map(key => {
    const selected = aiResult[key];
    return { standard_key: key, assessed_grade_band: selected.grade_band, level: selected.level, target: EAST_TARGETS[selected.grade_band][key][selected.level], evidence_summary: selected.evidence_summary };
  });
}