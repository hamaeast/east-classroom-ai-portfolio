# Public-copy notes

This repository was made from an export of the production Base44 app and then cleaned for public sharing. The live app was not changed, and this repository is not connected to it. Git history starts fresh here, so no earlier versions of the files are included.

## Removed or generalized

| What | Where | Change |
|-|-|-|
| A student's name and school email tied to an individual makeup-credit exception | `Q1RescuePanel.jsx`, `src/lib/checkInMakeup.js`, `base44/functions/gradeCheckInMakeup/entry.ts` | Removed. The one-off exception became a teacher-controlled option: `NineWeeksUnlock.full_credit_makeup`, set from a new `ClosedPeriodRescuePanel.jsx` where the teacher picks the student. The server checks it for the signed-in student. |
| Hardcoded classroom Google Drive photo folder link | `base44/functions/listPublicDrivePhotos/entry.ts` | Replaced with the `CLASSROOM_PHOTO_FOLDER_URL` secret; returns no photos when unset |
| Saved list of classroom photo file IDs | `src/components/east/DailyDrivePhoto.jsx` | Removed; shows a placeholder when no folder is configured |
| School and district names, district email domain | `AuthLayout.jsx`, `Login.jsx`, `AuthContext.jsx`, `MissionControlOverview.jsx`, `CheckIns.jsx`, `AbsenceDeadlineAdjustments.jsx`, `User.jsonc`, `schoolCalendar.js` | Replaced with settings in `src/lib/schoolConfig.js` (`VITE_SCHOOL_NAME`, `VITE_SCHOOL_EMAIL_DOMAIN`, …) and generic wording |
| School mascot logo and a generated background image hosted under the app's Base44 media path (exposed the app ID) | `BrandMark.jsx`, `MissionControlOverview.jsx` | Removed; optional `VITE_SCHOOL_LOGO_URL` |
| District calendar page and image links | `src/pages/Calendar.jsx` | Replaced with `VITE_SCHOOL_CALENDAR_*` settings |
| Generic Base44 README | `README.md` | Replaced with a project overview |

## Kept on purpose

- **EAST Initiative logo URL** (public program branding) and Base44 documentation links.
- **School-year dates and holiday dates** in `gradingPeriods.js` and `schoolCalendar.js`. The grading logic needs them, and they contain no personal information. They follow one district's public calendar, so a determined reader could narrow down the region. Replace them if that matters.
- **`America/Chicago` time zone** used for deadlines.
- **`AGENTS.md` / `CLAUDE.md`**: Base44's standard instructions for AI coding assistants.

## Secrets

- The export contained no API keys or tokens. The app ID is read from `VITE_BASE44_APP_ID` at build time, and the only committed value is the placeholder in `.env.example`.
- `.gitignore` excludes `.env`, `.env.*` (except `.env.example`), and `base44/.app.jsonc`.

## Other fixes made in this copy

- Three lint errors that were already in the export (two unused imports and a reference to a lint rule that isn't configured) were fixed so `npm run lint` passes.
- The makeup-credit generalization above changes behavior. It passes lint and builds, but it **has not been deployed or tested against a Base44 backend**.
