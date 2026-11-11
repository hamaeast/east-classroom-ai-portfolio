import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import ClassPeriodPrompt from './ClassPeriodPrompt';
import SubmissionRequirementPopup from './SubmissionRequirementPopup';
import BrandMark from './BrandMark';
import AdminNavigation from './AdminNavigation';
import StudentNavigation from './StudentNavigation';
import StudentAlerts from './StudentAlerts';
import StudentAlertsBoundary from './StudentAlertsBoundary';
import StandardsUpdateProvider from './StandardsUpdateProvider';

export default function AppShell() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';

  useEffect(() => {
    document.documentElement.dataset.colorPalette = me?.theme_palette || 'current';
  }, [me?.theme_palette]);

  return <div className="aurora-shell text-foreground md:flex md:items-start">
    <ClassPeriodPrompt />
    <SubmissionRequirementPopup />
    {!isAdmin && me && <StudentAlertsBoundary key={me.id}><StudentAlerts student={me} /></StudentAlertsBoundary>}
    <aside className="app-sidebar border-b border-border/70 bg-glass/75 px-3 py-3 backdrop-blur-2xl md:sticky md:top-0 md:w-56 md:flex-none md:border-b-0 md:border-r">
      <div className="mb-4 flex items-center gap-2">
        <BrandMark compact />
        <div><p className="text-xs font-bold uppercase tracking-wider text-neon-cyan">{isAdmin ? 'FACILITATOR CONSOLE' : 'STUDENT WORKSPACE'}</p>{me && <span className="mt-2 inline-block rounded-full border border-neon-magenta/40 bg-neon-magenta/10 px-2.5 py-1 text-[11px] font-semibold text-neon-magenta">{isAdmin ? 'Teacher / Admin' : 'Student'}</span>}</div>
      </div>
      {isAdmin ? <AdminNavigation /> : <StudentNavigation />}
      <button onClick={() => base44.auth.logout('/login')} className="mt-4 flex items-center gap-2 text-xs text-muted-foreground hover:text-neon-cyan"><LogOut size={16} />Sign out</button>
    </aside>
    <main className="min-w-0 w-full md:flex-1"><div className="mx-auto max-w-7xl p-5 sm:p-8"><StandardsUpdateProvider><Outlet /></StandardsUpdateProvider></div></main>
  </div>;
}