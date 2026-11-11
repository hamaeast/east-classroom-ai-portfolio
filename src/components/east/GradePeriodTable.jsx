import { sortGradeSummaries, studentSummary } from '@/lib/gradebookReports';
import EditableGradeCell from './EditableGradeCell';
import GradeColumnDueDate from './GradeColumnDueDate';

export default function GradePeriodTable({ period, students, columns, weeklyRows, grades, sortMode = 'alpha', reloadGrades, reloadCheckIns }) {
  const summaries = students.filter(student => Number(student.class_period) === period).map(student => studentSummary(student, columns, weeklyRows, grades));
  sortGradeSummaries(summaries, sortMode);
  if (!summaries.length) return null;
  return <section className="glass-panel overflow-x-auto p-3"><h3 className="mb-2 font-semibold">Period {period}</h3>
    <table className="east-table [&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-2"><thead><tr><th className="sticky left-0 z-20 min-w-40 border-r-2 border-border bg-background">Student</th>{columns.map(column => <th key={column.key}><span className="block normal-case">{column.label}</span><GradeColumnDueDate column={column} className="block text-[10px] normal-case text-muted-foreground" /><span className="text-[10px] text-muted-foreground">{column.active === false ? 'Not required' : column.countsTowardTotal === false ? 'Not in total yet' : `${column.max} pts`}</span></th>)}<th>Total</th></tr></thead><tbody>
      {summaries.map(({ student, cells, earned, possible }) => { const pending = cells.some(cell => cell.pending); return <tr key={student.id}><td className="sticky left-0 z-10 min-w-40 border-r-2 border-border bg-background font-semibold">{student.full_name}</td>{cells.map((cell, index) => <td key={columns[index].key} className={cell.pending ? 'font-semibold text-primary' : ''}><EditableGradeCell column={columns[index]} student={student} cell={cell} weeklyRows={weeklyRows} grades={grades} reloadGrades={reloadGrades} reloadCheckIns={reloadCheckIns} /></td>)}<td className="font-bold">{possible > 0 ? <>{earned}/{possible}<span className="ml-2 text-xs text-muted-foreground">({Math.round((earned / possible) * 100)}%)</span></> : <span>&nbsp;</span>}{pending && <span className="block text-xs font-medium text-primary">Review pending</span>}</td></tr>; })}
    </tbody></table>
  </section>;
}