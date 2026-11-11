# Standards assessment and learning evidence

EAST students are graded on **7 standards** rather than on assignment completion alone. This page explains how the app turns a student's work across the dashboard into a placement on each standard, and how those placements become a nine-weeks grade. To see it step by step, open the **"6 · Standards & evidence"** tab in the [live demo](https://hamaeast.github.io/east-classroom-ai-portfolio/#standards).

## The targets

[`src/lib/eastStandards.js`](../src/lib/eastStandards.js) defines the standards and 84 "I can" targets:

- **7 standards:** self-directed learning; ethical problem solving; collaboration; research; communication; developing solutions with emerging technology; confidence.
- **4 grade bands:** K-2, 3-6, 7-8, 9-12.
- **3 levels:** Emerging, Proficient, Mastery.

A **placement** is a band plus a level, for example "7-8 Proficient." It is separate from the student's enrolled grade, so an 8th grader can be placed above or below the 7-8 band.

## Pipeline

| Step | What happens | AI or code | Where |
|-|-|-|-|
| 1. Gather evidence | All of the student's records across 15 data types are collected. That includes goals and reflections, check-ins with their evidence reviews, pitches, comments, tasks, help requests, Do Now and reading answers, skills, grades, and service hours. Records the student is tagged on as a team member are included. Only internal IDs and timestamps are removed. | Code | `src/hooks/useStandardsAssessmentData.js`, `src/lib/standardsAssessment.js` (`buildStandardsContext`) |
| 2. Compare to targets | The prompt includes all 84 targets, the CART evidence lens, and the student's records. It asks for "the highest grade band and proficiency level fully supported by the dashboard evidence." | Prompt | `buildStandardsPrompt` |
| 3. Place and explain | For each standard, the model returns a `grade_band` and a `level`, both from fixed lists in the schema, plus an `evidence_summary`. Below Mastery, the summary must include "Next step:" and two numbered examples. | AI | `standardsResponseSchema`, `AdminStandardsUpdate.jsx` |
| 4. Keep the highest | Each new placement is ranked as band × 3 + level. It replaces the stored placement only if its rank is strictly higher. A new history record is saved only when at least one standard rises. Otherwise just `last_checked_at` is updated, and that run's explanations are discarded. | Code | `preserveHighestResults`, `hasPositionGrowth` in `src/lib/standardsProgress.js` |
| 5. History | Each saved record is a step in the student's progression, shown as a growth chart per standard. | Code | `StandardGrowthChart.jsx` |
| 6. Grade | Rule-based: rank = band start (0, 3, 6, 9) + level (1, 2, 3). Credit is min(1, rank ÷ the enrolled band's Mastery rank). The grade averages the strongest 2, 3, 4, or 7 standards in Nine Weeks 1–4 and scales the result to 20 points. | Code | `src/lib/standardsGrade.js`, `base44/shared/standardsGrade.ts` |
| 7. Freeze | At the end of each nine weeks, the teacher writes the score into the gradebook as "Student Standards — Nine Weeks N" (max 20). | Code, teacher action | `StandardsGradeReport.jsx` |

**Worked example:** a 10th grader in Nine Weeks 2 has top placements of 9-12 Proficient (rank 11), 7-8 Mastery (9) and 3-6 Mastery (6). The target rank is 12. (11/12 + 9/12 + 6/12) ÷ 3 × 20 = **14.4 / 20 (72%)**. This exact case is covered by a test in [`demo/policy.test.mjs`](../demo/policy.test.mjs).

## Prompt instructions vs. code

| Rule | Enforced in code? |
|-|-|
| Band and level come from the fixed lists; all 7 standards required | Requested by the JSON schema. A malformed reply makes that student's update fail. |
| Keep the highest recorded placement | **Yes** |
| Save a new history record only when something rises | **Yes** |
| Points capped at the enrolled band's Mastery; strongest-N averaging | **Yes** |
| With too little evidence, place at **K-2 Emerging** and start the summary with "Not enough dashboard evidence yet." | **Prompt only** |
| Score demonstrated evidence, not potential or enrolled grade | Prompt only |
| Don't award a level just because text exists or an adult wrote feedback | Prompt only |
| Treat evidence-link reviews as corroboration, not proof; never invent work | Prompt only |

## Learning summary vs. standards assessment

Both read the student's records, but they are **separate AI calls with separate purposes**.

- The **standards assessment** works from the raw records against the 84 targets and returns structured placements.
- It **does not use the narrative learning summary as input**, and it doesn't score that summary.
- The **learning summary** ([`studentSummaryContext.js`](../src/lib/studentSummaryContext.js)) is short, student-friendly text built from a smaller set of 6 record types.

## Teacher controls

- **Running updates:** the teacher clicks "Update all students" on the learning-summary page. Students with no new or changed records since the last check are skipped.
- **Freezing grades:** the teacher freezes each nine-weeks standards grade. Students with no assessment get 0.
- **Reports:** below-70 lists, a below-grade-level panel, and an acceleration status. After three consecutive placements above the enrolled band, teachers see "Teacher review ready." That label is information only and triggers nothing.
- **No approval step:** results are visible to the student as soon as they are saved.
- **No manual override:** the app has no screen for editing placements by hand.

## Limits

- **Not validated:** placements are model judgments of the evidence the app could see. They are not validated measures of ability, and they haven't been checked against teacher ratings.
- **Generous runs stick:** keeping the highest placement means one generous run stays on record, because a later lower result never replaces it.
- **Default only in the prompt:** the K-2 Emerging default for thin evidence comes from the prompt, not from code.
- **Students can write their own records:** database rules let a student create or update their own standards records directly, outside the teacher-run update. This was fixed on 2026-11-11: create and update are now admin-only (see [security-review.md](security-review.md)).
- **Target text issues:** the target text contains a few typos and two duplicated cells, where two Emerging collaboration targets repeat ethical-problem-solving text. That text is sent to the model and shown to students.
- **Unused toggle:** an availability toggle component exists but isn't wired into the app.
