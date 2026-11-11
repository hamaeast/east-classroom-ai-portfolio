import { fridaysBetween, isEnrollmentWeekCheckIn, weekEndingFriday } from '@/lib/checkinWeeks';
import { normalizedCheckInWeekEnding } from '@/lib/gradebook';
import { releasedFriday } from '@/lib/checkInRules';
import { hasFullCreditOverride } from '@/lib/gradeOverrides';
import { hasMakeupGrade } from '@/lib/checkInMakeup';
import { isCurrentNineWeeksDate } from '@/lib/gradingPeriods';

export function missingCheckInWeeks(student, checkIns, exemptions, dismissals, now = new Date(), grades = []) {
  if (!student?.created_date) return [];
  const dueWeeks = fridaysBetween(new Date(student.created_date), new Date(`${releasedFriday(now)}T12:00:00`));
  const fulfilled = new Set(checkIns.filter(item => item.created_by_id === student.id && item.approval_status !== 'rejected' && !['duplicate', 'extra'].includes(item.grade_status)).map(normalizedCheckInWeekEnding));
  const exempt = new Set(exemptions.map(item => weekEndingFriday(item.week_ending)));
  const dismissed = new Set(dismissals.filter(item => item.student_id === student.id).map(item => weekEndingFriday(item.week_ending)));
  return dueWeeks.filter(week => isCurrentNineWeeksDate(week) && !isEnrollmentWeekCheckIn(student, week) && !fulfilled.has(week) && !exempt.has(week) && !dismissed.has(week) && !hasFullCreditOverride(grades, student.id, `weekly-${week}`) && !hasMakeupGrade(grades, student.id, `weekly-${week}`));
}