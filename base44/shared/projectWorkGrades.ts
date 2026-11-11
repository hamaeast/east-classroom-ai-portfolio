import { chicagoToday, nineWeeksForDate } from './gradingPeriods.ts';
import { isFullSchoolWeekClosed } from './schoolDeadline.ts';

export function projectWorkMonday(date = new Date()) {
  const today = chicagoToday(date);
  const monday = new Date(`${today}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export async function syncProjectWorkGrades(base44, studentIds = []) {
  const week = projectWorkMonday();
  const period = nineWeeksForDate(chicagoToday());
  if (!period || isFullSchoolWeekClosed(week)) return { skipped: true, reason: 'No instructional week' };
  const sunday = new Date(`${week}T12:00:00Z`);
  sunday.setUTCDate(sunday.getUTCDate() - 1);
  const weeks = [week, sunday.toISOString().slice(0, 10)];
  const year = `${Number(week.slice(5, 7)) >= 8 ? Number(week.slice(0, 4)) : Number(week.slice(0, 4)) - 1}`;
  const record = { title: `Project Work — ${week}`, description: 'Starts at 5 points each Monday. Each off-task mark deducts one point, to a minimum of zero. This grade updates live; no submission is needed.', grading_rubric: '5 starting points minus one point per off-task incident; minimum 0/5.', max_points: 5, due_date: week, due_time: '23:59', school_year: `${year}–${String(Number(year) + 1).slice(-2)}`, grading_period: period.number, assignment_type: 'project_work', is_active: true };
  await base44.asServiceRole.entities.Assignment.upsert([record], { key: ['title', 'school_year'] });
  const { items: assignments } = await base44.asServiceRole.entities.Assignment.filter({ title: record.title, school_year: record.school_year }, { limit: 1 });
  const assignment = assignments[0];
  const query = { role: 'user', is_archived: { $ne: true }, ...(studentIds.length ? { id: { $in: studentIds } } : {}) };
  const incidents = await base44.asServiceRole.entities.ProjectWorkIncident.aggregate({ query: { week_start: { $in: weeks }, ...(studentIds.length ? { student_id: { $in: studentIds } } : {}) }, groupBy: 'student_id' });
  if (incidents.truncated) throw new Error('Too many incident groups to calculate safely.');
  const deductions = new Map(incidents.rows.map(row => [row.student_id, row.count]));
  let offset = 0, students, updated = 0;
  do {
    students = await base44.asServiceRole.entities.User.filter(query, 'created_date', 100, offset);
    const grades = students.map(student => ({ assignment_id: assignment.id, student_id: student.id, points: Math.max(0, 5 - (deductions.get(student.id) || 0)), auto_points: Math.max(0, 5 - (deductions.get(student.id) || 0)), status: 'graded', is_late: false, excused: false, teacher_note: 'Live Project Work score from off-task incidents' }));
    if (grades.length) await base44.asServiceRole.entities.AssignmentGrade.upsert(grades, { key: ['assignment_id', 'student_id'] });
    updated += grades.length;
    offset += students.length;
  } while (students.length === 100);
  return { assignmentId: assignment.id, week_start: week, studentsUpdated: updated };
}