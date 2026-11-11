import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import { missingCheckInWeeks } from '@/lib/checkInReminder';
import { isNineWeeksClosed } from '@/lib/gradingPeriods';

// Shown to a student on the Weekly check-ins page: every Friday since they joined that still
// needs a check-in — either never submitted, or returned by the teacher and awaiting resubmission.
export default function MissingCheckInsSection() {
  const { items: checks, loading: checksLoading } = useEntityList('WeeklyCheckIn');
  const { items: exemptions, loading: exemptionsLoading } = useEntityList('CheckInExemption');
  const { items: dismissals, loading: dismissalsLoading } = useEntityList('CheckInDismissal');
  const { items: grades, loading: gradesLoading } = useEntityList('AssignmentGrade');
  const { user: me } = useAuth();
  if (!me) return null;

  const myDismissals = dismissals.filter(d => d.student_id === me.id);
  const missingWeeks = missingCheckInWeeks(me, checks, exemptions, dismissals, new Date(), grades).filter(week => !isNineWeeksClosed(week));

  if (checksLoading || exemptionsLoading || dismissalsLoading || gradesLoading || (!missingWeeks.length && !myDismissals.length)) return null;

  return <div className="mb-6 space-y-3">
    {!!missingWeeks.length && <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <h3 className="mb-1 text-sm font-semibold text-red-800">You're missing {missingWeeks.length} weekly check-in{missingWeeks.length > 1 ? 's' : ''}</h3>
      <p className="mb-2 text-xs text-red-700">Choose the week your check-in is for in the form below. Older missing weeks remain available until their submission window closes.</p>
      <div className="flex flex-wrap gap-2">{missingWeeks.map(w => <span key={w} className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700">{w}</span>)}</div>
    </div>}
    {!!myDismissals.length && <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Excused check-ins</h3>
      <div className="space-y-1">{myDismissals.map(d => <p key={d.id} className="text-xs text-slate-600"><b>Week ending {d.week_ending}:</b> {d.reason}</p>)}</div>
    </div>}
  </div>;
}