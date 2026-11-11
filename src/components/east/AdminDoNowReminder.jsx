import { useState } from 'react';
import { Link } from 'react-router-dom';
import useEntityList from '@/hooks/useEntityList';
import { chicagoToday } from '@/lib/weeklyGoals';
import { nextInstructionDates } from '@/lib/schoolCalendar';

export default function AdminDoNowReminder() {
  const { items: questions, loading } = useEntityList('DoNowQuestion');
  const [dismissed, setDismissed] = useState(false);
  const upcomingDates = nextInstructionDates(chicagoToday(), 2);
  const scheduledDates = new Set(questions.map(item => item.school_date));
  const missingDates = upcomingDates.filter(date => !scheduledDates.has(date));

  if (loading || dismissed || upcomingDates.length < 2 || !missingDates.length) return null;

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
    <section className="glass-panel w-full max-w-lg p-6" role="dialog" aria-modal="true" aria-labelledby="do-now-reminder-title">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-neon-magenta">Do Now reminder</p>
      <h2 id="do-now-reminder-title" className="mt-2 text-xl font-semibold text-foreground">Schedule the next two Do Nows</h2>
      <p className="mt-2 text-sm text-muted-foreground">A Do Now is missing for {missingDates.map(date => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })).join(' and ')}.</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setDismissed(true)} className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold">Dismiss</button>
        <Link to="/assignments" className="east-button">Open assignments</Link>
      </div>
    </section>
  </div>;
}