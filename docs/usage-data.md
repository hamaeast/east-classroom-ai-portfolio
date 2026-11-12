# What the usage data showed

These are aggregate counts from the live app's admin-only Usage Stats page ([`UsageStats.jsx`](../src/pages/UsageStats.jsx)), covering **2026-08-01 to 2026-11-11**. They include no names, emails, IDs or per-student rows. These are counts of activity. They **don't measure learning outcomes**.

## Activity

| Measure | Count |
|-|-|
| Student accounts | 100 |
| Students with a submitted goal, a check-in, *and* a standards assessment | 96 |
| Weekly goals submitted | 1,171 |
| Goal reflections submitted | 1,052 |
| Weekly check-ins submitted | 1,054 |
| Evidence links reviewed by AI | 1,096 |
| Standards assessment records | 375 |

## Three findings, and what I'm doing about them

### 1. The AI couldn't open most evidence links: 704 of 1,096 (64%)

The counts don't show why. By the prompt's definition, these links required a sign-in, were blocked, or couldn't be confidently inspected. Unshared Google Drive files are a likely cause, but that hasn't been checked. **This backs up the decision to make evidence review advisory.** If the review had been able to block submissions, most check-ins would have been held up by whether a link could be opened rather than by the student's work. **Planned next step:** add a one-time "how to share your file" walkthrough for students, and track the share of links the AI can open over time.

### 2. Most goals got an AI clarification: 1,041 of 1,171 (89%)

A goal gets this flag only when the model judges it unclear. The prompt is written to accept any understandable goal, so 89% is far higher than the design intends. Two likely causes:
- The count covers the whole period, including the first weeks, when a separate early-year writing check was used, and before the prompt was relaxed.
- The model may still be applying a higher bar than the prompt asks for.

**Planned next step:** break the rate down by month to see whether it dropped after the prompt changes. Then run the [evaluation kit](eval/README.md) on fictional goals to compare the model's calls with mine, and try adding labeled examples to the prompt.

### 3. Many placements are in the 9-12 band, and none at Mastery

Across the 7 standards, about 45% of students' highest placements are in the **9-12** band, and **none are at Mastery**. The class spans grades 7–9. For 9th graders, 9-12 is their own band. For 7th and 8th graders, it's above their band. The stats aren't split by grade, so they can't yet show how many placements are above band. Either way, the grade formula caps credit at each student's enrolled band, so grades aren't inflated. Zero Mastery placements across about 113 students is worth checking too. **Planned next step:** split placements by grade level, and compare a sample with my own ratings before trusting band-level placements for anything beyond feedback.

About 18% of all standard results (461 of roughly 2,625) said "Not enough dashboard evidence yet," which is the default the prompt asks for when evidence is thin.

## Notes on the numbers

- **"Students assessed" was 113,** above the 100 current accounts. This likely includes students who have since left the class. The table above uses current accounts.
- **Left out because they aren't reliable yet:**
  - The count of grades needing teacher review. The counter likely reads the wrong field.
  - The average makeup score, which came out above the normal 5-point maximum.
  - The count of check-ins returned to students. Returned check-ins change status when they're resubmitted.
- **The "submitted after two AI suggestions" flag** is cleared when the teacher reviews the check-in. The 4 still flagged are a minimum.
