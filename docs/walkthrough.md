# Walkthrough (about 5 minutes)

A silent animated walkthrough of eleven demo states is at [walkthrough.gif](walkthrough.gif). No narrated video is included yet. Use this outline to record one from the demo (`cd demo && python3 -m http.server 8765`, then open <http://127.0.0.1:8765>). Click **Reset** before each section.

| Time | Screen | Do | Say |
|-|-|-|-|
| 0:00 | Banner | Point at the purple banner | "This is an isolated demo with fictional students. The AI responses are prerecorded examples, and the page can't make network calls." |
| 0:15 | 1 · Weekly goal | **Clear short goal** → Submit | "A short, lowercase goal is accepted. The prompt tells the model not to demand SMART-goal detail when the action is clear." |
| 0:40 | 1 · Weekly goal | Reset → **Unclear goal** → Submit | "An unclear goal gets exactly one short question, not a list." Open *Prompt the live app would send*. |
| 1:05 | 1 · Weekly goal | **Revised goal** → Submit | "The second submission is accepted with no AI call. That limit is in code, not just in the prompt." |
| 1:25 | 2 · Check-in | **Low-effort answers + private link** → Submit twice | "Hints, not answers. The bar shows two suggestion rounds used." |
| 1:50 | 2 · Check-in | Submit a third time | "After two rounds the student isn't stuck. Written review stops, the check-in saves, and the teacher is flagged. The private link can't be read, and the student sees a fix, but it doesn't block submission." |
| 2:10 | 3 · Rubric scoring | **Answer tries to game the grader** | "Each question is scored the cheapest reliable way. AI scores only the open answer, against my rubric. Even if the model were fooled into giving 100, the code caps it at 4. That limits the damage, but the teacher would still need to notice." |
| 2:35 | 4 · Makeup | **Summary only**, then tick the full-credit box | "Missed weeks can be made up by teaching a skill step by step. Half credit unless I open a full-credit window for that student." |
| 2:55 | 5 · Learning summary | Switch between the two samples | "The summary uses only the student's records. With thin records it says so instead of inventing growth." |
| 3:15 | 6 · Standards & evidence | Walk steps 1–6, then switch to **New run returns a lower placement** and **too little evidence** | "Student records become a band and level on each EAST standard, with an explanation and a next step. Code keeps the highest placement and turns placements into a 20-point grade with a fixed rule. These are model judgments, not validated measures, and they're separate from the narrative summary." |
| 3:45 | 7 · Teacher review | Show the flagged card and the evidence panel | "The teacher sees the student's own words next to AI advice and decides: approve, return, or mark reviewed." |
| 4:05 | 7 · Teacher review | Scroll to the learning-evidence sample | "Growth reports can only cite records the code supplies, use a fixed status list, and avoid causal claims." |
| 4:20 | n/a | n/a | "The full app runs on Base44 and is used by about 100 students. Prompts, rules, and the review design are documented in docs/." |

Screenshots of each state are in `docs/screenshots/`. You can reproduce them with `?scene=goal-clear|goal-unclear|goal-revised|checkin-attempt2|checkin-fallback|rubric|rubric-injection|makeup|summary|standards|standards-lower|standards-thin|teacher`.
