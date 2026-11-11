// Check-in grading rules shared by backend functions. Mirrors src/lib/gradebook.js,
// src/lib/checkInReminder.js, src/lib/checkinWeeks.js, src/lib/checkInRules.js and the
// submission helpers in src/pages/CheckIns.jsx. The server is the only writer.

import { addDays, adjustedAssignmentDueDate, chicagoStamp, chicagoToday } from './deadlines.ts';
import { addAssignmentDays, assignmentDaysBetween, isFullSchoolWeekClosed } from './schoolDeadline.ts';
import { NINE_WEEK_PERIODS } from './gradingPeriods.ts';

export const CHECK_IN_RULES_START = '2026-09-23';
export const SHORT_WEEK_ENDING = '2026-10-09';
export const SHORT_WEEK_SUBMISSION_DATES = ['2026-10-07', '2026-10-08'];
export const MAKEUP_NOTE_PREFIX = 'Check-in makeup tutorial — half credit, AI-graded';
export const FULL_CREDIT_MAKEUP_NOTE_PREFIX = 'Check-in makeup tutorial — full credit, AI-graded';

export function weekEndingFriday(dateText: string): string {
  if (!dateText) return '';
  const [year, month, day] = String(dateText).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + ((5 - date.getUTCDay() + 7) % 7));
  return date.toISOString().slice(0, 10);
}

export function fridaysBetween(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate.getTime());
  if (cursor > endDate) return dates;
  while (cursor.getUTCDay() !== 5) cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor <= endDate) {
    const dateText = cursor.toISOString().slice(0, 10);
    if (!isFullSchoolWeekClosed(dateText)) dates.push(dateText);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return dates;
}

export function isEnrollmentWeekCheckIn(student: any, weekEnding: string): boolean {
  return Boolean(student?.created_date && weekEnding && weekEndingFriday(student.created_date) === weekEnding);
}

export function releasedFriday(now: Date = new Date()): string {
  const { date, weekday } = chicagoStamp(now);
  const friday = weekEndingFriday(date);
  if (['Mon', 'Tue', 'Wed'].includes(weekday) && !(friday === SHORT_WEEK_ENDING && date >= SHORT_WEEK_SUBMISSION_DATES[0])) {
    return addDays(friday, -7);
  }
  return friday;
}

export function isUnreleasedCheckIn(week: string, now: Date = new Date()): boolean {
  const { date, weekday } = chicagoStamp(now);
  if (week === SHORT_WEEK_ENDING && SHORT_WEEK_SUBMISSION_DATES.includes(date)) return false;
  return date >= CHECK_IN_RULES_START && ['Mon', 'Tue', 'Wed'].includes(weekday) && week === weekEndingFriday(date) && !isFullSchoolWeekClosed(week);
}

// The Friday that governs the week we are in (today's Friday, or yesterday if it is Saturday).
export function currentDueFriday(now: Date = new Date()): string {
  const { date, weekday } = chicagoStamp(now);
  const index = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  return addDays(date, index <= 5 ? 5 - index : -1);
}

export function submissionStatus(weekEnding: string, now: Date = new Date()) {
  if (!weekEnding) return { isBackdated: false };
  const { date } = chicagoStamp(now);
  const due = currentDueFriday(now);
  const selectedWeek = weekEndingFriday(weekEnding);
  if (selectedWeek >= date) return { isBackdated: false };
  if (selectedWeek < due) return { isBackdated: true };
  return { isBackdated: false };
}

export function chicagoDate(value: any): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return chicagoToday(parsed);
}

export function normalizedCheckInWeekEnding(checkIn: any): string {
  const submittedDate = chicagoDate(checkIn?.original_submitted_at || checkIn?.created_date);
  const selectedWeek = weekEndingFriday(checkIn?.week_ending);
  const submittedWeek = submittedDate ? weekEndingFriday(submittedDate) : '';
  if (selectedWeek >= '2026-09-04') return selectedWeek;
  return selectedWeek && submittedWeek && selectedWeek > submittedWeek ? submittedWeek : selectedWeek;
}

function checkInTiming(checkIn: any, student: any) {
  const submittedDate = chicagoDate(checkIn?.original_submitted_at || checkIn?.created_date);
  const weekEnding = normalizedCheckInWeekEnding(checkIn);
  const adjustedDueDate = String(adjustedAssignmentDueDate(weekEnding, student) || '').slice(0, 10);
  if (!submittedDate || !weekEnding || !adjustedDueDate) return null;
  return { submittedDate, weekEnding, adjustedDueDate, daysAfterDue: assignmentDaysBetween(adjustedDueDate, submittedDate) };
}

