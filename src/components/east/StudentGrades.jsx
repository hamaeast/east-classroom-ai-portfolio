import { Link } from 'react-router-dom';
import { gradeColumns, studentSummary } from '@/lib/gradebookReports';
import { isCheckInSubmissionClosed } from '@/lib/checkInDeadline';
import NineWeekToggle from './NineWeekToggle';
import GradeColumnDueDate from './GradeColumnDueDate';
import { isNineWeeksClosed } from '@/lib/gradingPeriods';

export default function StudentGrades({ assignments, grades, weeklyRows, student, weekDates, segment, setSegment }) {
  const columns = gradeColumns(assignments, weeklyRows, segment, weekDates);
  const { cells, earned, possible } = studentSummary(student, columns, weeklyRows, grades);
  if (!columns.length) return <><NineWeekToggle value={segment} onChange={setSegment} /><div className="glass-panel p-8 text-center text-sm text-muted-foreground">No grades are available for Nine Weeks {segment} yet.</div></>;
  return <><NineWeekToggle value={segment} onChange={setSegment} /><section className="glass-panel overflow-x-auto p-5"><table className="east-table"><thead><tr><th>Assignment</th><th>Grade</th></tr></thead><tbody>{columns.map((column, index) => <tr key={column.key}><td>{column.label}<GradeColumnDueDate column={column} className="block text-xs text-muted-foreground" /></td><td className={cells[index].enrollmentExempt || cells[index].excused ? 'font-semibold text-muted-foreground' : cells[index].pending ? 'font-semibold text-primary' : ''}>{cells[index].excused ? <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs font-semibold text-muted-foreground">Excused</span> : cells[index].label}{cells[index].makeup && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">makeup</span>}{column.type === 'weekly' && cells[index].label === 'Missing' && !isNineWeeksClosed(column.weekEnding) && (isCheckInSubmissionClosed(column.weekEnding, student) ? <Link to={`/check-ins?makeupWeek=${column.weekEnding}`} className="ml-3 text-xs font-semibold text-primary underline">Complete makeup</Link> : <Link to={`/check-ins?requiredWeek=${column.weekEnding}`} className="ml-3 text-xs font-semibold text-primary underline">Complete check-in</Link>)}</td></tr>)}</tbody><tfoot><tr><td className="font-bold">Total</td><td className="font-bold">{earned}/{possible} ({possible ? Math.round((earned / possible) * 100) : 0}%)</td></tr></tfoot></table></section></>;
}