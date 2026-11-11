import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { assignmentCsv, downloadCsv } from '@/lib/gradebookCsv';
import { buildWeeklyGrades } from '@/lib/gradebook';
import { gradeColumns } from '@/lib/gradebookReports';
import { weekEndingFriday } from '@/lib/checkinWeeks';
import { showSubmissionRequirements } from '@/lib/submissionRequirements';
import fetchAllEntityPages from '@/lib/fetchAllEntityPages';
import { fetchEntityList } from '@/hooks/useEntityList';

export default function GradeExportButtons({ period, segment, assignments, grades, weeklyRows, students, weekDates, dismissals = [] }) {
  const columns = gradeColumns(assignments, weeklyRows, segment, weekDates);
  const [assignmentKey, setAssignmentKey] = useState('');
  const [exporting, setExporting] = useState(false);
  const selected = columns.find(column => column.key === assignmentKey) || columns[0];
  const safeName = (selected?.label || 'assignment').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  const content = (currentColumn, currentStudents, currentGrades, currentWeeklyRows) => assignmentCsv({ period, column: currentColumn, grades: currentGrades, weeklyRows: currentWeeklyRows, students: currentStudents });
  const exportFolder = async () => {
    setExporting(true);
    try {
      const [allUsers, currentAssignments, currentGrades, currentCheckIns] = await Promise.all([
        fetchEntityList('User', '-created_date'),
        fetchAllEntityPages(base44.entities.Assignment),
        fetchAllEntityPages(base44.entities.AssignmentGrade, { student_id: { $in: students.filter(student => Number(student.class_period) === Number(period)).map(student => student.id) } }),
        fetchAllEntityPages(base44.entities.WeeklyCheckIn),
      ]);
      const currentStudents = allUsers.filter(student => student.role !== 'admin' && !student.is_archived);
      const currentWeeklyRows = buildWeeklyGrades(currentCheckIns, allUsers);
      const visibleAssignmentIds = new Set(assignments.map(assignment => assignment.id));
      const currentColumns = gradeColumns(currentAssignments.filter(assignment => visibleAssignmentIds.has(assignment.id)), currentWeeklyRows, segment, weekDates);
      const currentSelected = currentColumns.find(column => column.key === selected.key) || selected;
      const missing = currentStudents.filter(student => Number(student.class_period) === period && !student.student_id);
      if (missing.length) { showSubmissionRequirements(`Add an eSchoolPLUS Student ID for: ${missing.map(student => student.full_name || student.email).join(', ')}`); return; }
      const invalid = currentStudents.filter(student => Number(student.class_period) === period && /[,\r\n]/.test(String(student.student_id || '')));
      if (invalid.length) { showSubmissionRequirements(`Correct Student IDs containing commas or line breaks for: ${invalid.map(student => student.full_name || student.email).join(', ')}`); return; }
      downloadCsv(`period-${period}-${safeName}.csv`, content(currentSelected, currentStudents, [...currentGrades, ...dismissals.map(item => ({ assignment_id: `weekly-${weekEndingFriday(item.week_ending)}`, student_id: item.student_id, excused: true }))], currentWeeklyRows));
    } finally { setExporting(false); }
  };
  if (!columns.length) return null;
  return <div className="glass-panel mb-6 flex flex-wrap items-end gap-3 p-4"><label className="east-label flex-1">Assignment to export<select value={selected.key} onChange={event => setAssignmentKey(event.target.value)} className="mt-1">{columns.map(column => <option key={column.key} value={column.key}>{column.label}</option>) }</select></label><button disabled={exporting} onClick={exportFolder} className="east-button">{exporting ? 'Downloading CSV…' : `Export Period ${period} for TAC`}</button><p className="w-full text-xs text-muted-foreground">Creates one combined CSV for Period {period}. In TAC, set the Student ID CSV field to 1 and the Score CSV field to 2, then check File has Header Row.</p></div>;
}