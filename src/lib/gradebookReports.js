import { isInNineWeeks, isAssignmentClosed, currentNineWeeks } from './gradingPeriods';
import { isFullSchoolWeekClosed } from './schoolCalendar';
import { chicagoToday, chicagoEndOfDay, suggestedGoalDue, suggestedReflectionDue } from './weeklyGoals';
import { adjustedAssignmentDueDate, isAssignmentAbsenceExempt } from './assignmentDeadline';
import { isEnrollmentWeekCheckIn, weekEndingFriday } from './checkinWeeks';
import { hasFullCreditOverride } from './gradeOverrides';
import { isMakeupGrade } from './checkInMakeup';

function chicagoTomorrow() {
  const date = new Date(`${chicagoToday()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function gradeColumns(assignments, weeklyRows, segment, weekDates) {
  const dates = [...new Set((weekDates || []).map(weekEndingFriday))].filter(date => date && date <= chicagoTomorrow() && isInNineWeeks(date, segment) && !isFullSchoolWeekClosed(date)).sort();
  const weekly = dates.map(weekEnding => ({ key: `weekly-${weekEnding}`, type: 'weekly', gradingPeriod: Number(segment), weekEnding, eventDate: weekEnding, label: `Check-in ${weekEnding}`, max: 10, active: true, countsTowardTotal: weekEnding < chicagoToday() }));
  const goalWeek = item => ['Weekly Goal —', 'Goal Reflection —', 'Weekly Goal & Reflection —'].some(prefix => item.title.startsWith(prefix)) ? item.title.split(' — ')[1] : '';
  const combinedGoalWeeks = new Set(assignments.filter(item => item.title.startsWith('Weekly Goal & Reflection —')).map(goalWeek));
  const effectiveAssignments = assignments.filter(item => !(combinedGoalWeeks.has(goalWeek(item)) && (item.title.startsWith('Weekly Goal —') || item.title.startsWith('Goal Reflection —'))));
  const disabledGoalWeeks = new Set(effectiveAssignments.filter(item => item.is_active === false && goalWeek(item)).map(goalWeek));
  const isGoalReflection = item => ['Weekly Goal —', 'Goal Reflection —', 'Weekly Goal & Reflection —'].some(prefix => item.title.startsWith(prefix));
  const inSegment = (item) => isGoalReflection(item) ? isInNineWeeks(String(item.due_date || '').slice(0, 10), segment) : Number(item.grading_period || 1) === segment;
  const custom = effectiveAssignments.filter(item => {
    const disabledGoalWeek = disabledGoalWeeks.has(goalWeek(item));
    const standardsEnabled = !/^Student Standards\b/.test(item.title) || item.is_active === true;
    return standardsEnabled && !disabledGoalWeek && inSegment(item) && !isFullSchoolWeekClosed(goalWeek(item)) && !isFullSchoolWeekClosed(item.due_date);
  }).map(item => ({ key: `assignment-${item.id}`, type: 'custom', gradingPeriod: Number(item.grading_period || segment), id: item.id, standards: /^Student Standards\b/.test(item.title), live: item.assignment_type === 'project_work', locked: isAssignmentClosed(item), eventDate: goalWeek(item) || item.due_date || item.created_date?.slice(0, 10), dueDate: item.due_date, dueTime: item.due_time || '23:59', label: (item.is_active ? item.title : `${item.title} (Off)`) + (item.frozen_at ? ` · frozen ${new Date(item.frozen_at).toLocaleDateString()}` : ''), max: Number(item.max_points), active: item.is_active !== false, countsTowardTotal: !item.title.startsWith('Goal Reflection —') || !item.due_date || item.due_date <= chicagoToday() }));
  return [...weekly, ...custom].sort((a, b) => String(a.eventDate || '').localeCompare(String(b.eventDate || '')) || a.label.localeCompare(b.label));
}

function recordedGrade(column, student, weeklyRows, grades) {
  const gradeFor = assignmentId => {
    const matches = grades.filter(item => item.assignment_id === assignmentId && item.student_id === student.id);
    return matches.find(item => hasFullCreditOverride([item], student.id, assignmentId, column.max)) || matches.find(item => isMakeupGrade(item)) || matches[0];
  };
  const joinedDate = student.created_date?.slice(0, 10);
  const predatesEnrollment = joinedDate && column.eventDate && column.eventDate < joinedDate;
  const enrollmentWeekExempt = column.type === 'weekly' && isEnrollmentWeekCheckIn(student, column.weekEnding);
  const completedBeforeEnrollment = column.type === 'weekly'
    ? weeklyRows.some(item => item.studentId === student.id && item.weekEnding === column.weekEnding)
    : grades.some(item => item.assignment_id === column.id && item.student_id === student.id && !item.excused && !['Missing at the end of the accommodated due date', 'Goal reflection not submitted by the accommodated deadline'].includes(item.teacher_note));
  const manualWeekly = column.type === 'weekly' && grades.find(item => item.assignment_id === column.key && item.student_id === student.id && item.teacher_note !== 'Missing weekly check-in; student may submit to replace this zero');
  if ((predatesEnrollment || enrollmentWeekExempt) && !completedBeforeEnrollment && !manualWeekly) return { label: 'Exempt', points: 0, pending: false, required: false, enrollmentExempt: true };
  const required = column.active !== false;
  if (!required) return { label: '', points: 0, pending: false, required: false };
  if (column.type === 'custom' && isAssignmentAbsenceExempt(column.dueDate, student)) return { label: 'Exempt', points: 0, pending: false, required: false, absenceExempt: true };
  if (column.type === 'weekly') {
    const override = gradeFor(column.key);
    const row = weeklyRows.find(item => item.studentId === student.id && item.weekEnding === column.weekEnding);
    const missingPlaceholder = override?.teacher_note === 'Missing weekly check-in; student may submit to replace this zero';
    if (override?.excused) return { label: '', points: 0, pending: false, required: false, excused: true };
    if (!row && (!override || missingPlaceholder) && column.weekEnding >= chicagoToday()) return { label: '', points: 0, pending: false, required: false };
    if (override && !missingPlaceholder) return { label: `${override.points}/${column.max}`, points: Number(override.points || 0), pending: override.status === 'pending_review', required: true, makeup: isMakeupGrade(override) };
    return row?.status === 'pending_review' ? { label: 'Pending', points: 0, pending: true, required: true } : { label: row ? `${Math.min(Number(row.points || 0), 10)}/10` : 'Missing', points: Math.min(Number(row?.points || 0), 10), required: true };
  }
  const grade = gradeFor(column.id);
  if (grade?.excused) return { label: '', points: 0, pending: false, required: false, excused: true };
  const dueDate = adjustedAssignmentDueDate(column.dueDate, student);
  const automatedZero = grade?.teacher_note === 'Missing at the end of the accommodated due date';
  const reflectionMissing = grade?.teacher_note === 'Goal reflection not submitted by the accommodated deadline';
  // Standards are teacher-issued reports, never a student turn-in requirement.
  if (column.standards && (!grade || automatedZero || reflectionMissing)) return { label: 'Not graded', points: 0, pending: false, required: false };
  const isCombinedGoal = column.label.startsWith('Weekly Goal & Reflection —');
  if (isCombinedGoal) {
    const now = new Date();
    const points = Number(grade?.points || 0);
    if (!grade && now <= new Date(suggestedGoalDue(column.eventDate))) return { label: '', points: 0, pending: false, required: false };
    if (!grade || points === 0) return { label: 'Missing', points: 0, pending: false, required: true, awaitingDeadline: true };
    if (reflectionMissing && now > new Date(suggestedReflectionDue(column.eventDate))) return { label: `${points}/${column.max}`, points, pending: false, required: true, reflectionMissing: true };
    return { label: `${points}/${column.max}`, points, pending: grade.status === 'pending_review', required: true, reflectionMissing };
  }
  if (dueDate && String(dueDate).slice(0, 10) > chicagoToday() && (!grade || automatedZero)) return { label: 'Missing', points: 0, pending: false, required: true, awaitingDeadline: true };
  if (!grade || automatedZero) return { label: 'Missing', points: 0, pending: false, required: true, awaitingDeadline: true };
  return { label: `${grade.points}/${column.max}`, points: Number(grade.points || 0), pending: grade.status === 'pending_review', required: true, reflectionMissing };
}

export function gradeRecord(column, student, weeklyRows, grades) {
  const cell = recordedGrade(column, student, weeklyRows, grades);
  if (column.gradingPeriod === currentNineWeeks()?.number && !column.locked) return cell;
  // Historical scores still count in their own period, but are not current missing work.
  return { ...cell, label: cell.label === 'Missing' ? `${cell.points}/${column.max}` : cell.label, awaitingDeadline: false };
}

export function columnCountsTowardTotal(column, student, cell) {
  // Count completed check-ins immediately; only unsubmitted work waits for Friday's deadline.
  if (column.type === 'weekly') return column.countsTowardTotal !== false || Boolean(cell?.required && !cell.pending && cell.label && cell.label !== 'Missing');
  if (column.live || column.type !== 'custom' || column.label.startsWith('Weekly Goal & Reflection —')) return true;
  const dueDate = adjustedAssignmentDueDate(column.dueDate, student);
  return !dueDate || String(dueDate).slice(0, 10) <= chicagoToday();
}

export function columnPossiblePoints(column, student, cell) {
  if (!cell.required || (cell.pending && column.type !== 'weekly') || !columnCountsTowardTotal(column, student, cell)) return 0;
  if (column.label.startsWith('Weekly Goal & Reflection —')) {
    const reflectionDue = adjustedAssignmentDueDate(column.dueDate || suggestedReflectionDue(column.eventDate), student);
    const deadline = reflectionDue?.includes('T') ? reflectionDue : reflectionDue ? chicagoEndOfDay(reflectionDue) : null;
    const reflectionPastDue = deadline && Date.now() > new Date(deadline).getTime();
    return cell.points > 5 || cell.reflectionMissing || reflectionPastDue ? column.max : Math.min(5, column.max);
  }
  return column.max;
}

export function studentSummary(student, columns, weeklyRows, grades) {
  const cells = columns.map(column => gradeRecord(column, student, weeklyRows, grades));
  const earned = cells.reduce((sum, cell, index) => sum + (columnCountsTowardTotal(columns[index], student, cell) && !cell.pending ? cell.points : 0), 0);
  const possible = columns.reduce((sum, column, index) => sum + columnPossiblePoints(column, student, cells[index]), 0);
  return { student, cells, earned, possible, percent: possible ? Math.round((earned / possible) * 100) : 0 };
}

function compareStudentsByLastName(a, b) {
  const name = student => student.display_name || student.full_name || student.email || '';
  const parts = student => name(student).trim().split(/\s+/);
  const lastName = student => parts(student).at(-1) || '';
  return lastName(a).localeCompare(lastName(b)) || name(a).localeCompare(name(b));
}

export function sortGradeSummaries(rows, mode) {
  if (mode === 'high') return rows.sort((a, b) => b.percent - a.percent || compareStudentsByLastName(a.student, b.student));
  if (mode === 'low') return rows.sort((a, b) => a.percent - b.percent || compareStudentsByLastName(a.student, b.student));
  return rows.sort((a, b) => compareStudentsByLastName(a.student, b.student));
}