# Selected iterations

These are design changes I made after the August 2026 launch. Most started with students telling me feedback was unclear or a grade looked wrong. I traced each report to its cause, such as a prompt, a scoring rule, or a workflow step, and then revised it. For each one, I describe the problem, the change, and where it shows up in the **current** code. The production Git history is not included in this public copy, so this page does not give dates or before-and-after metrics.

## 1. Accept understandable short goals

- **Problem:** Goal review was stricter than it needed to be. Short goals that were clear enough to act on could be sent back for revision, which cost class time for students still building writing skills.
- **Change:** The prompt now says to accept a goal *immediately* if the intended action can be understood: "Short, simple goals and imperfect spelling or grammar are fine." For the first weeks of school, a separate check looks only at whether the writing is understandable (`src/lib/goalWritingCheck.js`).
- **Where:** `src/components/east/WeeklyGoalForm.jsx` (prompt), `src/lib/goalWritingCheck.js`.
- **Enforcement:** prompt only. The model decides what counts as "understandable."
- **What the data shows so far:** 89% of goals since August got a clarification, but a [test of the live prompt](eval/results-2026-11-12.md) accepted clear short goals in 34 of 36 runs. The next step is checking real goals; see [usage-data.md](usage-data.md).

## 2. Reduce unnecessary planning questions

- **Problem:** Students were asked more planning questions than they needed before they could submit a goal.
- **Change:** If a goal is unclear, the model returns **exactly one** short clarifying question and must not require "planning questions, a checklist, evidence, measurements, or extra details." Guided three-question coaching now appears only for students whose coaching profile is marked `needs_coaching`, which a nightly job updates (`base44/functions/updateGoalCoachingProfiles`).
- **Where:** `WeeklyGoalForm.jsx`, `GoalReflectionForm.jsx`, `GuidedGoalCoaching.jsx`.
- **Enforcement:** "one question" is a prompt instruction. Showing coaching only to flagged students is enforced in code.

## 3. Limit feedback retries

- **Problem:** A student who didn't understand the AI's hint could get stuck resubmitting and receiving new hints.
- **Change:** Goals get at most **one** AI clarification; the flag `ai_suggestion_used` is saved on the record, and the next submission skips AI. Check-ins get at most **two** rounds of hints. After that, written-answer review is skipped, the check-in is saved, and it's flagged for the teacher ("Submitted after two AI suggestions"). The bypass call also drops the written answers from the prompt, so it costs fewer tokens.
- **Where:** `WeeklyGoalForm.jsx`, `src/pages/CheckIns.jsx`; demo copy and tests in `demo/policy.js`.
- **Enforcement:** code. (The check-in counter lives in the browser, see the known gaps in [ai-design.md](ai-design.md).)

## 4. Make evidence review advisory

- **Problem:** Students linked Google Drive files that weren't shared, or linked a whole folder. A strict check would block honest submissions for a sharing-setting mistake.
- **Change:** Evidence review reports what it could see (`accessible`, `summary`, `demonstrated_learning`) and gives one easy fix. The instruction "Evidence review is advisory and must never prevent submission" is in the prompt, and the code never uses evidence results to block a submission. The teacher sees the summary next to the check-in.
- **Where:** `src/pages/CheckIns.jsx`, `src/components/east/EvidenceAnalysisView.jsx`.
- **Enforcement:** code (it never blocks) plus the prompt (what to report).

## 5. Prevent unsupported growth or causation claims

- **Problem:** AI-written summaries and growth reports can sound more confident than the evidence supports, for example by implying a teacher's feedback *caused* an improvement or by treating participation as learning.
- **Change:** Growth analysis now builds candidate cases in code first: an earlier record showing a need, a teacher action, and a later record from the same student. The model can only select from those cases. Prompts say "Do not claim causation," allow returning nothing, and require statuses from a fixed list (e.g., *Some Growth Evident*, *Continue Monitoring*). Writing-growth reports may not describe a shorter later sample as "regression." Summaries say "Not enough dashboard evidence yet" when that's true.
- **Where:** `src/lib/learningGrowthAnalysis.js`, `src/lib/writingGrowthAnalysis.js`, `src/lib/facilitationAnalysis.js`, `src/lib/studentSummaryContext.js`.
- **Enforcement:** case IDs and record references are enforced in code; status lists are requested by schema; "no causation" is prompt only.
