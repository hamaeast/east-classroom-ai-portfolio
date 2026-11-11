# Evaluation plan (proposed, not yet run)

The app is in daily use, but how often the AI's judgments are right has not been measured. This page lays out how I would measure it. **No results are reported here.**

## Questions to answer

1. **Goal review:** How often does the model accept a goal the teacher would accept, and send back one the teacher would send back? How often does a clarifying question come back as more than one question?
2. **Check-in written review:** How often are real attempts wrongly marked invalid? (This is the costly error, because it frustrates students who did the work.) How often does gibberish get through?
3. **Evidence review:** When the model says a link is accessible, did it actually describe what is on the page? When it says "could not inspect," was the link really private?
4. **Rubric scoring:** How far are AI scores from teacher scores on the same answers, and do they differ more for some kinds of questions?
5. **Growth reports:** Of the cases the model selects, how many would the teacher agree show a real, matching change? Does any entry make a causal claim?

## Method

- **Data:** a small sample of real submissions, anonymized by removing names, emails, and links. About 50 goals, 50 check-ins, and 30 scored answers from one grading period. Collect it only under school and district data policies.
- **Labels:** the teacher labels each item without seeing the AI's decision (accept/revise, valid/invalid, score). A second EAST facilitator labels a subset so we can see how often two people agree.
- **Comparison:** run the production prompts on each item several times. Report agreement with the teacher, the two error types separately, and how often the model's answer changes between runs.
- **Rule checks:** count rule violations automatically: more than one question, a rewritten goal, a score outside the allowed range (should be impossible because of the code clamp), and causal wording in growth entries ("caused," "because of," "led to").
- **Student experience:** from existing records, count how often check-ins reach the two-round fallback and how often goals need the one clarification. Rising counts would suggest the prompts are too strict.

## What would change the design

- If many real attempts are marked invalid, loosen the prompt or let the first submission through with feedback instead of blocking it.
- If AI scores drift from teacher scores on certain question types, send those to teacher review by default.
- If causal wording appears in growth entries, add a code-level wording check before entries are saved, instead of relying only on the prompt.

The demo's decision rules already have their own tests (`demo/policy.test.mjs`). This plan is about the model's judgments, which those tests do not cover.
