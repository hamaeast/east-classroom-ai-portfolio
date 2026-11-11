import useEntityList from '@/hooks/useEntityList';
import { gradeBandFor } from '@/lib/eastStandards';
import { buildCurrentAssessment } from '@/lib/standardsProgress';
import StandardsGrid from './StandardsGrid';
import AccelerationStatus from './AccelerationStatus';

export default function StandardsAssessmentPanel({ student, adminMode = false }) {
  const { items: assessments } = useEntityList('StandardsAssessment');
  const studentAssessments = assessments.filter(item => item.student_id === student.id);
  const assessment = buildCurrentAssessment(studentAssessments);
  const band = gradeBandFor(Number(student.grade));
  return <section className="mt-8">
    <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-neon-magenta">EAST Playbook</p><h2 className="mt-1 text-2xl font-semibold">Standards Assessment</h2><p className="mt-1 text-sm text-muted-foreground">Enrolled grade: {student.grade || 'not set'} · Enrolled band: {band || 'unavailable'}{assessment ? ` · Information checked ${new Date(assessment.last_checked_at || assessment.generated_at).toLocaleString()}` : ''}</p></div>
    {!band && <p className="mb-4 rounded-lg border p-3 text-sm">A grade level must be added to this student profile before an assessment can be cached.</p>}
    {adminMode && band && <AccelerationStatus assessments={studentAssessments} band={band} />}
    <StandardsGrid band={band} assessment={assessment} assessments={studentAssessments} />
  </section>;
}