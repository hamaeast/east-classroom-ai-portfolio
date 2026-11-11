import useEntityList from '@/hooks/useEntityList';
import PageHeader from '@/components/east/PageHeader';
import EmptyState from '@/components/east/EmptyState';
import UrgentHelpForm from '@/components/east/UrgentHelpForm';
import AdminMessageComposer from '@/components/east/AdminMessageComposer';
import { currentSchoolYearRange, inSchoolYear } from '@/lib/schoolYear';
import { useAuth } from '@/lib/AuthContext';
import AssignmentReminderCard from '@/components/east/AssignmentReminderCard';
import EnrollmentExemptionNotice from '@/components/east/EnrollmentExemptionNotice';

export default function Messages() {
  const { items, loading } = useEntityList('AdminMessage');
  const { items: assignmentReminders, loading: remindersLoading } = useEntityList('AssignmentReminder');
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';
  const myPeriod = String(me?.class_period || '');
  const schoolYear = currentSchoolYearRange();
  const joinedDate = me?.created_date?.slice(0, 10);
  const hasEnrollmentNotice = !isAdmin && Boolean(joinedDate);
  const yearItems = items
    .filter(x => inSchoolYear(x.sent_date, schoolYear))
    .filter(x => isAdmin || !x.target_periods?.length || x.target_periods.includes(myPeriod))
    .sort((a, b) => new Date(b.sent_date) - new Date(a.sent_date));
  const yearReminders = assignmentReminders
    .filter(x => inSchoolYear(x.due_date, schoolYear))
    .filter(x => isAdmin || !joinedDate || x.due_date >= joinedDate)
    .sort((a, b) => new Date(b.zero_recorded_at) - new Date(a.zero_recorded_at));

  return <><PageHeader title="Messages" description={isAdmin ? 'Create announcements and review message history.' : `Announcements from your teacher for the ${schoolYear.label} school year.`} />
    {isAdmin ? <div className="mb-6"><AdminMessageComposer /></div> : <div className="mb-6"><UrgentHelpForm /></div>}
    {hasEnrollmentNotice && <EnrollmentExemptionNotice joinedDate={joinedDate} />}
    {!!yearReminders.length && <section className="mb-6 space-y-3"><h3 className="font-semibold">Assignment reminders</h3>{yearReminders.map(reminder => <AssignmentReminderCard key={reminder.id} reminder={reminder} showStudent={isAdmin} />)}</section>}
    {loading || remindersLoading ? <p>Loading…</p> : !yearItems.length && !yearReminders.length && !hasEnrollmentNotice ? <EmptyState>No messages yet.</EmptyState> : !!yearItems.length && <div className="space-y-3">
      {yearItems.map(m => <div key={m.id} className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-500">{m.sent_date}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.category === 'check_in_exemption' ? 'bg-amber-50 text-amber-700' : 'bg-cyan-50 text-cyan-700'}`}>{m.category === 'check_in_exemption' ? 'Check-in exemption' : 'Announcement'}</span>
        </div>
        <p className="mt-2 text-sm text-slate-700">{m.message}</p>
      </div>)}
    </div>}
  </>;
}