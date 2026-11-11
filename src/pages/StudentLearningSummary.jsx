import { useState } from 'react';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/east/PageHeader';
import EmptyState from '@/components/east/EmptyState';
import IndividualLearningSummary from '@/components/east/IndividualLearningSummary';
import AdminStandardsUpdate from '@/components/east/AdminStandardsUpdate';
import BelowGradeLevelStandardsPanel from '@/components/east/BelowGradeLevelStandardsPanel';

import StandardsBelowSeventyList from '@/components/east/StandardsBelowSeventyList';

export default function StudentLearningSummary() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';
  const { items: users, loading } = useEntityList('User');
  const { items: assessments } = useEntityList('StandardsAssessment');
  const { items: assignments } = useEntityList('Assignment');
  const { items: grades } = useEntityList('AssignmentGrade');
  const students = users.filter(u => u.role !== 'admin' && !u.is_archived);
  const [studentId, setStudentId] = useState('');
  const selected = students.find(s => s.id === studentId);

  if (!isAdmin) {
    return <div className="learning-summary-page"><PageHeader title="My Learning Summary" description="An AI-generated summary of your growth, based on your real submissions — updated as you add new work." />
      {me && <IndividualLearningSummary key={me.id} student={me} assessments={assessments} assignments={assignments} grades={grades} />}
    </div>;
  }

  return <div className="learning-summary-page"><PageHeader title="Student Learning Summary" description="Update cached standards for every student, then select a student to review their learning and growth." />
    <StandardsBelowSeventyList students={students} assessments={assessments} />
    <AdminStandardsUpdate students={students} />
    <BelowGradeLevelStandardsPanel students={students} />
    <select value={studentId} onChange={e => setStudentId(e.target.value)} className="mb-6 w-auto">
      <option value="">Select a student…</option>
      {students.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
    </select>
    {loading ? <p>Loading…</p> : !selected ? <EmptyState>Select a student above to view their summary and standards.</EmptyState> : <IndividualLearningSummary key={selected.id} student={selected} assessments={assessments} assignments={assignments} grades={grades} adminMode />}
  </div>;
}