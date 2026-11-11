# Security review: who can write grades

I reviewed the data access rules (Base44 row-level security) for every record that holds a grade, score or approval status. I found that several grade fields were calculated in the browser and saved with the student's own permissions. That means a student who knew how to call the API could have changed them.

**The fixes were applied to the live app on 2026-11-11 through Base44.** This repository was updated from that export. I reviewed the exported code before merging it: the access-rule changes, the new server functions, and the frontend calls.

## Findings

| # | Finding | Risk before the fix | Severity | Status |
|-|-|-|-|-|
| 1 | Students could create or update their own `StandardsAssessment` records | A student could set their own standards placements, which feed a 20-point nine-weeks grade | High | **Fixed:** create and update are admin-only |
| 2 | Weekly check-in grade fields were calculated in the browser and saved by the student | A student could submit a full grade or an "approved" status | High | **Fixed:** the new `submitWeeklyCheckIn` function calculates grade, status, lateness and service hours on the server. Students can no longer update or delete check-ins |
| 3 | Weekly goal and reflection grades were calculated in the browser | A student could set their own goal grade | High | **Fixed:** the new `submitWeeklyGoal` function checks that the goal belongs to the student and calculates grades on the server. Goals are admin-only for writes |
| 4 | Students could set `approval_status` on their own pitches and service-hour entries | A student could approve their own pitch or hours | Medium | **Fixed:** the new `submitProjectPitch` and `resubmitServiceHours` functions check ownership or team membership and only set "pending." Pitch and service-entry updates are admin-only |
| 5 | Students could update `AssignmentReminder` records, which include `points_deducted` | A student could change a late-work deduction | Medium | **Fixed:** the new `markAssignmentRemindersRead` function changes only the `read` field on the student's own reminders. Updates are otherwise admin-only |

The server-side calculations use shared code in `base44/shared/checkInScoring.ts`, `deadlines.ts`, and `weeklyGoalGrading.ts`. They keep the same deadline, extension, late and makeup rules as before.

## Remaining, lower risks

- **New check-ins are first created under the student's own account,** so they're linked to the right student. The server then sets the grade. The access rule allows this only for check-ins marked `pending_review` and `pending`. A student calling the API directly could still create a check-in in that state, but it can't be approved without the teacher, and it goes to the review queue.
- **AI feedback and evidence review still run in the browser,** and the evidence summary is passed to the server. A student could skip the feedback or alter the evidence summary. That summary is advisory and is shown to the teacher next to the actual links. It doesn't set any grade.
- **The check-in "two suggestion rounds" counter is stored in the browser.** Resetting it only gives the student more AI review. Skipping review sets the teacher flag. It can't raise a grade.

## Not re-tested here

- I can't run Base44 functions from this repository. The fixes build and lint, and I reviewed the code by reading it. Runtime testing happens in the live app, not here.
