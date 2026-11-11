import { expectedStandardsGrade } from '@/lib/standardsExpectedGrade';

export default function StandardsBelowSeventyList({ students, assessments }) {
  const rows = students.map(student => ({ student, ...expectedStandardsGrade(student, assessments) })).filter(row => row.assessment && row.percent < 70).sort((a, b) => a.percent - b.percent);
  if (!rows.length) return null;
  return <section className="mb-6 rounded-xl border border-destructive/50 bg-card p-5">
    <p className="text-xs font-bold uppercase tracking-wide text-destructive">First Nine Weeks Standards Alert</p>
    <h2 className="mt-1 text-xl font-semibold">Students currently expected below 70%</h2>
    <ul className="mt-3 divide-y divide-border">{rows.map(({ student, percent }) => <li key={student.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="font-semibold">{student.full_name || student.email}</span><span className="font-bold text-destructive">{percent}%</span></li>)}</ul>
  </section>;
}