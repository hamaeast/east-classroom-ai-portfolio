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

  const api = { decideGoal, decideCheckIn };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DemoPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis);
