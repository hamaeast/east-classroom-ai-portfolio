# Evaluation kit: weekly goal check

This is a small, ready-to-run test for the weekly goal prompt ([prompt-design.md #1](../prompt-design.md#1-weekly-goal-check-accept-or-ask-one-question)). **First run, 2026-11-12: 70 of 72 runs matched the intended answer. See [results-2026-11-12.md](results-2026-11-12.md).** It is the first step of the [evaluation plan](../evaluation-plan.md), and it goes with finding 2 in [usage-data.md](../usage-data.md).

## What's here

- [`goal-review-cases.csv`](goal-review-cases.csv): 24 fictional goals. Each one has the answer the prompt is *designed* to give (`accept` or `clarify`) and a short reason. The intended answers are my reading of the prompt. A second teacher's labels would make them stronger.

## How to run it, with no code and no paid API

1. Open any chat AI. Paste the goal prompt from `prompt-design.md`, with `${goal}` replaced by one case and `${recommendationContext}` left empty. Ask for the JSON reply.
2. Record `acceptable` (true means accept, false means clarify) and the suggestion for each case. Run each case 3 times, because answers can vary.
3. Count:
   - **Wrongly sent back:** intended `accept`, but the model asked to clarify. This is the error that frustrates students.
   - **Wrongly accepted:** intended `clarify`, but the model accepted.
   - **More than one question:** the suggestion contains more than one question, which breaks the prompt's rule.
   - **Changed between runs:** the same goal got different answers across the 3 runs.
4. Then try a version of the prompt with 2–3 labeled examples added, and compare the counts.

## Results

- [2026-11-12](results-2026-11-12.md): run in the live app through its real AI call, from an admin-only test page. 70 of 72 runs matched (97%). Two runs wrongly sent back a goal, none wrongly accepted one, no suggestion asked more than one question, and 1 case was inconsistent across runs.
