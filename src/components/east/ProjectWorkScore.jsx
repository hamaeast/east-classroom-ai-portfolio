import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import ProjectWorkIncidentDialog from './ProjectWorkIncidentDialog';
import { projectWorkScore, weeklyIncidentCount, projectWorkWeekStart, PROJECT_WORK_MAX } from '@/lib/projectWork';

export default function ProjectWorkScore() {
  const { user } = useAuth();
  const { items: incidents, loading } = useEntityList('ProjectWorkIncident');
  if (!user || user.role === 'admin') return null;
  const weekStart = projectWorkWeekStart();
  const score = projectWorkScore(user.id, incidents, weekStart);
  const count = weeklyIncidentCount(user.id, incidents, weekStart);
  return (
    <section className="glass-panel mb-6 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-neon-magenta">Project Work</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">This week's score</h3>
          <p className="mt-1 text-sm text-muted-foreground">{count ? `${count} off-task mark${count > 1 ? 's' : ''} this week` : 'No off-task marks yet this week'}</p>
        </div>
        <div className="text-right">
          {loading ? <span className="text-sm text-muted-foreground">…</span> : (
            <ProjectWorkIncidentDialog studentId={user.id} studentName={user.full_name || user.email} incidents={incidents}
              trigger={<button type="button" className="font-bold text-mission-cyan transition hover:underline" title="View off-task marks">
                <span className="text-3xl">{score}</span><span className="text-lg text-muted-foreground">/{PROJECT_WORK_MAX}</span>
              </button>} />
          )}
        </div>
      </div>
    </section>
  );
}