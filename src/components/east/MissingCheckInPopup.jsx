import { useLocation, useNavigate } from 'react-router-dom';
import { isCurrentNineWeeksDate } from '@/lib/gradingPeriods';

export default function MissingCheckInPopup({ missingWeeks: allMissingWeeks }) {
  const missingWeeks = allMissingWeeks.filter(isCurrentNineWeeksDate);
  const location = useLocation();
  const navigate = useNavigate();

  if (!missingWeeks.length || (location.pathname === '/check-ins' && new URLSearchParams(location.search).has('requiredWeek'))) return null;
  const requiredWeek = missingWeeks[0];

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
    <div className="glass-panel w-full max-w-md p-6">
      <h2 className="mb-2 text-xl font-semibold">Missing weekly check-in</h2>
      <p className="text-sm text-muted-foreground">Your check-in for the week ending <b>{requiredWeek}</b> is missing and currently counts as a zero. Submit it now to update your grade.</p>
      {missingWeeks.length > 1 && <p className="mt-2 text-xs text-muted-foreground">You have {missingWeeks.length} overdue check-ins. Complete the oldest one first.</p>}
      <button onClick={() => navigate(`/check-ins?requiredWeek=${requiredWeek}`)} className="east-button mt-5 w-full">Complete check-in now</button>
    </div>
  </div>;
}