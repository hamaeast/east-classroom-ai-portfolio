# Using the AI only where it's needed

AI calls cost money, take time, and add another chance for an error, so the app uses rules in code wherever a rule is enough. The examples below come from the current code. **I haven't measured the savings**, so this page shows where calls are avoided or made smaller and doesn't put a number on it.

## 1. Check required fields before calling the AI

A check-in with an empty answer or a missing evidence link is sent back right away with a message. The AI is never called for it.

[`src/pages/CheckIns.jsx`](../src/pages/CheckIns.jsx#L194)
```js
if (!form.accomplishment.trim()) errs.accomplishment = 'Write what you accomplished this week.';
...
if (!links.length && !files.length) errs.evidence = 'Attach at least one Google Drive file link or other evidence link.';
if (Object.keys(errs).length) { /* show errors */ return; }   // before any InvokeLLM
```

The makeup scorer does the same on the server. It rejects missing fields, closed grading periods, exempt or dismissed weeks, and weeks that already have a check-in, all before its only AI call ([`gradeCheckInMakeup/entry.ts`](../base44/functions/gradeCheckInMakeup/entry.ts#L50), AI call at line 107).

## 2. Score with code when the answer can be checked by a rule

Multiple-choice and required-keyword questions are scored in code. Questions marked manual go to the teacher. Only open answers go to the AI, and they all go together in **one** request per submission.

[`base44/shared/assignmentScoring.ts`](../base44/shared/assignmentScoring.ts)
```ts
} else if (question.type === 'multiple_choice') {
  const correct = answer === question.correct_choice;            // no AI
} else if (question.scoring_strategy === 'manual') {
  details.push({ ..., feedback: 'Saved for teacher review' });   // no AI
} else if (question.scoring_strategy === 'keyword') {
  const matched = keywords.every(k => answer.toLowerCase().includes(k));  // no AI
} else {
  aiQuestions.push({ ... });                                     // batched into one call
}
```

## 3. Limit how many times the AI is asked again

A goal gets one AI clarification. After that, a flag saved on the record skips the AI on the next submission.

[`src/components/east/WeeklyGoalForm.jsx`](../src/components/east/WeeklyGoalForm.jsx)
```js
if (!record.ai_suggestion_used) {
  review = await base44.integrations.Core.InvokeLLM({ ... });
}
// second submission: no AI call
```

## 4. Send a smaller request when less is needed

After two rounds of hints on a check-in, the written answers are no longer reviewed. The request then sends only the evidence links. It leaves out the written answers, the student's history, and the parts of the schema used to check the answers.

[`src/pages/CheckIns.jsx`](../src/pages/CheckIns.jsx#L223)
```js
// Once written-answer review is bypassed (two failed attempts), drop the
// written-answer validation block, the written answers themselves, and
// the recommendation context from the prompt and schema — only the
// evidence inspection is still needed, so the call uses far fewer tokens.
if (bypassAi) {
  result = await base44.integrations.Core.InvokeLLM({
    prompt: `Inspect this student's weekly check-in evidence links ...`,
    response_json_schema: { ... evidence_reviews ... },
  });
}
```

## 5. Reuse earlier results instead of asking again

**Learning summaries** are saved with a fingerprint of the records they were built from. The AI runs again only when the student's records change.

[`src/components/east/LearningSummaryView.jsx`](../src/components/east/LearningSummaryView.jsx#L40)
```js
// Reuse the cached summary stored on the student if it was generated from this exact
// data fingerprint — only call the AI again when something actually changed.
if (cachedFingerprint === fingerprint && cachedText) {
  setSummary(cachedText);
  return;
}
```

**Guided coaching questions** are saved for each student, week and phase. If two requests for the same questions arrive while the first is still running, they share it, so reopening the form or rendering it twice doesn't create a second AI request. Coaching appears only for students flagged `needs_coaching`.

[`src/components/east/GuidedGoalCoaching.jsx`](../src/components/east/GuidedGoalCoaching.jsx)
```js
const pendingSessions = new Map();               // shares a request that is still running
...
const matches = await base44.entities.GoalCoachingSession.filter({ student_id, week_start, phase });
if (matches[0]) return matches[0];               // saved questions, no AI call
```

## 6. Do the matching in code, then send the model a short list

For growth reports, code first pairs each teacher action with the same student's earlier and later records. It caps the list and shortens each record, and only that list goes to the model. This keeps the request small, and it also means the model can't cite records that weren't supplied.

[`src/lib/learningGrowthAnalysis.js`](../src/lib/learningGrowthAnalysis.js)
```js
const clip = value => String(value || '').slice(0, 1000);          // each record trimmed
...
return candidates.filter(item => item.starting_point && item.later_evidence).slice(-80);  // at most 80 cases
...teacherActions(data, from, to).sort(...).slice(-120)            // at most 120 teacher actions
```

## What isn't measured

I haven't logged call counts or token use before and after these changes, so this page gives no percentages or cost figures. [evaluation-plan.md](evaluation-plan.md) describes how call counts and fallback rates could be tracked.
