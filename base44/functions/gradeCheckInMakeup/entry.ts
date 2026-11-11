import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { extendedDueDate, addAssignmentDays } from '../../shared/schoolDeadline.ts';
import { isNineWeeksClosed } from '../../shared/gradingPeriods.ts';

const MAKEUP_NOTE_PREFIX = 'Check-in makeup tutorial — half credit, AI-graded';
const FULL_CREDIT_MAKEUP_NOTE_PREFIX = 'Check-in makeup tutorial — full credit, AI-graded';

function chicagoToday() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function weekEndingFriday(dateText) {
  if (!dateText) return '';
  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + ((5 - date.getUTCDay() + 7) % 7));
  return date.toISOString().slice(0, 10);
}

const NINE_WEEK_PERIODS = [
  { number: 1, start: '2026-08-04', end: '2026-09-30' },
  { number: 2, start: '2026-10-01', end: '2027-01-08' },
  { number: 3, start: '2027-01-11', end: '2027-03-18' },
  { number: 4, start: '2027-03-19', end: '2027-05-28' },
];

// A student with an active NineWeeksUnlock for the week's period can submit a
// makeup tutorial even before the regular 14-day cutoff passes — the rescue
// treats the closed-period week as "too old to make up".
function activeUnlocksForWeek(unlocks, week) {
  const period = NINE_WEEK_PERIODS.find(item => week >= item.start && week <= item.end);
  if (!period) return [];
  const now = new Date();
  return unlocks.filter(item => Number(item.nine_weeks) === period.number && item.unlocked_until && new Date(item.unlocked_until) > now);
}

