import { NavLink } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, CalendarDays, ClipboardCheck, ClipboardList, Clock3, GraduationCap, Handshake, LayoutDashboard, Link2, ListTodo, MessageSquare, Palette, Rocket, Settings2, Sparkles, Target, TrendingUp } from 'lucide-react';
import useEntityList from '@/hooks/useEntityList';
import { buildWeeklyGrades } from '@/lib/gradebook';
import { currentSchoolYearRange, inSchoolYear } from '@/lib/schoolYear';
import { weekEndingFriday } from '@/lib/checkinWeeks';
import { pitchNeedsAdminAttention } from '@/lib/pitchAttention';

const links = [
  ['/', 'Overview', LayoutDashboard], ['/tasks', 'Student tasks', ListTodo], ['/messages', 'Messages', MessageSquare], ['/calendar', 'Calendar', CalendarDays],
  ['/assignments', 'Assignments', ClipboardCheck], ['/goals', 'Weekly goals', Target], ['/grades', 'Grades', GraduationCap], ['/projects', 'Projects', BriefcaseBusiness],
  ['/partners', 'Partners', Handshake], ['/service', 'Service impact', Clock3], ['/check-ins', 'Weekly check-ins', ClipboardCheck], ['/skills', 'Student skills', Sparkles],
  ['/project-pitch', 'Project pitch', Rocket], ['/facilitation-review', 'Facilitation Review', ClipboardList], ['/reports', 'Admin reports', BarChart3], ['/important-links', 'Important links', Link2],
  ['/learning-summary', 'Learning summaries', TrendingUp], ['/management', 'Management', Settings2], ['/theme', 'Change theme', Palette]
];
const Badge = ({ count }) => count > 0 && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">{count}</span>;

export default function AdminNavigation() {
  const { items: checks } = useEntityList('WeeklyCheckIn');
  const { items: grades } = useEntityList('AssignmentGrade');
  const { items: assignments } = useEntityList('Assignment');
  const { items: exemptions } = useEntityList('CheckInExemption');
  const { items: service } = useEntityList('ServiceEntry');
  const { items: help } = useEntityList('HelpRequest');
  const { items: tasks } = useEntityList('TaskRequest');
  const { items: users } = useEntityList('User');
  const { items: pitches } = useEntityList('ProjectPitch');
  const year = currentSchoolYearRange();
  const yearAssignments = assignments.filter(item => item.school_year === year.label);
  const goalWeek = item => item.title.startsWith('Weekly Goal —') || item.title.startsWith('Goal Reflection —') ? item.title.split(' — ')[1] : '';
  const disabledGoalWeeks = new Set(yearAssignments.filter(item => item.is_active === false && goalWeek(item)).map(goalWeek));
  const gradebookAssignments = yearAssignments.filter(item => !disabledGoalWeeks.has(goalWeek(item)));
  const exemptWeeks = new Set(exemptions.map(item => weekEndingFriday(item.week_ending)));
  const reviewChecks = checks.filter(item => inSchoolYear(item.week_ending, year) && !exemptWeeks.has(weekEndingFriday(item.week_ending)));
  const weeklyReviewCount = buildWeeklyGrades(reviewChecks, users).filter(row => row.status === 'pending_review').length;
  const manualGradeCount = grades.filter(item => item.status === 'pending_review' && gradebookAssignments.some(assignment => assignment.id === item.assignment_id)).length + weeklyReviewCount;
  const counts = {
    '/': help.filter(item => !['answered', 'dismissed'].includes(item.status)).length,
    '/tasks': tasks.filter(item => item.status === 'pending').length,
    '/service': service.filter(item => item.approval_status === 'pending').length,
    '/grades': manualGradeCount,
    '/check-ins': weeklyReviewCount,
    '/management': users.filter(item => item.role !== 'admin' && !item.is_archived && !item.student_id).length,
    '/project-pitch': pitches.filter(pitchNeedsAdminAttention).length
  };
  return <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-1">{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs uppercase tracking-wide ${isActive ? 'border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan shadow-neon-cyan' : 'border-transparent text-muted-foreground hover:border-neon-magenta/40 hover:bg-neon-magenta/10 hover:text-neon-magenta'}`}><Icon size={17} className="transition" />{label}<Badge count={counts[to] || 0} /></NavLink>)}</nav>;
}