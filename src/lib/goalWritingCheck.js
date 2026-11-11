import { base44 } from '@/api/base44Client';

const SECOND_GRADE_WEEKS = new Set(['2026-08-10', '2026-08-17']);

export const usesSecondGradeOnlyReview = weekStart => SECOND_GRADE_WEEKS.has(weekStart);

export async function reviewSecondGradeWriting(text, responseType, studentContext = '') {
  return base44.integrations.Core.InvokeLLM({
    prompt: `Review only whether this student's ${responseType} is understandable at a second-grade writing level. Look for a complete thought, basic capitalization and punctuation, and words that clearly communicate the student's meaning. Do not evaluate the quality, scope, difficulty, or content of the ${responseType}. Text: "${text}". If it does not meet that writing level, give one short, friendly suggestion without rewriting it for the student. Make the suggestion specific using relevant details from the student's own or tagged history when available, but never say the student personally completed work that only appears in a team-tagged record.\n\n${studentContext}`,
    response_json_schema: { type: 'object', properties: { acceptable: { type: 'boolean' }, suggestion: { type: 'string' } }, required: ['acceptable', 'suggestion'] }
  });
}