function normalizedWeek(checkIn) {
  return weekEndingFriday(checkIn.week_ending);
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { week_ending, skill_title, format, written_steps, video_url, video_description } = body || {};
    if (!week_ending || !skill_title || !format) return Response.json({ error: 'Skill, format, and week are required.' }, { status: 400 });
    if (!['written', 'video'].includes(format)) return Response.json({ error: 'Choose written steps or a video.' }, { status: 400 });
    if (format === 'written' && !String(written_steps || '').trim()) return Response.json({ error: 'Write your step-by-step tutorial.' }, { status: 400 });
    if (format === 'video' && !String(video_url || '').trim()) return Response.json({ error: 'Paste your video link.' }, { status: 400 });

    const week = weekEndingFriday(String(week_ending).slice(0, 10));
    if (isNineWeeksClosed(week)) return Response.json({ error: 'This nine-weeks period is closed. Makeup submissions and grades are locked.' }, { status: 403 });
    const service = base44.asServiceRole.entities;

    // Fetch the student's closed-period unlocks first so we can gate the rescue
    // window and grant full-credit makeups when a teacher enabled that option.
    const unlocks = await service.NineWeeksUnlock.filter({ student_id: user.id });

    // Only available once the regular check-in window has closed (past the 14-day cutoff).
    const adjusted = String(extendedDueDate(week, user) || '').slice(0, 10);
    const cutoff = adjusted ? addAssignmentDays(adjusted, 14) : '';
    const weekUnlocks = activeUnlocksForWeek(unlocks, week);
    const rescueUnlock = weekUnlocks.length > 0;
    if (!rescueUnlock && (!cutoff || chicagoToday() <= cutoff)) return Response.json({ error: 'This week is still open for the regular check-in — submit that instead.' }, { status: 400 });

    // Full credit (up to 10) applies only while a teacher-created unlock for this
    // period is active AND marked full_credit_makeup; everyone else earns the
    // half-credit cap (5). The unlock list is fetched server-side for the
    // signed-in user, so a student cannot grant themselves full credit.
    const fullCredit = weekUnlocks.some(item => item.full_credit_makeup === true);
    const maxScore = fullCredit ? 10 : 5;

    const [exemptions, dismissals, checkIns, existingMakeups, existingGrades] = await Promise.all([
      service.CheckInExemption.filter({}),
      service.CheckInDismissal.filter({ student_id: user.id }),
      service.WeeklyCheckIn.filter({ created_by_id: user.id }),
      service.CheckInMakeup.filter({ student_id: user.id, week_ending: week }),
      service.AssignmentGrade.filter({ student_id: user.id, assignment_id: `weekly-${week}` })
    ]);
    if (exemptions.some(item => weekEndingFriday(item.week_ending) === week)) return Response.json({ error: 'This week is exempt from check-ins.' }, { status: 400 });
    if (dismissals.some(item => weekEndingFriday(item.week_ending) === week)) return Response.json({ error: 'This week is dismissed for you.' }, { status: 400 });
    const hasCheckIn = checkIns.some(item => item.approval_status !== 'rejected' && !['duplicate', 'extra'].includes(item.grade_status) && normalizedWeek(item) === week);
    if (hasCheckIn) return Response.json({ error: 'You already have a check-in for this week.' }, { status: 400 });

    const tutorialText = format === 'written'
      ? String(written_steps)
      : `Video link: ${video_url}\nWhat the video teaches, step by step: ${video_description || ''}`;

    const scoringGuide = fullCredit
      ? `10 — Clear, real step-by-step teaching; each step makes sense and a 4th grader could follow it.
8 — Real steps, but one or two are unclear or out of order.
6 — Teaches something, but the steps are vague or incomplete.
3 — Mostly a summary; few real steps.
1 — Barely any real teaching.
0 — Blank, gibberish, or no real attempt.`
      : `5 — Clear, real step-by-step teaching; each step makes sense and a 4th grader could follow it.
4 — Real steps, but one or two are unclear or out of order.
3 — Teaches something, but the steps are vague or incomplete.
2 — Mostly a summary; few real steps.
1 — Barely any real teaching.
0 — Blank, gibberish, or no real attempt.`;

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are grading a student's step-by-step tutorial that teaches a skill or technology they used during a missed week of class. Use a very lenient 4th-grade reading and writing bar: short sentences, simple grammar, and typos are completely fine. Grade ONLY whether the student genuinely teaches a real skill step by step — never penalize spelling or polish.

Skill being taught: ${skill_title}
Format: ${format}
Tutorial content:
"""
${tutorialText}
"""

Scoring guide:
${scoringGuide}

Return JSON with a whole-number score from 0 to ${maxScore} and one short sentence of feedback a 4th grader can understand.`,
      response_json_schema: { type: 'object', properties: { score: { type: 'number' }, feedback: { type: 'string' } }, required: ['score', 'feedback'] }
    });

    const aiScore = Math.max(0, Math.min(maxScore, Math.round(Number(llm?.score ?? 0))));
    const aiFeedback = String(llm?.feedback || '').slice(0, 400);
    const nowIso = new Date().toISOString();
    const status = aiScore > 0 ? 'graded' : 'returned';
    const makeupNote = fullCredit ? FULL_CREDIT_MAKEUP_NOTE_PREFIX : MAKEUP_NOTE_PREFIX;
    let makeupId = existingMakeups[0]?.id;

    const makeupData = {
      student_id: user.id,
      week_ending: week,
      skill_title: String(skill_title).slice(0, 200),
      format,
      written_steps: format === 'written' ? String(written_steps).slice(0, 8000) : '',
      video_url: format === 'video' ? String(video_url).slice(0, 500) : '',
      video_description: format === 'video' ? String(video_description || '').slice(0, 2000) : '',
      ai_score: aiScore,
      ai_feedback: aiFeedback,
      graded_at: nowIso,
      status
    };

    if (makeupId) await service.CheckInMakeup.update(makeupId, makeupData);
    else { const created = await service.CheckInMakeup.create(makeupData); makeupId = created.id; }

    // A score of 0 returns the makeup for revision and removes any prior grade so the week
    // shows Missing again; any score above 0 is recorded as the makeup override.
    const weeklyAssignmentId = `weekly-${week}`;
    const priorMakeupGrade = existingGrades.find(item => item.assignment_id === weeklyAssignmentId && (String(item.teacher_note || '').startsWith(MAKEUP_NOTE_PREFIX) || String(item.teacher_note || '').startsWith(FULL_CREDIT_MAKEUP_NOTE_PREFIX)));
    if (aiScore > 0) {
      const gradeData = { assignment_id: weeklyAssignmentId, student_id: user.id, points: aiScore, auto_points: aiScore, status: 'graded', teacher_note: makeupNote };
      const existing = existingGrades.find(item => item.assignment_id === weeklyAssignmentId);
      if (existing) await service.AssignmentGrade.update(existing.id, gradeData);
      else await service.AssignmentGrade.create(gradeData);
    } else if (priorMakeupGrade) {
      await service.AssignmentGrade.delete(priorMakeupGrade.id);
    }

    return Response.json({ makeupId, week_ending: week, ai_score: aiScore, max_points: maxScore, ai_feedback: aiFeedback, status });
  } catch (error) {
    return Response.json({ error: error.message || 'Makeup tutorial could not be graded.' }, { status: 500 });
  }
}