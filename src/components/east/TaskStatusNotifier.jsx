import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import TaskStatusPopup from './TaskStatusPopup';

const finalStatuses = ['accepted', 'declined', 'completed'];
const noticeKey = task => `${task.id}:${task.status}`;
const noticeText = task => task.status === 'accepted' ? 'Your teacher agreed to it.' : task.status === 'declined' ? 'Your teacher declined it.' : 'Your teacher completed it.';

export default function TaskStatusNotifier() {
  const { items: tasks } = useEntityList('TaskRequest');
  const { user: authMe, updateCurrentUser } = useAuth();
  const [me, setMe] = useState(null), [sessionKeys, setSessionKeys] = useState([]), [dismissing, setDismissing] = useState(false);
  useEffect(() => { if (authMe) setMe(authMe); }, [authMe]);
  const dismissed = (me?.dismissed_task_notice_keys || '').split(',').filter(Boolean);
  const markDismissed = async (keys) => {
    const updated = [...new Set([...dismissed, ...keys])].join(',');
    await updateCurrentUser({ dismissed_task_notice_keys: updated });
    setMe(m => ({ ...m, dismissed_task_notice_keys: updated }));
  };
  useEffect(() => {
    if (!me) return;
    return base44.entities.TaskRequest.subscribe(event => {
      const task = event.data;
      if (event.type !== 'update' || task.created_by_id !== me.id || !finalStatuses.includes(task.status)) return;
      const key = noticeKey(task); setSessionKeys(keys => [...keys, key]);
      toast({ title: `Task ${task.status}`, description: `${task.title}: ${noticeText(task)}`, duration: 1000000,
        action: <ToastAction altText="Dismiss task update" onClick={() => markDismissed([key])}>Dismiss</ToastAction> });
    });
  }, [me]);
  if (!me) return null;
  const notices = tasks.filter(t => t.created_by_id === me.id && finalStatuses.includes(t.status) && !dismissed.includes(noticeKey(t)) && !sessionKeys.includes(noticeKey(t)));
  const dismiss = async () => { setDismissing(true); await markDismissed(notices.map(noticeKey)); setDismissing(false); };
  return <TaskStatusPopup notices={notices} dismissing={dismissing} onDismiss={dismiss} />;
}