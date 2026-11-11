import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isEnrollmentWeekCheckIn } from '@/lib/checkinWeeks';
import { isFullSchoolWeekClosed } from '@/lib/schoolCalendar';
import { missingCheckInWeeks } from '@/lib/checkInReminder';
import { SHORT_WEEK_ENDING, SHORT_WEEK_SUBMISSION_DATES } from '@/lib/checkInRules';

const chicagoParts = (date = new Date()) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(date).map(part => [part.type, part.value]));
const fridayFor = ({ year, month, day, weekday }) => {
  const date = `${year}-${month}-${day}`;
  if (SHORT_WEEK_SUBMISSION_DATES.includes(date)) return SHORT_WEEK_ENDING;
  if (!['Thu', 'Fri'].includes(weekday)) return '';
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + (weekday === 'Thu' ? 1 : 0))).toISOString().slice(0, 10);
};

export default function WeeklyCheckInReminder({ student, checks, exemptions, dismissals, grades = [], now = new Date() }) {
  const [dismissedFriday, setDismissedFriday] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const friday = fridayFor(chicagoParts(now));
  const due = missingCheckInWeeks(student, checks, exemptions, dismissals, now, grades).includes(friday);
  if (dismissedFriday === friday || !friday || location.pathname === '/check-ins' || !due || isEnrollmentWeekCheckIn(student, friday) || isFullSchoolWeekClosed(friday)) return null;
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"><section className="glass-panel w-full max-w-md p-6">
    <p className="text-xs font-bold uppercase tracking-[.18em] text-neon-magenta">Weekly reminder</p><h2 className="mt-2 text-xl font-semibold">Submit this week’s check-in</h2>
    <p className="mt-2 text-sm text-muted-foreground">It is time to share what you accomplished, your next step, and evidence from this week.</p>
    <div className="mt-5 flex gap-2"><button onClick={() => { setDismissedFriday(friday); navigate(`/check-ins?requiredWeek=${friday}`); }} className="east-button flex-1">Complete check-in</button><button onClick={() => setDismissedFriday(friday)} className="rounded-lg border px-4 text-sm font-semibold">Not now</button></div>
  </section></div>;
}