import { adjustedAssignmentDueDate } from './assignmentDeadline';

import { addAssignmentDays } from '@/lib/assignmentClock';

export function chicagoToday() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function checkInSubmissionCutoff(weekEnding, student) {
  const adjustedDeadline = String(adjustedAssignmentDueDate(weekEnding, student) || '').slice(0, 10);
  return adjustedDeadline ? { adjustedDeadline, cutoff: addAssignmentDays(adjustedDeadline, 14) } : { adjustedDeadline: '', cutoff: '' };
}

export function isCheckInSubmissionClosed(weekEnding, student) {
  const { cutoff } = checkInSubmissionCutoff(weekEnding, student);
  return Boolean(cutoff && chicagoToday() > cutoff);
}