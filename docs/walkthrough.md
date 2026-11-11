# Walkthrough (about 3 minutes)

No video is included yet. Use this outline to record one from the demo (`cd demo && python3 -m http.server 8765`, then open <http://127.0.0.1:8765>). Click **Reset** before each section.

| Time | Screen | Do | Say |
|-|-|-|-|
| 0:00 | Banner | Point at the purple banner | "This is an isolated demo with fictional students. The AI responses are prerecorded examples, and the page can't make network calls." |
| 0:15 | 1 · Weekly goal | **Clear short goal** → Submit | "A short, lowercase goal is accepted. The prompt tells the model not to demand SMART-goal detail when the action is clear." |
| 0:40 | 1 · Weekly goal | Reset → **Unclear goal** → Submit | "An unclear goal gets exactly one short question, not a list." Open *Prompt the live app would send*. |
| 1:05 | 1 · Weekly goal | **Revised goal** → Submit | "The second submission is accepted with no AI call. That limit is in code, not just in the prompt." |
| 1:25 | 2 · Weekly check-in | **Low-effort answers + private link** → Submit twice | "Hints, not answers. The bar shows two suggestion rounds used." |
| 1:50 | 2 · Weekly check-in | Submit a third time | "After two rounds the student isn't stuck. Written review stops, the check-in saves, and the teacher is flagged. The private link can't be read, and the student sees a fix, but it doesn't block submission." |
| 2:20 | 3 · Teacher review | Show the flagged card and the evidence panel | "The teacher sees the student's own words next to AI advice and decides: approve, return, or mark reviewed." |
| 2:40 | 3 · Teacher review | Scroll to the learning-evidence sample | "Growth reports can only cite records the code supplies, use a fixed status list, and avoid causal claims." |
| 2:55 | n/a | n/a | "The full app runs on Base44 and is used by about 100 students. Prompts, rules, and the review design are documented in docs/." |

Screenshots of each state are in `docs/screenshots/`. You can reproduce them with `?scene=goal-clear|goal-unclear|goal-revised|checkin-attempt2|checkin-fallback|teacher`.
