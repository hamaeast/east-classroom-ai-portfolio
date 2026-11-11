import { expectedStandardsGrade } from '@/lib/standardsExpectedGrade';
import { frozenStandardsAssignments, liveSegment, frozenGradeForStudent } from '@/lib/learningSummaryGrade';
import LearningSummaryGradeCard from './LearningSummaryGradeCard';

// Shows each frozen nine-weeks standards grade (snapshot) next to the live expected
// grade for the next nine weeks. Standards assessments are never deleted, so the
// live grade keeps compounding on the same accumulated evidence.
export default function FirstNineWeeksGradeBox({ student, assessments, assignments = [], grades = [] }) {
  const frozen = frozenStandardsAssignments(assignments);
  const liveSeg = liveSegment(assignments);
  const live = expectedStandardsGrade(student, assessments, liveSeg);
  const liveFooter = live.assessment
    ? `Information checked ${new Date(live.assessment.last_checked_at || live.assessment.generated_at).toLocaleString()} · current expected grade for Nine Weeks ${liveSeg}`
    : `Current expected grade for Nine Weeks ${liveSeg}`;

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2">
      <LearningSummaryGradeCard
        className="md:col-span-2"
        eyebrow={`Nine Weeks ${liveSeg} Standards Grade (so far)`}
        percent={live.percent}
        pointsLabel={live.points != null ? `${live.points}/20 so far` : null}
        footer={liveFooter}
        suggestions={live.suggestions}
        suggestionsTitle={`How to raise your Nine Weeks ${liveSeg} grade`}
        highlight
      />
      {frozen.map(assignment => {
        const { points, percent } = frozenGradeForStudent(assignment, grades, student.id);
        const frozenDate = new Date(assignment.frozen_at).toLocaleDateString();
        return (
          <LearningSummaryGradeCard
            key={assignment.id}
            frozen
            eyebrow={`Final Nine Weeks ${assignment.segment} Grade`}
            percent={percent}
            pointsLabel={`${points}/20`}
            footer={`Frozen ${frozenDate} · snapshot grade locked in the gradebook`}
          />
        );
      })}
    </div>
  );
}