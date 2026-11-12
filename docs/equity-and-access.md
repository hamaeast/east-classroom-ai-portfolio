# Equity and access

EAST classes mix students with very different reading and writing levels, students learning English, and students with accommodations. Several design decisions in the app are meant to keep AI feedback from turning into a writing gate.

## Accommodations the teacher assigns per student

The teacher assigns these on each student's profile, in the `modifications` field ([`useStudentModifications.js`](../src/hooks/useStudentModifications.js), [`User.jsonc`](../base44/entities/User.jsonc)):

| Accommodation | What the student gets | Where |
|-|-|-|
| **Dictation** | A microphone button that turns speech into text in the answer box, using the browser's built-in speech recognition | [`DictationButton.jsx`](../src/components/east/DictationButton.jsx) |
| **Text-to-speech** | A button that reads instructions and questions aloud | [`SpeakTextButton.jsx`](../src/components/east/SpeakTextButton.jsx) |
| **Deadline extension** | 0–30 extra school days added to every assignment deadline, counted in instructional days | `assignment_deadline_extension_days`; applied by the server deadline code |

These appear on the student screens where they're most needed: weekly goals and reflections, reading assignments and questions, goal makeup forms, and the daily Do Now.

## AI feedback that judges ideas, not writing

- **Effort, not writing quality.** Goal and check-in reviews use an intentionally lenient bar ("2nd-grade" or "4th-grade"). Short answers, typos and simple grammar are fine. An answer is invalid only if it's blank, gibberish, or shows no attempt (see [prompt-design.md](prompt-design.md)).
- **Early-year writing check.** In the first weeks of school, goals and reflections are checked only for whether they can be understood, using the early-year writing check (`goalWritingCheck.js`).
- **Spelling isn't penalized.** The check-in and makeup-tutorial prompts explicitly say not to penalize spelling or polish.
- **Students write their own work.** Prompts ask for a hint or a question, never a rewritten answer, so the student's own wording stays theirs.

## Not letting tools or access decide grades

- **Evidence review is advisory.** A link the AI can't open never blocks a submission. Instead, the student gets one easy fix, such as changing the sharing setting or adding a screenshot. In this classroom, that covered most links: the AI couldn't open 64% of them ([usage-data.md](usage-data.md)).
- **Feedback loops end.** Students get at most one AI clarification per goal and two rounds of hints per check-in. After that, the work goes to the teacher instead of the student being stuck.
- **Team work is credited carefully.** Team-tagged work counts as project context, not proof of individual work, and the standards prompt says a placement shouldn't rise just because an adult wrote feedback. That rule is in the prompt, not enforced in code.

## Limits

- Dictation and read-aloud depend on the student's browser supporting speech features. They're set to US English only.
- Reading-level instructions are interpreted loosely by the model. The [usage data](usage-data.md) shows the goal check sends back far more real goals than intended, even though it [accepted clear test goals as designed](eval/results-2026-11-12.md).
- No outcomes have been measured by student group.
