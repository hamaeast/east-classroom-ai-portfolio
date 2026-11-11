import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Resolves a list of tagged emails to the real names on their accounts via a backend
// function (works for every viewer, not just admins who can list all users).
export default function useResolvedNames(emails = []) {
  const cleanEmails = [...new Set(emails.map(e => (e || '').trim().toLowerCase()).filter(Boolean))].sort();

  const { data } = useQuery({
    queryKey: ['resolvedNames', cleanEmails],
    queryFn: async () => {
      if (!cleanEmails.length) return {};
      const res = await base44.functions.invoke('resolveTaggedNames', { emails: cleanEmails });
      return res.data.names;
    },
    enabled: cleanEmails.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return data || {};
}