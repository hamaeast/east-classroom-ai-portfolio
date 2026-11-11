# Checks run on this public copy

Run on 2026-11-11 with Node 24.20 and npm 11.19 on macOS.

| Check | Command | Result |
|-|-|-|
| Install | `npm ci` | OK |
| Lint | `npm run lint` | **Pass.** Lint covers `src/components` and `src/pages` per `eslint.config.js`. Three errors that were already in the export were fixed. |
| Production build | `npm run build` | **Pass.** Vite warns that two chunks are larger than 500 kB. |
| Demo rule tests | `node --test demo/policy.test.mjs` | **6/6 pass** |
| Demo syntax | `node --check demo/demo.js demo/data.js` | Pass |
| Type check | `npm run typecheck` | **329 errors, the same count as the unmodified export.** The project is JavaScript with loose JSDoc types; these were already there and were not addressed. |
| Dependency audit | `npm audit --omit=dev` | 14 advisories (7 moderate, 6 high, 1 critical) in the export's dependency versions, e.g. `react-router`, `dompurify`, `quill`, `zod`. Not changed here, to avoid altering behavior. |
| Secret and identifier scan | `grep` for API-key, token, private-key and JWT patterns; emails; school, district and student names; the Base44 app ID; Drive folder IDs | No matches outside placeholders |
| Demo network isolation | Opened the demo in a browser and called `fetch()` to Base44, an outside site, and the demo's own server | **All three blocked** by the page's `connect-src 'none'` policy. The only requests in the network log were for the demo's own HTML, CSS and JS files. |
| Screenshot review | Viewed each file in `docs/screenshots/` | Fictional names (marked "sample") and `example.org` links only |

## Not verified

- The generalized makeup-credit code (`ClosedPeriodRescuePanel.jsx`, `full_credit_makeup`) builds and lints, but it has **not** been run against a Base44 backend.
- The full app (`npm run dev`) was not run, because it needs a Base44 app and sign-in.
- No AI model was called while preparing this copy.
