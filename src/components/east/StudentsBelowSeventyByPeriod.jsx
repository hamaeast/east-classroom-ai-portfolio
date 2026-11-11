import { useState } from 'react';
import { gradeColumns, studentSummary } from '@/lib/gradebookReports';
import { NINE_WEEK_PERIODS } from '@/lib/gradingPeriods';
import { chicagoToday } from '@/lib/weeklyGoals';

const AVAILABLE_SEGMENTS = [1, 2];

function currentNineWeeksNumber() {
  const today = chicagoToday();
  const period = NINE_WEEK_PERIODS.find(p => today >= p.start && today <= p.end);
  return period && AVAILABLE_SEGMENTS.includes(period.number) ? period.number : 1;
}

export default function StudentsBelowSeventyByPeriod({ assignments, grades, weeklyRows, students, weekDates, segment }) {
  const [activeSegment, setActiveSegment] = useState(() => {
    const current = currentNineWeeksNumber();
    return current !== 1 ? current : (segment === 2 ? 2 : 1);
  });
  const columns = gradeColumns(assignments, weeklyRows, activeSegment, weekDates);
  const groups = students.reduce((result, student) => {
    const summary = studentSummary(student, columns, weeklyRows, grades);
    if (!summary.possible || summary.percent >= 70) return result;
    const period = String(student.class_period || 'Unassigned');
    result[period] = [...(result[period] || []), summary];
    return result;
  }, {});
  const periods = Object.keys(groups).sort((a, b) => a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : Number(a) - Number(b));

  return <section className="glass-panel mb-6 p-5">
    <p className="text-xs font-bold uppercase tracking-wide text-destructive">Below 70%</p>
    <h3 className="mt-1 text-xl font-semibold">Students needing grade support</h3>
    <div className="mt-3 flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Select nine weeks</span>
      <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
        {AVAILABLE_SEGMENTS.map(option => <button key={option} type="button" aria-pressed={activeSegment === option} onClick={() => setActiveSegment(option)} className={`rounded-md px-3 py-1 text-sm font-semibold transition ${activeSegment === option ? 'border border-neon-cyan bg-neon-cyan/10 text-neon-cyan' : 'text-muted-foreground hover:text-foreground'}`}>Nine Weeks {option}</button>)}
      </div>
    </div>
    <p className="mt-1 text-sm text-muted-foreground">Nine Weeks {activeSegment}, grouped by class period.</p>
    {!periods.length ? <p className="mt-4 text-sm text-muted-foreground">No students are currently below 70%.</p> : <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {periods.map(period => <div key={period} className="rounded-lg border border-border bg-muted/30 p-4">
        <h4 className="font-semibold">{period === 'Unassigned' ? 'Unassigned period' : `Period ${period}`}</h4>
        <ul className="mt-2 divide-y divide-border">{groups[period].sort((a, b) => a.percent - b.percent).map(row => <li key={row.student.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span>{row.student.display_name || row.student.full_name || row.student.email}</span><span className="font-bold text-destructive">{row.percent}%</span></li>)}</ul>
      </div>)}
    </div>}
  </section>;
}