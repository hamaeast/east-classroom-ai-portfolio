import { useEffect } from 'react';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';

export default function PitchNotificationNotifier() {
  const { items } = useEntityList('PitchNotification');
  const { user: me } = useAuth();
  const unread = items.filter(item => item.recipient_id === me?.id && !item.read);

  useEffect(() => {
    unread.forEach(item => {
      const key = `pitch-notification-shown:${item.id}`;
      if (sessionStorage.getItem(key)) return;
      toast({ title: item.type === 'approved' ? 'Project pitch approved' : 'New project pitch message', description: item.message });
      sessionStorage.setItem(key, 'true');
    });
  }, [unread]);

  return null;
}