import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, ClipboardCheck, FolderKanban, GraduationCap, LayoutDashboard, Link2, ListTodo, MessageSquare, Palette, Rocket, Sparkles, Target, TrendingUp } from 'lucide-react';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import { currentSchoolYearRange } from '@/lib/schoolYear';
import { isNineWeeksClosed, isCurrentNineWeeksAssignment, isCurrentNineWeeksDate } from '@/lib/gradingPeriods';
import { uncompletedAssignmentCount } from '@/lib/missingAssignments';
import { missingCheckInWeeks } from '@/lib/checkInReminder';
import { weeklyGoalRequirementCounts } from '@/lib/weeklyGoals';

const links = [
  ['/', 'Overview', LayoutDashboard], ['/tasks', 'My tasks', ListTodo], ['/messages', 'Messages', MessageSquare], ['/calendar', 'Calendar', CalendarDays],
  ['/assignments', 'Assignments', ClipboardCheck], ['/goals', 'Weekly goals', Target], ['/grades', 'Grades', GraduationCap], ['/check-ins', 'Weekly check-ins', ClipboardCheck],
  ['/skills', 'My skills', Sparkles], ['/project-pitch', 'Project pitch', Rocket], ['/my-projects', 'Projects', FolderKanban],
  ['/important-links', 'Important links', Link2], ['/learning-summary', 'My learning summary', TrendingUp], ['/theme', 'Change theme', Palette]
];

export default function StudentNavigation() {
  const { user } = useAuth();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const { items: notifications } = useEntityList('PitchNotification');
  const { items: assignments } = useEntityList('Assignment');
  const { items: grades } = useEntityList('AssignmentGrade');
  const { items: responses } = useEntityList('ReadingResponse');
  const { items: checkIns } = useEntityList('WeeklyCheckIn');
  const { items: exemptions } = useEntityList('CheckInExemption');
  const { items: dismissals } = useEntityList('CheckInDismissal');
  const { items: weeklyGoals } = useEntityList('WeeklyGoal');
  const unread = notifications.filter(item => item.recipient_id === user?.id && !item.read).length;
  const year = currentSchoolYearRange().label;
  const currentAssignments = assignments.filter(isCurrentNineWeeksAssignment);
  const currentGoals = weeklyGoals.filter(item => isCurrentNineWeeksDate(item.reflection_due_at || item.week_start));
  const uncompletedAssignments = uncompletedAssignmentCount(user, currentAssignments, grades, responses, year, now);
  const missingCheckIns = missingCheckInWeeks(user, checkIns, exemptions, dismissals, new Date(now), grades).filter(week => !isNineWeeksClosed(week)).length;
  const goalCounts = weeklyGoalRequirementCounts(user, currentGoals, assignments, new Date(now), grades);
  return <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-1">{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs uppercase tracking-wide ${isActive ? 'border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan shadow-neon-cyan' : 'border-transparent text-muted-foreground hover:border-neon-magenta/40 hover:bg-neon-magenta/10 hover:text-neon-magenta'}`}><Icon size={17} className="transition" />{label}{to === '/assignments' && uncompletedAssignments > 0 && <span title="Uncompleted assignments" className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">{uncompletedAssignments}</span>}{to === '/goals' && (goalCounts.goals > 0 || goalCounts.reflections > 0) && <span className="ml-auto flex gap-1">{goalCounts.goals > 0 && <span title="Weekly goals due" className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">G {goalCounts.goals}</span>}{goalCounts.reflections > 0 && <span title="Goal reflections due" className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">R {goalCounts.reflections}</span>}</span>}{to === '/check-ins' && missingCheckIns > 0 && <span title="Weekly check-ins due" className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">{missingCheckIns}</span>}{to === '/project-pitch' && unread > 0 && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">{unread}</span>}</NavLink>)}</nav>;
}