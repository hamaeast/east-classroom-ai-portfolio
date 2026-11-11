# Security review: who can write grades

I reviewed the data access rules (Base44 row-level security) for every record that holds a grade, score or approval status. This page lists what I found, how serious it is, and where each fix stands.

**Status key**
- **Fix in progress:** being applied to the live app through Base44. This repository will be updated from the next export of the live app.

## Findings

| # | Finding | Risk | Severity | Status |
|-|-|-|-|-|
| 1 | A student can create or update their own `StandardsAssessment` records. Only the teacher's update screen should write them. | A student could set their own standards placements, which feed a 20-point nine-weeks grade | High | Fix in progress |
| 2 | Weekly check-in grade fields (`grade`, `grade_status`, `approval_status`, `ai_review_flag`, `is_late`) are calculated in the browser and saved by the student's own session | A student could submit a check-in with a full grade or "approved" status through the API | High | Fix in progress |
| 3 | Weekly goal grades (`goal_grade`, `reflection_grade`) are calculated in the browser | A student could set their own goal grade | High | Fix in progress |
| 4 | Students can update `approval_status` on their own project pitches and service-hour entries. They legitimately reset it to "pending" when resubmitting. | A student could mark their own pitch or service hours approved | Medium | Fix in progress |
| 5 | Students can update `AssignmentReminder` records, which include `points_deducted` | A student could change a late-work deduction | Medium | Fix in progress |

## Fix design

- **Grades are calculated on the server.** Student submissions for check-ins, goals and reflections, pitches, and service hours go through backend functions. Those functions calculate grade, deadline and status fields with the same rules as before, using the shared deadline and grading-period code, and save them with service-role access.
- **The access rules no longer let students change protected fields.** Students can still read their own records and save their own written answers.
- **AI feedback still runs in the browser.** That's acceptable: skipping or resetting it only gives a student more AI review, or sends the work to the teacher. It never earns them a better grade.

## Reviewed and not a risk

- **The check-in "two suggestion rounds" counter is stored in the browser.** Clearing it gives the student more AI review, not less. Changing it to skip review sets the teacher flag ("Submitted after two AI suggestions"). It can't raise a grade.
- **Assignment grades, makeup tutorials, facilitation records and writing-growth records** are already admin-only for writes.
