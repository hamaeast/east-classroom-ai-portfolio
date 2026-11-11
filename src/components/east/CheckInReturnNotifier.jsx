import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { isNineWeeksClosed } from '@/lib/gradingPeriods';
import { weekEndingFriday } from '@/lib/checkinWeeks';

// Pushes a real-time toast to a student the instant their weekly check-in is returned by a teacher.
export default function CheckInReturnNotifier() {
  const { user: me } = useAuth();

  useEffect(() => {
    if (!me) return;
    const unsubscribe = base44.entities.WeeklyCheckIn.subscribe((event) => {
      if (event.type === 'update' && event.data.created_by_id === me.id && event.data.approval_status === 'rejected' && !isNineWeeksClosed(weekEndingFriday(event.data.week_ending))) {
        toast({ title: 'Check-in returned', description: `Your check-in for the week ending ${event.data.week_ending} was returned — please review and resubmit it.` });
      }
    });
    return unsubscribe;
  }, [me]);

  return null;
}