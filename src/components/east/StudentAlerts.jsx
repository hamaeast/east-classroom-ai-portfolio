import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import WeeklyCheckInReminder from './WeeklyCheckInReminder';
import useEntityList from '@/hooks/useEntityList';
import DailyDoNowPopup from './DailyDoNowPopup';
import WeeklyGoalPopup from './WeeklyGoalPopup';
import MessagesPopup from './MessagesPopup';
import CheckInReturnNotifier from './CheckInReturnNotifier';
import HelpResponseNotifier from './HelpResponseNotifier';
import TaskStatusNotifier from './TaskStatusNotifier';
import PitchNotificationNotifier from './PitchNotificationNotifier';
import LateAssignmentNotifier from './LateAssignmentNotifier';
import DailyGradeSummaryPopup from './DailyGradeSummaryPopup';

export default function StudentAlerts({ student }) {
  const location = useLocation();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const requiredMode = location.pathname === '/check-ins' && new URLSearchParams(location.search).has('requiredWeek');
  const { items: checks, loading: checksLoading } = useEntityList('WeeklyCheckIn');
  const { items: exemptions, loading: exemptionsLoading } = useEntityList('CheckInExemption');
  const { items: dismissals, loading: dismissalsLoading } = useEntityList('CheckInDismissal');
  const { items: grades, loading: gradesLoading } = useEntityList('AssignmentGrade');
  const loading = checksLoading || exemptionsLoading || dismissalsLoading || gradesLoading;
  return <><DailyGradeSummaryPopup student={student} />{!requiredMode && <DailyDoNowPopup student={student} />}{!requiredMode && !loading && <WeeklyGoalPopup student={student} />}{!requiredMode && !loading && <WeeklyCheckInReminder student={student} checks={checks} exemptions={exemptions} dismissals={dismissals} grades={grades} now={new Date(now)} />}<MessagesPopup /><CheckInReturnNotifier /><HelpResponseNotifier /><TaskStatusNotifier /><PitchNotificationNotifier /><LateAssignmentNotifier studentId={student.id} /></>;
}