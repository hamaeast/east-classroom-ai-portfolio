import { useEffect, useState } from 'react';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import { currentSchoolYearRange } from '@/lib/schoolYear';
import { currentGoalWeekStart } from '@/lib/weeklyGoals';
import PageHeader from '@/components/east/PageHeader';
import AssignmentManager from '@/components/east/AssignmentManager';
import AdminDoNowManager from '@/components/east/AdminDoNowManager';
import StudentAssignments from '@/components/east/StudentAssignments';
import { isAssignmentReleased } from '@/lib/assignmentRelease';

export default function Assignments() {
  const { user } = useAuth();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const { items: assignments, reload } = useEntityList('Assignment');
  const { items: weeklyGoals } = useEntityList('WeeklyGoal');
  const { items: responses, reload: reloadResponses } = useEntityList('ReadingResponse');
  const year = currentSchoolYearRange();
  const yearAssignments = assignments.filter(item => item.school_year === year.label && !/^Student Standards\b/.test(item.title));
  const mySubmittedIds = new Set(responses.filter(item => item.student_id === user?.id).map(item => item.assignment_id));
  const studentAssignments = yearAssignments.filter(item => isAssignmentReleased(item, user?.class_period, now) || mySubmittedIds.has(item.id));
  const weeklyGoal = weeklyGoals.find(item => item.student_id === user?.id && item.week_start === currentGoalWeekStart());
  return <><PageHeader title="Assignments" description="View current assignments and due dates." />{user?.role === 'admin' ? <><div className="mb-6"><AdminDoNowManager /></div><AssignmentManager assignments={yearAssignments} schoolYear={year.label} reload={reload} /></> : <StudentAssignments assignments={studentAssignments} weeklyGoal={weeklyGoal} weeklyGoals={weeklyGoals} responses={responses} reloadResponses={reloadResponses} now={now} />}</>;
}