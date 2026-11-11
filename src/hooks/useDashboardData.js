import useEntityList from '@/hooks/useEntityList';

export default function useDashboardData(isAdmin) {
  const sources = {
    Project: useEntityList('Project'),
    CommunityPartner: useEntityList('CommunityPartner'),
    ServiceEntry: useEntityList('ServiceEntry'),
    WeeklyCheckIn: useEntityList('WeeklyCheckIn'),
    ProjectPitch: useEntityList('ProjectPitch'),
    TaskRequest: useEntityList('TaskRequest'),
    CheckInExemption: useEntityList('CheckInExemption', '-created_date', { enabled: isAdmin }),
    CheckInDismissal: useEntityList('CheckInDismissal', '-created_date', { enabled: isAdmin }),
    User: useEntityList('User', '-created_date', { enabled: isAdmin })
  };
  const names = isAdmin ? Object.keys(sources) : ['Project', 'CommunityPartner', 'ServiceEntry', 'WeeklyCheckIn', 'ProjectPitch', 'TaskRequest'];
  const data = Object.fromEntries(names.map(name => [name, sources[name].items]));
  const reload = () => Promise.all(names.map(name => sources[name].reload()));
  return { data, loading: names.some(name => sources[name].loading), reload };
}