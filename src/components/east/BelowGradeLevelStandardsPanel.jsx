import { format } from 'date-fns';
import useEntityList from '@/hooks/useEntityList';
import { gradeBandFor } from '@/lib/eastStandards';
import { buildCurrentAssessment } from '@/lib/standardsProgress';
import { NINE_WEEK_PERIODS } from '@/lib/gradingPeriods';
import { STANDARDS_USED } from '@/lib/standardsGrade';

const BANDS = ['K-2', '3-6', '7-8', '9-12'];
const studentName = student => student.display_name || student.full_name || student.email;

export default function BelowGradeLevelStandardsPanel({ students }) {
  const { items: assessments, loading } = useEntityList('StandardsAssessment');
  const today = format(new Date(), 'yyyy-MM-dd');
  const period = NINE_WEEK_PERIODS.find(item => today >= item.start && today <= item.end);
  if (!period) return null;
  const goal = STANDARDS_USED[period.number];
  const rows = students.flatMap(student => {
    const band = gradeBandFor(Number(student.grade));
    if (!band) return [];
    const assessment = buildCurrentAssessment(assessments.filter(item => item.student_id === student.id));
    const count = (assessment?.results || []).filter(result => BANDS.indexOf(result.assessed_grade_band) >= BANDS.indexOf(band)).length;
    return count < goal ? [{ student, band, count }] : [];
  }).sort((a, b) => Number(a.student.class_period || 99) - Number(b.student.class_period || 99) || studentName(a.student).localeCompare(studentName(b.student)));

  return <section className="glass-panel mb-6 p-4">
    <h2 className="font-semibold">Students below the current standards goal</h2>
    <p className="mt-1 text-sm text-muted-foreground">Nine Weeks {period.number}: {goal} standards at or above each student’s enrolled grade band.</p>
    {loading ? <p className="mt-3 text-sm text-muted-foreground">Loading standards…</p> : !rows.length ? <p className="mt-3 text-sm font-semibold text-emerald-300">All assessed students are meeting the current goal.</p> : <div className="mt-3 divide-y divide-border">{rows.map(({ student, band, count }) => <div key={student.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><span className="font-semibold">{studentName(student)}</span><span className="ml-2 text-muted-foreground">Period {student.class_period || 'not set'} · Grade {student.grade} ({band})</span></div><span className="font-semibold text-neon-magenta">{count} of {goal} at grade level</span></div>)}</div>}
  </section>;
}