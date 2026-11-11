import { gradeColumns, gradeRecord, sortGradeSummaries, studentSummary } from './gradebookReports';

const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
export const GRADE_LEVELS = [7, 8, 9];

export function periodCsv({ period, segment, assignments, grades, weeklyRows, students, sortMode = 'alpha', band }) {
  const columns = gradeColumns(assignments, weeklyRows, segment);
  let rows = students.filter(student => Number(student.class_period) === period).map(student => studentSummary(student, columns, weeklyRows, grades));
  if (band) rows = rows.filter(row => band.includes(row.percent));
  sortGradeSummaries(rows, sortMode);
  const header = ['Student ID', 'Full Name', 'Period', ...columns.map(column => column.label), 'Total Earned', 'Total Possible', 'Grade Percent'];
  const body = rows.map(row => [row.student.student_id, row.student.full_name, period, ...row.cells.map(cell => cell.excused || !cell.required ? '' : cell.pending ? 'Pending' : cell.points), row.earned, row.possible, `${row.percent}%`]);
  return [header, ...body].map(line => line.map(quote).join(',')).join('\n');
}

export function assignmentCsv({ period, gradeLevel, column, grades, weeklyRows, students }) {
  const rows = students.filter(student => Number(student.class_period) === period && (gradeLevel == null || Number(student.grade) === gradeLevel)).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  const body = rows.map(student => ({ student, result: gradeRecord(column, student, weeklyRows, grades) }))
    .filter(row => !row.result.pending && !row.result.excused && row.result.required)
    .map(row => `${String(row.student.student_id).trim()},${Number(row.result.points)}`);
  return ['StudentID,Score', ...body].join('\r\n');
}

export function downloadCsv(filename, content) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}