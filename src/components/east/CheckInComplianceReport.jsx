import QuickPanel from './QuickPanel';
import { getLastFriday, fridaysBetween, isEnrollmentWeekCheckIn, weekEndingFriday } from '@/lib/checkinWeeks';
import { normalizedCheckInWeekEnding } from '@/lib/gradebook';

export default function CheckInComplianceReport({ projects, checks, schoolYear, users = [], exemptions = [], dismissals = [] }) {
  // Track every active (non-archived) student account, not just those with an approved project yet —
  // this way newly-joined students show up immediately instead of waiting on a project to be approved.
  const students = [...new Set(users.filter(u => u.role !== 'admin' && !u.is_archived).map(u => (u.full_name || '').trim()).filter(Boolean))].sort();
  const lastFriday = getLastFriday();
  const exemptWeeks = new Set(exemptions.map(x => x.week_ending));

  const rowsByStudent = students.map(name => {
    const user = users.find(u => (u.full_name || '').trim().toLowerCase() === name.toLowerCase());
    // Only the student who actually submitted (turned in) the check-in gets credit for it —
    // being tagged/named on someone else's entry doesn't count as compliant.
    const mine = checks.filter(c => c.created_by_id === user?.id && !['duplicate', 'extra'].includes(c.grade_status));
    // Only require check-ins from the date the student joined the app.
    const startDate = user?.created_date && new Date(user.created_date) > schoolYear.start ? new Date(user.created_date) : schoolYear.start;
    const dismissedWeeks = new Set(dismissals.filter(item => item.student_id === user?.id).map(item => item.week_ending));
    const expectedWeeks = fridaysBetween(startDate, lastFriday).filter(w => !isEnrollmentWeekCheckIn(user, w) && !exemptWeeks.has(w) && !dismissedWeeks.has(w));
    // A rejected/returned check-in doesn't count as submitted — it shows back up as missing
    // until the student resubmits it.
    const rows = expectedWeeks
      .map(week => ({ week, entry: mine.find(c => normalizedCheckInWeekEnding(c) === weekEndingFriday(week) && c.approval_status !== 'rejected') }))
      .filter(r => !r.entry || r.entry.is_late)
      .sort((a, b) => new Date(a.week) - new Date(b.week));
    return { name, rows };
  }).filter(s => s.rows.length > 0);

  return <QuickPanel title="Missing & late check-ins">
    {!rowsByStudent.length ? <p className="text-sm text-slate-500">Everyone is compliant — no missing or late check-ins.</p> : <div className="space-y-6">
      {rowsByStudent.map(({ name, rows }) => {
        const missingCount = rows.filter(r => !r.entry).length;
        const lateCount = rows.filter(r => r.entry?.is_late).length;
        return <div key={name} className="border-b pb-4 last:border-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-950">{name}</p>
            <p className="text-xs text-slate-500">{missingCount} missing · {lateCount} late</p>
          </div>
          <div className="overflow-x-auto">
            <table className="east-table"><thead><tr><th>Week ending</th><th>Status</th><th>Hours</th></tr></thead><tbody>
              {rows.map(r => <tr key={r.week}>
                <td>{r.week}</td>
                <td>{!r.entry ? <span className="font-semibold text-red-700">Missing</span> : <span className="font-semibold text-amber-700">Late</span>}</td>
                <td>{r.entry ? r.entry.hours : '—'}</td>
              </tr>)}
            </tbody></table>
          </div>
        </div>;
      })}
    </div>}
  </QuickPanel>;
}