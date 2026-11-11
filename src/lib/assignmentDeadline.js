import { addInstructionDays, nextInstructionDates } from '@/lib/schoolCalendar';
import { isPeriodHoliday } from '@/lib/periodHolidays';

export function isAssignmentAbsenceExempt(dueValue, student) {
  const dueDate = String(dueValue || '').slice(0, 10);
  return Boolean(dueDate && (student?.absence_deadline_adjustments || []).some(item => Number(item.days) >= 4 && nextInstructionDates(item.start_date, Number(item.days)).includes(dueDate)));
}

export function adjustedAssignmentDueDate(dueValue, student) {
  if (!dueValue) return '';
  const originalDate = String(dueValue).slice(0, 10);
  const enabled = student?.modifications?.includes('assignment_deadline_extension');
  const extensionDays = enabled ? Number(student.assignment_deadline_extension_days) || 0 : 0;
  let result = extensionDays > 0 ? addInstructionDays(originalDate, extensionDays) : originalDate;
  const absentDates = new Set((student?.absence_deadline_adjustments || []).flatMap(item => nextInstructionDates(item.start_date, Number(item.days) || 0)));
  while (absentDates.has(result) || isPeriodHoliday(result, student?.class_period)) result = addInstructionDays(result, 1);
  return result === originalDate ? dueValue : result;
}