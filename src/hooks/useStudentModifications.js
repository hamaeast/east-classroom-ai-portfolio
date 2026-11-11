import { useAuth } from '@/lib/AuthContext';

export default function useStudentModifications() {
  const { user } = useAuth();
  const modifications = Array.isArray(user?.modifications) ? user.modifications : [];
  return {
    hasDictation: modifications.includes('dictation'),
    hasTextToSpeech: modifications.includes('text_to_speech'),
    deadlineExtensionDays: modifications.includes('assignment_deadline_extension') ? Number(user?.assignment_deadline_extension_days) || 0 : 0,
  };
}