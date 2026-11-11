import { Printer } from 'lucide-react';
import FirstNineWeeksGradeBox from '@/components/east/FirstNineWeeksGradeBox';
import LearningSummaryView from '@/components/east/LearningSummaryView';
import StandardsAssessmentPanel from '@/components/east/StandardsAssessmentPanel';

export default function IndividualLearningSummary({ student, assessments, assignments, grades, adminMode = false }) {
  return <div className="individual-learning-summary">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-semibold">{student.full_name || student.email} — Learning Summary</h2>
        <p className="text-sm text-muted-foreground">{student.student_id ? `Student ID: ${student.student_id} · ` : ''}Period {student.class_period || 'not set'} · {new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</p>
      </div>
      <button type="button" onClick={() => window.print()} className="east-button print:hidden"><Printer size={16} />Print / Save PDF</button>
    </div>
    <FirstNineWeeksGradeBox student={student} assessments={assessments} assignments={assignments} grades={grades} />
    <LearningSummaryView student={student} notifyStudent={adminMode} />
    <StandardsAssessmentPanel student={student} adminMode={adminMode} />
  </div>;
}