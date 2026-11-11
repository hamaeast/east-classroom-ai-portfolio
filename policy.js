/*
 * Demo copy of the review-flow rules used by the production app.
 * Production sources (for comparison):
 *   - Weekly goal:   src/components/east/WeeklyGoalForm.jsx  (submit)
 *   - Check-in:      src/pages/CheckIns.jsx                  (submit)
 * These functions are pure so they can be unit-tested (demo/policy.test.mjs).
 * `review` is whatever the (simulated) model returned, or null if the call failed.
 */
(function (root) {
  // ---- Weekly goal -------------------------------------------------------
  // At most ONE AI clarification per goal. The flag is stored on the record,
  // so the second submission is accepted without another model call.
  function decideGoal(record, review) {
    if (record.ai_suggestion_used) {
      return { outcome: 'accepted', calledModel: false, reason: 'Clarification already given once; accepted without another AI check.' };
    }
    if (review === null) {
      return { outcome: 'accepted', calledModel: true, reason: 'AI review unavailable; the app fails open and accepts the goal.' };
    }
    if (!review.acceptable) {
      return { outcome: 'needs_revision', calledModel: true, suggestion: review.suggestion, recordChanges: { ai_suggestion_used: true, ai_suggestion: review.suggestion } };
    }
    return { outcome: 'accepted', calledModel: true, reason: 'Model judged the goal understandable.' };
  }

  // ---- Weekly check-in ----------------------------------------------------
  // previousAttempts counts earlier submissions the model returned with hints.
  // After two, written-answer review is bypassed: only evidence is inspected,
  // the check-in is saved, and it is flagged for the teacher.
  const FIELDS = [
    ['accomplishment', 'What did you accomplish'],
    ['next_step', 'Next step'],
    ['blocker', 'Challenges'],
  ];

  function decideCheckIn(previousAttempts, review) {
    const bypassAi = previousAttempts >= 2;
    const evidence = (review && review.evidence_reviews) || [];
    if (review && !bypassAi) {
      const hints = FIELDS.filter(([key]) => review[key + '_valid'] === false).map(([key, label]) => ({ label, hint: review[key + '_hint'] }));
      if (hints.length) return { outcome: 'returned_with_hints', bypassAi, hints, attempts: previousAttempts + 1, evidence_analysis: evidence };
    }
    // Evidence review never blocks submission (advisory only).
    return {
      outcome: 'submitted',
      bypassAi,
      attempts: previousAttempts,
      evidence_analysis: evidence,
      ai_review_flag: bypassAi,
      reason: review === null ? 'AI review unavailable; saved without AI review.' : bypassAi ? 'Two AI suggestions already given; written answers sent to teacher instead of re-checked.' : 'Written answers accepted.',
    };
  }

  // ---- Assignment scoring -------------------------------------------------
  // Mirrors base44/shared/assignmentScoring.ts. Multiple-choice and keyword
  // questions are scored in code; "manual" questions go to the teacher; the
  // rest are scored by the model against the answer key / rubric, then clamped.
  function scoreAssignment(questions, answers, aiResult, maxPoints) {
    let gradingPending = false;
    const details = questions.map(q => {
      const answer = String(answers[q.id] || '').trim();
      if (!answer) { gradingPending = true; return { id: q.id, by: 'code', points: 0, feedback: 'No saved answer. Teacher review required; original work is preserved.' }; }
      if (q.type === 'multiple_choice') { const ok = answer === q.correct_choice; return { id: q.id, by: 'code', points: ok ? q.points : 0, feedback: ok ? 'Correct' : 'Incorrect' }; }
      if (q.scoring_strategy === 'manual') { gradingPending = true; return { id: q.id, by: 'teacher', points: 0, feedback: 'Saved for teacher review' }; }
      if (q.scoring_strategy === 'keyword') {
        const keys = String(q.answer_key || '').split(/[,\n]/).map(k => k.trim().toLowerCase()).filter(Boolean);
        const ok = keys.length > 0 && keys.every(k => answer.toLowerCase().includes(k));
        return { id: q.id, by: 'code', points: ok ? q.points : 0, feedback: ok ? 'Required ideas included' : 'One or more required ideas were missing' };
      }
      const scored = aiResult && aiResult.scores ? aiResult.scores.find(s => s.id === q.id) : null;
      const valid = scored && Number.isFinite(scored.points);
      if (!valid) { gradingPending = true; return { id: q.id, by: 'ai', points: 0, feedback: 'Work saved; automatic grading unavailable. Teacher review required.' }; }
      const clamped = Math.max(0, Math.min(q.points, scored.points));
      return { id: q.id, by: 'ai', points: clamped, raw: scored.points, clampedFrom: clamped !== scored.points ? scored.points : null, feedback: scored.feedback };
    });
    const total = Math.max(0, Math.min(maxPoints, details.reduce((s, d) => s + d.points, 0)));
    return { details, total, gradingPending };
  }

  // ---- Makeup tutorial scoring --------------------------------------------
  // Mirrors base44/functions/gradeCheckInMakeup/entry.ts. Half credit (0-5) by
  // default; full credit (0-10) only while a teacher-created unlock allows it.
  function scoreMakeup(aiScore, fullCredit) {
    const maxScore = fullCredit ? 10 : 5;
    const score = Math.max(0, Math.min(maxScore, Math.round(Number(aiScore ?? 0))));
    return { score, maxScore, status: score > 0 ? 'graded' : 'returned', gradeRecorded: score > 0 };
  }

  const api = { decideGoal, decideCheckIn, scoreAssignment, scoreMakeup };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DemoPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis);