export function isCheckInGradeEligible(checkIn: any, student: any): boolean {
  const timing = checkInTiming(checkIn, student);
  if (!timing) return false;
  if (timing.weekEnding === SHORT_WEEK_ENDING && SHORT_WEEK_SUBMISSION_DATES.includes(timing.submittedDate)) return true;
  const submittedDay = new Date(`${timing.submittedDate}T12:00:00Z`).getUTCDay();
  const regularWindow = [4, 5].includes(submittedDay) && (timing.submittedDate < CHECK_IN_RULES_START || (timing.submittedDate <= timing.weekEnding && timing.weekEnding <= timing.adjustedDueDate));
  const adjustedWindow = timing.adjustedDueDate > timing.weekEnding && timing.submittedDate > timing.weekEnding && timing.daysAfterDue <= 0;
  const pausedWindow = timing.submittedDate > timing.adjustedDueDate && timing.daysAfterDue <= 0;
  return regularWindow || adjustedWindow || pausedWindow;
}

export function suggestedCheckInPoints(checkIn: any, student: any): number {
  const timing = checkInTiming(checkIn, student);
  if (!timing) return 10;
  const submittedDay = new Date(`${timing.submittedDate}T12:00:00Z`).getUTCDay();
  if (timing.submittedDate < CHECK_IN_RULES_START && [4, 5].includes(submittedDay)) return 10;
  if (timing.daysAfterDue <= 0) return 10;
  return timing.daysAfterDue <= 3 ? 9 : 8;
}

export function isCheckInSubmissionClosed(weekEnding: string, student: any): boolean {
  const adjustedDeadline = String(adjustedAssignmentDueDate(weekEnding, student) || '').slice(0, 10);
  if (!adjustedDeadline) return false;
  return chicagoToday() > addAssignmentDays(adjustedDeadline, 14);
}

function currentNineWeeks(now: Date = new Date()) {
  const today = chicagoToday(now);
  return NINE_WEEK_PERIODS.find(period => today >= period.start && today <= period.end) || null;
}

export function isCurrentNineWeeksDate(date: any, now: Date = new Date()): boolean {
  const period = currentNineWeeks(now);
  const value = String(date || '').slice(0, 10);
  return Boolean(period && value && value >= period.start && value <= period.end);
}

function hasFullCreditOverride(grades: any[], studentId: string, assignmentId: string): boolean {
  return grades.some(grade => grade.student_id === studentId
    && grade.assignment_id === assignmentId
    && grade.status === 'graded'
    && !grade.excused
    && String(grade.teacher_note || '').startsWith('Manual full-credit override for week of ')
    && Number(grade.points) >= 10);
}

function hasMakeupGrade(grades: any[], studentId: string, assignmentId: string): boolean {
  return grades.some(grade => grade.student_id === studentId
    && grade.assignment_id === assignmentId
    && grade.status === 'graded'
    && !grade.excused
    && Number(grade.points) > 0
    && (String(grade.teacher_note || '').startsWith(MAKEUP_NOTE_PREFIX) || String(grade.teacher_note || '').startsWith(FULL_CREDIT_MAKEUP_NOTE_PREFIX)));
}

export function missingCheckInWeeks(student: any, checkIns: any[], exemptions: any[], dismissals: any[], grades: any[] = [], now: Date = new Date()): string[] {
  if (!student?.created_date) return [];
  const start = new Date(student.created_date);
  const end = new Date(`${releasedFriday(now)}T12:00:00Z`);
  const dueWeeks = fridaysBetween(start, end);
  const fulfilled = new Set(checkIns
    .filter(item => item.created_by_id === student.id && item.approval_status !== 'rejected' && !['duplicate', 'extra'].includes(item.grade_status))
    .map(normalizedCheckInWeekEnding));
  const exempt = new Set((exemptions || []).map(item => weekEndingFriday(item.week_ending)));
  const dismissed = new Set((dismissals || []).filter(item => item.student_id === student.id).map(item => weekEndingFriday(item.week_ending)));
  return dueWeeks.filter(week => isCurrentNineWeeksDate(week, now)
    && !isEnrollmentWeekCheckIn(student, week)
    && !fulfilled.has(week)
    && !exempt.has(week)
    && !dismissed.has(week)
    && !hasFullCreditOverride(grades, student.id, `weekly-${week}`)
    && !hasMakeupGrade(grades, student.id, `weekly-${week}`));
}

export function isCurrentWeekDue(week: string, student: any, checkIns: any[], exemptions: any[], dismissals: any[], grades: any[], now: Date = new Date()): boolean {
  const target = weekEndingFriday(week);
  if (target !== currentDueFriday(now) || target > releasedFriday(now)) return false;
  if (isFullSchoolWeekClosed(target)) return false;
  if ((exemptions || []).some(item => weekEndingFriday(item.week_ending) === target)) return false;
  if ((dismissals || []).some(item => item.student_id === student.id && weekEndingFriday(item.week_ending) === target)) return false;
  if (isEnrollmentWeekCheckIn(student, target)) return false;
  if (checkIns.some(item => item.created_by_id === student.id && item.approval_status !== 'rejected' && !['duplicate', 'extra'].includes(item.grade_status) && normalizedCheckInWeekEnding(item) === target)) return false;
  if (grades.some(item => item.student_id === student.id && item.assignment_id === `weekly-${target}` && Number(item.points) === 10 && !item.excused)) return false;
  return true;
}