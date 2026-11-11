import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/east/PageHeader';
import StudentsByPeriod from '@/components/east/StudentsByPeriod';
import MissingStudentIds from '@/components/east/MissingStudentIds';
import ClassPeriodManager from '@/components/east/ClassPeriodManager';
import GrantsDonations from '@/components/east/GrantsDonations';
import StudentModificationsManager from '@/components/east/StudentModificationsManager';

export default function AdminManagement() {
  const { user } = useAuth();
  const { items: users, loading, reload } = useEntityList('User');
  if (user?.role !== 'admin') return <p className="text-sm text-muted-foreground">This page is available to facilitators only.</p>;
  return <><PageHeader title="Management" description="Manage class periods, student access, modifications, grants, and donations." />
    <div className="space-y-6"><StudentModificationsManager users={users} loading={loading} reload={reload} /><MissingStudentIds users={users} loading={loading} reload={reload} /><StudentsByPeriod users={users} loading={loading} /><ClassPeriodManager users={users} loading={loading} reload={reload} /><GrantsDonations /></div>
  </>;
}