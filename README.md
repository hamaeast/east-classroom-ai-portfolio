# EAST Dashboard: AI-assisted project learning platform

A classroom web app for a junior-high **EAST** program. Students plan work with weekly goals, report progress in weekly check-ins backed by evidence, and complete assignments and reflections. The teacher reviews all of it in one place. AI gives students short feedback, inspects their evidence links, scores work against rubrics, and drafts learning summaries. The teacher stays in charge of grades and final judgments.

**Designed by Aspen Ham, EAST facilitator.** Built on [Base44](https://base44.com) with AI-assisted development (see [My role](#my-role)).

> **Built in July 2026, launched in August 2026, and in daily classroom use by 100 students.** The real app holds student work, grades, and names, so it can't be shown publicly. This repository is a cleaned copy of its source code, plus a **separate demo with fictional students** so you can see how it works without exposing any student data. The demo is not connected to the real app.

**[Open the live demo](https://hamaeast.github.io/east-classroom-ai-portfolio/)**: fictional data, prerecorded AI responses, no sign-in. It covers seven workflows: weekly goals, check-ins, rubric scoring, makeup tutorials, the student learning summary, the **standards assessment**, and teacher review.

![Animated walkthrough of the demo: goal review, check-in fallback, teacher review](docs/walkthrough.gif)

### For reviewers: a 5-minute tour

1. **See it:** click through the [live demo](https://hamaeast.github.io/east-classroom-ai-portfolio/), or watch the walkthrough above (about 40 seconds, eleven screens).
2. **Standards-based learning evidence:** [docs/standards-assessment.md](docs/standards-assessment.md) shows how records become placements and a rule-based grade.
3. **How AI is used and constrained:** [docs/ai-design.md](docs/ai-design.md). Read the table that separates protections enforced in code from prompt instructions.
4. **How the design changed with real students:** [docs/iterations.md](docs/iterations.md).
5. **A real prompt in context:** [`WeeklyGoalForm.jsx`](src/components/east/WeeklyGoalForm.jsx) has the goal prompt and the one-clarification limit. [`CheckIns.jsx` line 215](src/pages/CheckIns.jsx#L215) has the two-round fallback and advisory evidence review.
6. **Fewer AI calls through rules in code:** [docs/efficiency.md](docs/efficiency.md) quotes the specific code.
7. **Grounding growth claims in records:** [`learningGrowthAnalysis.js`](src/lib/learningGrowthAnalysis.js) builds candidate cases in code before asking the model to judge them.
8. **Security review:** [docs/security-review.md](docs/security-review.md) checks who can write grades, and the server-side fixes applied on 2026-11-11.
9. **Honest limits:** [docs/expected-ai-behavior.md](docs/expected-ai-behavior.md#known-limitations).
10. **How I'd measure AI accuracy next:** [docs/evaluation-plan.md](docs/evaluation-plan.md). This is a plan, not results yet.

> **How student data was protected:** No real student records were copied. A student's name and email, the school and district names, a classroom photo folder, and other private links were removed from the code and replaced with settings or placeholders. Every student in the demo and screenshots is made up. Details: [docs/public-copy-notes.md](docs/public-copy-notes.md).

| Unclear goal gets one clarifying question | Check-in fallback after two AI suggestions | Teacher review queue |
|-|-|-|
| ![Unclear goal](docs/screenshots/goal-unclear.png) | ![Check-in fallback](docs/screenshots/checkin-fallback.png) | ![Teacher review](docs/screenshots/teacher.png) |
| **Rubric scoring: code, AI, or teacher per question** | **Makeup tutorial scored against a rubric** | **Learning summary from the student's own records** |
| ![Rubric scoring](docs/screenshots/rubric-injection.png) | ![Makeup tutorial](docs/screenshots/makeup.png) | ![Learning summary](docs/screenshots/summary.png) |

*Screenshots come from the isolated demo in `demo/`. All students and projects are fictional, and every AI response is prerecorded and labeled as such.*

---

## The classroom problem

EAST is project-based. Students pick community or technology projects and work on them over weeks, often in teams and at different paces. That makes three things hard to manage with general-purpose tools:

1. **Seeing progress week to week.** Who did what, what is blocking them, and what evidence shows it.
2. **Giving every student timely feedback** on goals and written reflections, without the teacher reading every entry before a student can move on.
3. **Turning scattered evidence into grades and learning summaries** that a teacher can defend, without overstating what a student learned.

## My role

- **Ownership:** I independently designed, built, tested, and maintain the app using Base44 and AI-assisted development. I identified the classroom needs, designed the workflows, data model, grading rules, rubrics and AI prompts, and decided where AI may act and where the teacher must review.
- **How it was built:** I built and revised the app in Base44, an AI-assisted app builder, and with AI coding assistants. Most of the code was generated from my specifications and revision requests. I did not write every line by hand. My contribution is the instructional design, the AI application design, testing, and ongoing revision.
- **Timeline and use:** I built the app in July 2026 and launched it in August 2026. It currently supports **100 student users** (as of November 2026).
- **Iteration:** When students reported unclear feedback or grading problems, I investigated the cause and revised the prompts and workflows. Examples: [docs/iterations.md](docs/iterations.md).
- **Efficiency:** I cut unnecessary AI calls with rule-based logic and smaller, more focused AI requests. See the code examples in [docs/efficiency.md](docs/efficiency.md); the savings haven't been measured.
- **No measured outcomes:** I have not run a controlled study, so this repository makes no claims about measured learning gains.

## Major workflows

| Workflow | Student side | Teacher side |
|-|-|-|
| Weekly goals and reflections | Write a one-week goal, then reflect on it at the end of the week. AI accepts any understandable goal or asks one clarifying question. | Goal schedule, missing-work reports, and makeup handling |
| Weekly check-ins | Report accomplishments, next steps, challenges and hours, with evidence links | Review queue with AI evidence summaries, flags, approve or return |
| Project pitches | Problem, solution, technology plan, ethics | Approve or return with comments; teams sync to members |
| Assignments and reading responses | Answer questions; AI scores against the teacher's answer key or rubric | Gradebook, regrade, overrides, CSV/PDF export |
| Makeups for closed weeks | Write a step-by-step tutorial; AI scores it against a short rubric | Override the score or return it; open a makeup window for an individual student |
| Learning evidence | n/a | AI-assisted standards, writing-growth and learning-growth reports built from dated records |

## Featured: standards-based learning evidence

Students' grades in the standards portion come from **7 EAST standards**, each with "I can" targets at four grade bands and three levels. Assignment completion alone doesn't set them. The app collects each student's own work from across the dashboard, including goals, reflections, check-ins with evidence reviews, pitches, comments, tasks, and reading and Do Now answers. It asks the model to place the student on each standard, with a band, a level, an evidence explanation, and a next step with two concrete examples.

From there, **code takes over**. It keeps the highest placement ever recorded and saves a history step only when a placement rises. It then converts placements to a 20-point nine-weeks score with a fixed rule, which the teacher freezes into the gradebook.

| | |
|-|-|
| **Evidence → placement** | AI, guided by the targets and strict evidence rules in the prompt. When evidence is too thin, the prompt asks for K-2 Emerging and "Not enough dashboard evidence yet." |
| **Placement → grade** | Code only: rank ÷ enrolled-band Mastery, capped at 1, averaged over the strongest 2/3/4/7 standards for Nine Weeks 1–4 |
| **Not the same as the learning summary** | Both read student records, but the standards assessment doesn't use or score the narrative summary |
| **Honest limits** | Placements are model judgments, not validated measures of ability. Results show to students without an approval step, and there's no manual override |

Walk through one standard, from source evidence to placement, next step, history and grade, in the demo's **[Standards & evidence tab](https://hamaeast.github.io/east-classroom-ai-portfolio/#standards)**. Full write-up: **[docs/standards-assessment.md](docs/standards-assessment.md)**.

| Standards walkthrough (one fictional student, one standard) |
|-|
| ![Standards assessment walkthrough](docs/screenshots/standards.png) |

## AI design in brief

Full detail: **[docs/ai-design.md](docs/ai-design.md)**. Expected behavior and limitations: **[docs/expected-ai-behavior.md](docs/expected-ai-behavior.md)**. How the design changed over time: **[docs/iterations.md](docs/iterations.md)**.

- **Grounded in the student's own work and the teacher's rubric.** Prompts include the student's text, the teacher's answer key or rubric, and (where relevant) the student's own recent history. Team work is labeled as project context, not proof of individual work.
- **Structured outputs.** 17 of the 18 AI calls request JSON matching a schema (for example `{acceptable, suggestion}` or `{score, feedback}`). The code reads only those fields and then applies its own limits. The exception is the student learning summary, which is short markdown text shown as written.
- **Limits enforced in code, not left to the prompt.** Scores are clamped to the allowed range. A goal gets at most one AI clarification. Check-in written review stops after two rounds. Growth reports can only cite record IDs the code supplied. Evidence review can never block a submission.
- **Fallback when AI fails.** If a call errors, the student's work is still saved. Goals and check-ins go through, and assignment scoring marks the work for teacher review.
- **Teacher review where it matters.** Late work, check-ins submitted after the AI fallback, and makeup scores all go to the teacher, who can override or return them.
- **Prompts are instructions, not guarantees.** Rules such as "don't write it for the student" or "don't claim causation" are written into prompts but can't be enforced in code. The docs say which protections are which.

## Try the demo (no account, no AI costs)

**Live demo: <https://hamaeast.github.io/east-classroom-ai-portfolio/>**. The same static files are served from the `gh-pages` branch.

The `demo/` folder is a small static page with fictional data. It shows the student flow and the teacher review flow, including:

1. a clear, short goal accepted on first try
2. an unclear goal getting one short clarifying question, then accepted on revision without another AI call
3. a check-in returned with hints twice, then submitted on the third try and flagged for the teacher
4. an evidence link that couldn't be inspected, shown to the teacher as advice without blocking submission
5. **rubric scoring** of a reading response: multiple choice and keyword questions scored in code, an open answer scored by AI against the teacher's rubric, and a sketch left for the teacher. Samples include an answer that tries to trick the grader (the code clamps the score) and an AI outage (the work goes to the teacher)
6. **makeup tutorials** for missed check-ins, scored on a 0–5 rubric, or 0–10 when the teacher allows full credit; a blank attempt is returned without a grade
7. **the student learning summary**, for a student with several weeks of records and for one with almost none ("Not enough dashboard evidence yet")
8. **the standards assessment**: one standard traced from source records through placement, explanation, next step, keep-highest storage, history, and the rule-based nine-weeks grade
9. **the teacher review queue**, where AI output sits next to the student's own words

```bash
cd demo && python3 -m http.server 8765
```

Then open <http://127.0.0.1:8765>. The page's Content-Security-Policy sets `connect-src 'none'`, so the browser blocks every network request it tries to make, including to Base44. The demo uses copies of the production decision rules in `demo/policy.js`, which have their own tests. A walkthrough script is in [docs/walkthrough.md](docs/walkthrough.md).

## What runs locally vs. what needs Base44

| Part | Runs locally? | Notes |
|-|-|-|
| `demo/` | Yes, fully offline | Static HTML/JS, fictional data, prerecorded AI responses |
| `demo/policy.test.mjs` | Yes | `node --test demo/policy.test.mjs` |
| Frontend `src/` build and lint | Yes | `npm ci && npm run lint && npm run build` |
| Running the full app (`npm run dev`) | Needs a Base44 app | Login, data, and AI calls all go through the Base44 SDK and need your own `VITE_BASE44_APP_ID` |
| `base44/entities`, `base44/functions`, `base44/workflows` | Base44 only | Data schemas with row-level security, Deno backend functions, and scheduled jobs that run on Base44 |
| AI calls (`InvokeLLM`) | Base44 only | Base44's integration chooses and bills the model; a few calls set the model explicitly |

## Repository map

```
demo/                 isolated demo (fictional data, simulated AI, no network)
docs/                 AI design, iterations, expected behavior, public-copy notes, walkthrough, screenshots
src/pages/            app screens (CheckIns.jsx, Goals.jsx, Grades.jsx, Reports.jsx, ...)
src/components/east/  classroom components (WeeklyGoalForm, CheckInMakeupReview, EvidenceAnalysisView, ...)
src/lib/              grading rules and AI analysis helpers (learningGrowthAnalysis, writingGrowthAnalysis, ...)
base44/entities/      data schemas + row-level security rules
base44/functions/     server functions (gradeCheckInMakeup, scoreReadingAssignment, ...)
base44/shared/        shared server logic (assignmentScoring.ts, gradingPeriods.ts, ...)
base44/workflows/     scheduled jobs (nightly coaching profiles, Friday missing reflections, ...)
```

## Beyond this app

**Building for another educator:** I also designed and built [Class Stream](https://github.com/hamaeast/class-stream-ai-portfolio), a custom classroom app for a colleague's middle-school computer science class, used daily with about 150 students. It turns her Google Docs materials into interactive activities and adds AI-drafted assessments and AI scoring with teacher review ([live demo](https://hamaeast.github.io/class-stream-ai-portfolio/)).

**Coaching other educators:**

I helped three colleagues get started building with Base44 and supported them with troubleshooting. They now use their own projects in their classrooms.

## Checks

See [docs/checks.md](docs/checks.md) for the commands that were run on this public copy and their results.

## License

This repository is shared for viewing only. No open-source license is granted, so all rights are reserved. You're welcome to read the code and try the demo; please ask before reusing it.
