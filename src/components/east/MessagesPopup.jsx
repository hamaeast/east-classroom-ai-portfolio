import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { isNineWeeksClosed } from '@/lib/gradingPeriods';

export default function MessagesPopup() {
  const { items: messages } = useEntityList('AdminMessage');
  const { user: authMe, updateCurrentUser } = useAuth();
  const [me, setMe] = useState(null);
  const [dismissing, setDismissing] = useState(false);
  useEffect(() => { if (authMe) setMe(authMe); }, [authMe]);

  // Push a real-time toast the instant a new message is sent while the student is already in the app.
  useEffect(() => {
    const unsubscribe = base44.entities.AdminMessage.subscribe((event) => {
      if (event.type === 'create' && !isNineWeeksClosed(event.data.sent_date)) {
        toast({ title: 'New message from your teacher', description: event.data.message });
      }
    });
    return unsubscribe;
  }, []);

  if (!me) return null;
  const dismissedIds = (me.dismissed_message_ids || '').split(',').map(s => s.trim()).filter(Boolean);
  const myPeriod = String(me.class_period || '');
  const pending = messages
    .filter(m => !isNineWeeksClosed(m.sent_date))
    .filter(m => !m.target_student_ids?.length || m.target_student_ids.includes(me.id))
    .filter(m => !m.target_periods?.length || m.target_periods.includes(myPeriod))
    .filter(m => !dismissedIds.includes(m.id))
    .sort((a, b) => new Date(a.sent_date) - new Date(b.sent_date));
  if (!pending.length) return null;

  const dismiss = async () => {
    setDismissing(true);
    const updatedIds = [...dismissedIds, ...pending.map(m => m.id)].join(',');
    await updateCurrentUser({ dismissed_message_ids: updatedIds });
    setMe({ ...me, dismissed_message_ids: updatedIds });
    setDismissing(false);
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
      <h2 className="mb-1 text-lg font-semibold text-slate-950">Message{pending.length > 1 ? 's' : ''} from your teacher</h2>
      <ul className="mb-4 max-h-72 space-y-3 overflow-y-auto text-sm">
        {pending.map(m => <li key={m.id} className="border-b pb-2 last:border-0"><span className="text-xs text-slate-500">{m.sent_date}</span><p className="mt-1 text-slate-700">{m.message}</p></li>)}
      </ul>
      <button disabled={dismissing} onClick={dismiss} className="east-button w-full">{dismissing ? 'Dismissing…' : 'Dismiss'}</button>
    </div>
  </div>;
}