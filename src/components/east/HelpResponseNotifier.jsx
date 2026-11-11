import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';

// Notifies a student when their teacher replies to an urgent help request: a real-time toast if
// they're already logged in, or a dismissible box on their next login if they weren't around to see it.
export default function HelpResponseNotifier() {
  const { items: requests } = useEntityList('HelpRequest');
  const { user: authMe, updateCurrentUser } = useAuth();
  const [me, setMe] = useState(null);
  const [dismissing, setDismissing] = useState(false);
  useEffect(() => { if (authMe) setMe(authMe); }, [authMe]);

  useEffect(() => {
    if (!me) return;
    const unsubscribe = base44.entities.HelpRequest.subscribe((event) => {
      const id = event.data?.id || event.id;
      if (event.type === 'update' && event.data.created_by_id === me.id && event.data.status === 'answered') {
        toast({ title: 'Your teacher replied', description: event.data.admin_response });
        // Mark it seen so it doesn't also show up as a dismissible box later.
        setMe(m => {
          const ids = (m.dismissed_help_response_ids || '').split(',').map(s => s.trim()).filter(Boolean);
          if (ids.includes(id)) return m;
          const updatedIds = [...ids, id].join(',');
          updateCurrentUser({ dismissed_help_response_ids: updatedIds });
          return { ...m, dismissed_help_response_ids: updatedIds };
        });
      }
    });
    return unsubscribe;
  }, [me]);

  if (!me) return null;
  const dismissedIds = (me.dismissed_help_response_ids || '').split(',').map(s => s.trim()).filter(Boolean);
  const pending = requests.filter(r => r.created_by_id === me.id && r.status === 'answered' && !dismissedIds.includes(r.id));
  if (!pending.length) return null;

  const dismiss = async () => {
    setDismissing(true);
    const updatedIds = [...dismissedIds, ...pending.map(r => r.id)].join(',');
    await updateCurrentUser({ dismissed_help_response_ids: updatedIds });
    setMe({ ...me, dismissed_help_response_ids: updatedIds });
    setDismissing(false);
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
      <h2 className="mb-1 text-lg font-semibold text-slate-950">Your teacher replied to your urgent request{pending.length > 1 ? 's' : ''}</h2>
      <ul className="mb-4 max-h-72 space-y-3 overflow-y-auto text-sm">
        {pending.map(r => <li key={r.id} className="border-b pb-2 last:border-0">
          <p className="text-xs text-slate-500">Re: {r.message}</p>
          <p className="mt-1 text-slate-700">{r.admin_response}</p>
        </li>)}
      </ul>
      <button disabled={dismissing} onClick={dismiss} className="east-button w-full">{dismissing ? 'Dismissing…' : 'Dismiss'}</button>
    </div>
  </div>;
}