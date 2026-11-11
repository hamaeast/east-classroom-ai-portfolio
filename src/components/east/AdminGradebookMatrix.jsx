import GradePeriodTable from './GradePeriodTable';
import { gradeColumns } from '@/lib/gradebookReports';

export default function AdminGradebookMatrix({ assignments, grades, weeklyRows, students, weekDates, segment, period, sortMode, reloadGrades, reloadCheckIns }) {
  const columns = gradeColumns(assignments, weeklyRows, segment, weekDates);
  if (!columns.length) return <div className="glass-panel mb-6 p-8 text-center text-sm text-muted-foreground">No assignments are in Nine Weeks {segment} yet.</div>;
  return <div className="mb-6"><GradePeriodTable period={period} students={students} columns={columns} weeklyRows={weeklyRows} grades={grades} sortMode={sortMode} reloadGrades={reloadGrades} reloadCheckIns={reloadCheckIns} /></div>;
}