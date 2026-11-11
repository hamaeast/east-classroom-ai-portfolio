import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { decideGoal, decideCheckIn } = createRequire(import.meta.url)('./policy.js');

test('clear goal is accepted on first submission', () => {
  const r = decideGoal({}, { acceptable: true, suggestion: '' });
  assert.equal(r.outcome, 'accepted');
});

test('unclear goal gets exactly one clarification, then is accepted without a model call', () => {
  const first = decideGoal({}, { acceptable: false, suggestion: 'What will you do on the website this week?' });
  assert.equal(first.outcome, 'needs_revision');
  assert.equal(first.recordChanges.ai_suggestion_used, true);
  const second = decideGoal({ ...first.recordChanges }, { acceptable: false, suggestion: 'ignored' });
  assert.equal(second.outcome, 'accepted');
  assert.equal(second.calledModel, false);
});

test('goal review fails open when the model call fails', () => {
  assert.equal(decideGoal({}, null).outcome, 'accepted');
});

const invalid = { accomplishment_valid: false, accomplishment_hint: 'Name one thing you made.', next_step_valid: true, next_step_hint: '', blocker_valid: true, blocker_hint: '', evidence_reviews: [] };

test('check-in: two attempts with hints, third submission bypasses written review and flags teacher', () => {
  const a1 = decideCheckIn(0, invalid);
  assert.equal(a1.outcome, 'returned_with_hints');
  const a2 = decideCheckIn(a1.attempts, invalid);
  assert.equal(a2.outcome, 'returned_with_hints');
  const a3 = decideCheckIn(a2.attempts, { evidence_reviews: [{ url: 'x', accessible: false }] });
  assert.equal(a3.outcome, 'submitted');
  assert.equal(a3.ai_review_flag, true);
  assert.equal(a3.evidence_analysis.length, 1);
});

test('check-in: inaccessible evidence never blocks submission', () => {
  const r = decideCheckIn(0, { accomplishment_valid: true, next_step_valid: true, blocker_valid: true, evidence_reviews: [{ url: 'x', accessible: false, suggestion: 'Change sharing.' }] });
  assert.equal(r.outcome, 'submitted');
  assert.equal(r.ai_review_flag, false);
});

test('check-in: model failure saves without blocking', () => {
  const r = decideCheckIn(0, null);
  assert.equal(r.outcome, 'submitted');
  assert.deepEqual(r.evidence_analysis, []);
});

const { scoreAssignment, scoreMakeup } = createRequire(import.meta.url)('./policy.js');
const Q = [
  { id: 'q1', type: 'multiple_choice', correct_choice: 'B', points: 2 },
  { id: 'q2', scoring_strategy: 'keyword', answer_key: 'pollen, bees', points: 2 },
  { id: 'q3', points: 4 },
  { id: 'q4', scoring_strategy: 'manual', points: 2 },
];

test('assignment: code scores MC and keyword, AI score is clamped, manual goes to teacher', () => {
  const r = scoreAssignment(Q, { q1: 'B', q2: 'Bees carry pollen', q3: 'answer', q4: 'sketch' }, { scores: [{ id: 'q3', points: 10, feedback: 'x' }] }, 10);
  assert.deepEqual(r.details.map(d => d.points), [2, 2, 4, 0]);
  assert.equal(r.details[2].clampedFrom, 10);
  assert.equal(r.gradingPending, true);
});

test('assignment: AI failure saves work and requires teacher review', () => {
  const r = scoreAssignment([Q[2]], { q3: 'answer' }, null, 4);
  assert.equal(r.details[0].points, 0);
  assert.equal(r.gradingPending, true);
});

test('makeup: half credit by default, clamped, zero returns without a grade', () => {
  assert.deepEqual(scoreMakeup(9, false), { score: 5, maxScore: 5, status: 'graded', gradeRecorded: true });
  assert.equal(scoreMakeup(9, true).score, 9);
  assert.equal(scoreMakeup(0, false).status, 'returned');
  assert.equal(scoreMakeup(-3, false).score, 0);
});

const S = createRequire(import.meta.url)('./policy.js');
const r = (k, b, l) => ({ standard_key: k, assessed_grade_band: b, level: l });

test('standards: lower new placement keeps the stored highest and saves no new record', () => {
  const current = { results: [r('self_directed', '7-8', 'Proficient')] };
  const kept = S.preserveHighestResults([r('self_directed', '3-6', 'Mastery')], current);
  assert.equal(kept[0].level, 'Proficient');
  assert.equal(S.hasPositionGrowth(kept, current), false);
  const raised = S.preserveHighestResults([r('self_directed', '7-8', 'Mastery')], current);
  assert.equal(S.hasPositionGrowth(raised, current), true);
});

test('standards: nine-weeks points use the strongest N, capped at enrolled-band Mastery', () => {
  // Grade 10 (target 12), Nine Weeks 2 uses top 3: 11/12 + 9/12 + 6/12 = 2.1667 / 3 -> 14.4
  const a = { results: [r('a', '9-12', 'Proficient'), r('b', '7-8', 'Mastery'), r('c', '3-6', 'Mastery'), r('d', 'K-2', 'Emerging')] };
  assert.equal(S.standardsNineWeeksPoints(a, 10, 2).points, 14.4);
  // Above-band work is capped at 1.0 credit
  assert.equal(S.standardsNineWeeksPoints({ results: [r('a', '9-12', 'Mastery'), r('b', '9-12', 'Mastery')] }, 8, 1).points, 20);
});
