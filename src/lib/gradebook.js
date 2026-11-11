import { weekEndingFriday } from '@/lib/checkinWeeks';
import { assignmentDaysBetween } from '@/lib/assignmentClock';
import { adjustedAssignmentDueDate } from '@/lib/assignmentDeadline';
import { CHECK_IN_RULES_START, isExtraCheckIn, SHORT_WEEK_ENDING, SHORT_WEEK_SUBMISSION_DATES } from '@/lib/checkInRules';

function chicagoDateText(value) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const part = type => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function normalizedCheckInWeekEnding(checkIn) {
  const submittedDate = chicagoDateText(checkIn.original_submitted_at || checkIn.created_date);
  const selectedWeek = weekEndingFriday(checkIn.week_ending);
  const submittedWeek = submittedDate ? weekEndingFriday(submittedDate) : '';
  if (selectedWeek >= '2026-09-04') return selectedWeek;
  return selectedWeek && submittedWeek && selectedWeek > submittedWeek ? submittedWeek : selectedWeek;
}

function checkInTiming(checkIn, student) {
  const submittedDate = chicagoDateText(checkIn.original_submitted_at || checkIn.created_date);
  const weekEnding = normalizedCheckInWeekEnding(checkIn);
  const adjustedDueDate = String(adjustedAssignmentDueDate(weekEnding, student) || '').slice(0, 10);
  if (!submittedDate || !weekEnding || !adjustedDueDate) return null;
  return { submittedDate, weekEnding, adjustedDueDate, daysAfterDue: assignmentDaysBetween(adjustedDueDate, submittedDate) };
}

export function isCheckInGradeEligible(checkIn, student) {
  const timing = checkInTiming(checkIn, student);
  if (!timing) return false;
  if (timing.weekEnding === SHORT_WEEK_ENDING && SHORT_WEEK_SUBMISSION_DATES.includes(timing.submittedDate)) return true;
  const submittedDay = new Date(`${timing.submittedDate}T12:00:00Z`).getUTCDay();
  const regularWindow = [4, 5].includes(submittedDay) && (timing.submittedDate < CHECK_IN_RULES_START || (timing.submittedDate <= timing.weekEnding && timing.weekEnding <= timing.adjustedDueDate));
  const adjustedWindow = timing.adjustedDueDate > timing.weekEnding && timing.submittedDate > timing.weekEnding && timing.daysAfterDue <= 0;
  const pausedWindow = timing.submittedDate > timing.adjustedDueDate && timing.daysAfterDue <= 0;
  return regularWindow || adjustedWindow || pausedWindow;
}

export const isOnTimeCheckIn = isCheckInGradeEligible;

export function suggestedCheckInPoints(checkIn, student) {
  const timing = checkInTiming(checkIn, student);
  if (!timing) return 10;
  const submittedDay = new Date(`${timing.submittedDate}T12:00:00Z`).getUTCDay();
  if (timing.submittedDate < CHECK_IN_RULES_START && [4, 5].includes(submittedDay)) return 10;
  if (timing.daysAfterDue <= 0) return 10;
  return timing.daysAfterDue <= 3 ? 9 : 8;
}

export function isLateGraceWindowCheckIn(checkIn, student) {
  return suggestedCheckInPoints(checkIn, student) === 9;
}

export const isMondayAfterDueCheckIn = isLateGraceWindowCheckIn;

function submittedDateLabel(checkIn) {
  const value = checkIn.original_submitted_at || checkIn.created_date;
  if (!value) return 'Submission date unavailable';
  return `Submitted ${new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value))}`;
}

export function buildWeeklyGrades(checkIns, users) {
  const byStudentWeek = new Map();
  checkIns.forEach(item => {
    if (!item.created_by_id || !item.week_ending || item.approval_status === 'rejected' || item.grade_status === 'duplicate' || isExtraCheckIn(item)) return;
    const gradeWeekEnding = normalizedCheckInWeekEnding(item);
    const creditedStudentIds = [...new Set([item.created_by_id, ...(item.member_ids || [])])]
      .filter(studentId => users.some(user => user.id === studentId));
    creditedStudentIds.forEach(studentId => {
      const key = `${studentId}:${gradeWeekEnding}`;
      byStudentWeek.set(key, [...(byStudentWeek.get(key) || []), item]);
    });
  });
  return [...byStudentWeek.entries()].map(([key, submissions]) => {
    const [studentId, weekEnding] = key.split(':');
    const student = users.find(u => u.id === studentId);
    const reviewed = submissions.find(x => x.grade != null && (x.grade_status === 'reviewed' || !x.grade_status));
    const flagged = submissions.find(x => x.ai_review_flag);
    const autoGraded = submissions.find(x => x.grade != null && x.grade_status === 'auto');
    const onTime = submissions.find(x => !x.grade_status && isOnTimeCheckIn(x, student));
    const awaitingReview = submissions.find(x => x.grade_status === 'pending_review' && x.approval_status !== 'rejected');
    const source = reviewed || autoGraded || onTime || awaitingReview || flagged || submissions[0];
    const late = suggestedCheckInPoints(source, student) < 10;
    if (!reviewed && !autoGraded && !onTime && !late && !awaitingReview) return null;
    const pending = !reviewed && !autoGraded && !onTime && (late || !!awaitingReview);
    return {
      key, studentId, weekEnding, source,
      studentName: student?.full_name || source.student_names || 'Student',
      points: reviewed ? Math.min(Number(reviewed.grade), 10) : autoGraded ? Math.min(Number(autoGraded.grade), 10) : onTime ? 10 : null,
      suggestedPoints: suggestedCheckInPoints(source, student),
      status: pending ? 'pending_review' : reviewed ? 'reviewed' : 'auto',
      reviewReason: flagged ? 'Flagged for manual review' : submittedDateLabel(source)
    };
  }).filter(Boolean).sort((a, b) => b.weekEnding.localeCompare(a.weekEnding) || a.studentName.localeCompare(b.studentName));
}