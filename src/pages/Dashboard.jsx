import { base44 } from '@/api/base44Client';
import useDashboardData from '@/hooks/useDashboardData';
import { useAuth } from '@/lib/AuthContext';
import MissionControlOverview from '@/components/east/MissionControlOverview';
import QuickPanel from '@/components/east/QuickPanel';
import StudentOverview from '@/components/east/StudentOverview';
import MyPitchesAndCheckins from '@/components/east/MyPitchesAndCheckins';
import MyServiceHours from '@/components/east/MyServiceHours';
import StudentServiceHours from '@/components/east/StudentServiceHours';
import StudentTasksPanel from '@/components/east/StudentTasksPanel';
import RejectWithFeedback from '@/components/east/RejectWithFeedback';
import AdminPitchEditor from '@/components/east/AdminPitchEditor';
import UrgentHelpPanel from '@/components/east/UrgentHelpPanel';
import AdminDoNowReminder from '@/components/east/AdminDoNowReminder';
import ProjectWorkTracker from '@/components/east/ProjectWorkTracker';
import ProjectWorkScore from '@/components/east/ProjectWorkScore';
import MissingCheckInRow from '@/components/east/MissingCheckInRow';
import StudentMissingWorkPanel from '@/components/east/StudentMissingWorkPanel';
import { currentSchoolYearRange, inSchoolYear } from '@/lib/schoolYear';
import { isFullSchoolWeekClosed } from '@/lib/schoolCalendar';
import { approvedServiceEntries } from '@/lib/approvedServiceHours';
import { isNineWeeksClosed } from '@/lib/gradingPeriods';
import { isCheckInGradeEligible } from '@/lib/gradebook';
import { isEnrollmentWeekCheckIn, weekEndingFriday } from '@/lib/checkinWeeks';

function lastFridayInfo() {
  const now = new Date();
  const day = now.getDay(); // 0 Sun ... 5 Fri, 6 Sat
  const daysSinceFriday = (day - 5 + 7) % 7;
  const friday = new Date(now); friday.setHours(0,0,0,0); friday.setDate(now.getDate() - daysSinceFriday);
  const pad = n => String(n).padStart(2,'0');
  const dateStr = `${friday.getFullYear()}-${pad(friday.getMonth()+1)}-${pad(friday.getDate())}`;
  return { dateStr, pastDeadline: daysSinceFriday > 0 };
}

export default function Dashboard() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';
  const { data, reload } = useDashboardData(isAdmin);
  const projects = data.Project || [], partners = data.CommunityPartner || [];
  const service = data.ServiceEntry || [], checks = data.WeeklyCheckIn || [], pitches = data.ProjectPitch || [], tasks = data.TaskRequest || [];
  const exemptions = data.CheckInExemption || [], dismissals = data.CheckInDismissal || [], users = data.User || [];
  const reloadService = reload, reloadChecks = reload, reloadPitches = reload, reloadDismissals = reload;
  const myPitches = me ? pitches.filter(p => p.created_by_id === me.id || (p.tagged_emails||'').split(',').map(e=>e.trim().toLowerCase()).includes((me.email||'').toLowerCase())) : [];
  const schoolYear = currentSchoolYearRange();
  const yearService = service.filter(x => inSchoolYear(x.service_date, schoolYear));
  const eligibleYearService = approvedServiceEntries(yearService, checks, pitches);
  const approvedYearService = eligibleYearService.filter(x => (x.approval_status || 'approved') === 'approved');
  const belongsToStudent = entry => {
    const emails = (entry.student_emails || '').toLowerCase().split(',').map(email => email.trim()).filter(Boolean);
    if (emails.length) return emails.includes((me?.email || '').toLowerCase());
    return (entry.student_names || '').toLowerCase().includes((me?.full_name || '').trim().toLowerCase());
  };
  const myService = me ? eligibleYearService.filter(belongsToStudent) : [];
  const dashboardService = isAdmin ? approvedYearService : approvedYearService.filter(belongsToStudent);
  const hours = dashboardService.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
  const impact = dashboardService.reduce((sum, entry) => sum + Number(entry.hours || 0) * Number(entry.hourly_value || 0) + Number(entry.donated_goods_value || 0), 0);

  const currentYearProjects = projects.filter(p => (p.school_year || schoolYear.label) === schoolYear.label);

  const { dateStr: targetFriday, pastDeadline } = lastFridayInfo();
  const activeStudentNames = [...new Set(projects.filter(p=>p.status==='active').flatMap(p=>(p.student_names||'').split(',')).map(n=>n.trim().toLowerCase()).filter(Boolean))];
  // Match against actual student accounts (by id) rather than fuzzy name text — the free-typed
  // student_names field can drift in case/spelling and was causing already-submitted (and even
  // already-approved) check-ins to still show up as "missing" here.
  const activeStudentUsers = users.filter(u => u.role !== 'admin' && !u.is_archived && activeStudentNames.includes((u.full_name||'').trim().toLowerCase()));
  const exemptWeeks = new Set(exemptions.map(x=>x.week_ending));
  // A rejected/returned check-in doesn't count as submitted — it goes back on the missing list
  // until the student resubmits it. Only the student who actually submitted it gets credit.
  const dismissedIds = new Set(dismissals.filter(d => d.week_ending === targetFriday).map(d => d.student_id));
  const missing = exemptWeeks.has(targetFriday) || isFullSchoolWeekClosed(targetFriday) ? [] : activeStudentUsers.filter(u => !isEnrollmentWeekCheckIn(u, targetFriday) && !dismissedIds.has(u.id) && !checks.some(c => {
    if (weekEndingFriday(c.week_ending) !== targetFriday || c.created_by_id !== u.id || c.approval_status === 'rejected') return false;
    if (['duplicate', 'extra'].includes(c.grade_status)) return false;
    if (c.is_backdated) return true;
    return isCheckInGradeEligible(c, u);
  }));
  const dismissMissingCheckIn = async (student, reason) => {
    await base44.entities.CheckInDismissal.create({ student_id: student.id, student_name: student.full_name, week_ending: targetFriday, reason });
    reloadDismissals();
  };
  const pendingChecks = checks.filter(c => c.approval_status === 'pending' && !isNineWeeksClosed(weekEndingFriday(c.week_ending)));
  const decideCheck = async (item, approval_status) => {
    if (isNineWeeksClosed(weekEndingFriday(item.week_ending))) return;
    await base44.entities.WeeklyCheckIn.update(item.id, { approval_status });
    if (approval_status === 'approved') {
      // Credit only the student who submitted this check-in, not everyone tagged in student_names.
      const submitter = users.find(u => u.id === item.created_by_id);
      await base44.entities.ServiceEntry.create({ project_title: item.project_title, project_pitch_id: item.project_pitch_id, student_names: submitter?.full_name || item.student_names, student_emails: submitter?.email || '', member_ids: submitter ? [submitter.id] : [], member_emails: submitter?.email ? [submitter.email.toLowerCase()] : [], partner_name: item.partner_name, service_date: item.week_ending, hours: item.hours, hourly_value: item.hourly_value, description: item.accomplishment, weekly_check_in_id: item.id });
    }
    reloadChecks();
  };
  const pendingPitches = pitches.filter(p => (p.approval_status || 'pending') === 'pending');
  const decidePitch = async (item, approval_status, feedback) => {
    await base44.entities.ProjectPitch.update(item.id, { approval_status });
    if (approval_status === 'approved') {
      const memberEmails = [...new Set([...(item.member_emails || []), ...(item.tagged_emails || '').split(','), users.find(user => user.id === item.created_by_id)?.email].map(email => String(email || '').trim().toLowerCase()).filter(Boolean))];
      const memberIds = users.filter(user => memberEmails.includes((user.email || '').toLowerCase())).map(user => user.id);
      await base44.entities.Project.create({ title: item.project_title, student_names: item.student_names || 'Unassigned', client_name: item.client_name, partner_name: item.community_partner_name || item.client_partner_name, technology_tools: item.technology_use, community_need: item.problem, status: 'active', project_pitch_id: item.id, member_ids: memberIds, member_emails: memberEmails, school_year: schoolYear.label });
    }
    if (approval_status === 'rejected' && feedback) {
      await base44.entities.Comment.create({ parent_type: 'pitch', parent_id: item.id, message: feedback, author_name: me?.full_name || 'Teacher', author_role: 'admin' });
    }
    reloadPitches();
  };

  return <>{isAdmin && <AdminDoNowReminder />}<MissionControlOverview activeProjects={currentYearProjects.filter(x=>x.status==='active').length} partners={partners.length} hours={hours.toFixed(1)} impact={`$${impact.toLocaleString(undefined,{maximumFractionDigits:0})}`} schoolYear={schoolYear.label} />
    {isAdmin && <><ProjectWorkTracker users={users} /><div className="mb-6"><UrgentHelpPanel /></div></>}
    {!isAdmin && <><ProjectWorkScore /><StudentMissingWorkPanel student={me} /><StudentOverview projects={projects} partners={partners} /><StudentTasksPanel tasks={tasks} /><MyServiceHours entries={myService} reload={reloadService} /><MyPitchesAndCheckins pitches={myPitches} checks={checks} me={me} /></>}
    {isAdmin && <><div className="mt-6"><QuickPanel title={`Active Projects — ${schoolYear.label}`}>{!currentYearProjects.filter(p=>p.status==='active').length ? <p className="text-sm text-slate-500">No active projects yet this school year.</p> : <div className="max-h-64 space-y-2 overflow-y-auto">{currentYearProjects.filter(p=>p.status==='active').map(p=><div key={p.id} className="flex items-center justify-between border-b py-2 last:border-0 text-sm"><div><p className="font-medium">{p.title}</p><p className="text-xs text-slate-500">{p.student_names} · Client: {p.client_name || 'None'} · Community Partner: {p.partner_name || 'None'}</p></div></div>)}</div>}</QuickPanel></div>
    <div className="mt-6"><QuickPanel title="Pending project pitches">{!pendingPitches.length ? <p className="text-sm text-slate-500">Nothing waiting on approval.</p> : <div className="space-y-3">{pendingPitches.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0"><div><p className="text-sm font-medium">{p.project_title}</p><p className="text-xs text-slate-500">Submitted by {p.student_names} · Tagged: {p.tagged_emails}</p><p className="text-xs text-slate-500">Client: {p.client_name || 'None'} · Community Partner: {p.community_partner_name || p.client_partner_name || 'None'}</p><p className="text-xs text-slate-500">{p.solution}</p></div><div className="flex flex-wrap gap-2"><AdminPitchEditor pitch={p} partners={partners} users={users} onSave={async changes => { await base44.entities.ProjectPitch.update(p.id, changes); await reloadPitches(); }} /><button onClick={()=>decidePitch(p,'approved')} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">Approve</button><RejectWithFeedback onReject={(feedback)=>decidePitch(p,'rejected',feedback)} /></div></div>)}</div>}</QuickPanel></div>
    <div className="mt-6"><QuickPanel title="Project pitches tagging me">{!me ? <p className="text-sm text-slate-500">Loading…</p> : !myPitches.length ? <p className="text-sm text-slate-500">No pitches tag you yet.</p> : <div className="space-y-3">{myPitches.map(p=><div key={p.id} className="border-b pb-3 last:border-0"><p className="text-sm font-medium">{p.project_title}</p><p className="text-xs text-slate-500">Submitted by {p.student_names} · Submitted {new Date(p.created_date).toLocaleString()}</p></div>)}</div>}</QuickPanel></div>
    <div className="mt-6"><QuickPanel title="This week's check-in status">{!pastDeadline ? <p className="text-sm text-slate-500">This week's check-in is due Friday at midnight — nothing overdue yet.</p> : !activeStudentUsers.length ? <p className="text-sm text-slate-500">No active project students to track.</p> : !missing.length ? <p className="text-sm text-green-700">Everyone submitted their check-in for the week ending {targetFriday}.</p> : <><p className="mb-2 text-sm text-slate-500">Missing check-in for the week ending {targetFriday}:</p><div className="flex flex-wrap gap-2">{missing.map(u=><MissingCheckInRow key={u.id} student={u} onDismiss={dismissMissingCheckIn} />)}</div></>}</QuickPanel></div>
    <div className="mt-6"><QuickPanel title="Backdated check-ins awaiting approval">{!pendingChecks.length ? <p className="text-sm text-slate-500">Nothing waiting on approval.</p> : <div className="space-y-3">{pendingChecks.map(c=><div key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0"><div><p className="text-sm font-medium">{c.project_title}</p><p className="text-xs text-slate-500">{c.student_names} · week ending {c.week_ending} · {c.hours} hrs</p>{c.late_reason && <p className="text-xs text-slate-500">Reason: {c.late_reason}</p>}</div><div className="flex gap-2"><button onClick={()=>decideCheck(c,'approved')} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">Approve</button><button onClick={()=>decideCheck(c,'rejected')} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">Reject</button></div></div>)}</div>}</QuickPanel></div>
    <div className="mt-6"><QuickPanel title="Project pitches & their check-ins">{!pitches.length ? <p className="text-sm text-slate-500">No pitches submitted yet.</p> : <div className="space-y-4">{pitches.map(p=>{const tagged=checks.filter(c=>c.project_pitch_id===p.id);return <div key={p.id} className="border-b pb-3 last:border-0"><p className="text-sm font-medium">{p.project_title}</p><p className="text-xs text-slate-500">Submitted by {p.student_names} · <span className="capitalize">{p.approval_status || 'pending'}</span></p>{!tagged.length ? <p className="mt-1 text-xs text-slate-400">No check-ins tagged yet.</p> : <div className="mt-2 space-y-1">{tagged.map(c=><p key={c.id} className="text-xs text-slate-600">• {c.student_names} — week ending {c.week_ending} ({c.hours} hrs){c.approval_status==='pending' && <span className="ml-1 font-semibold text-amber-700">pending</span>}</p>)}</div>}</div>;})}</div>}</QuickPanel></div>
    <div className="mt-6"><StudentServiceHours entries={approvedYearService} users={users} /></div></>}
  </>;
}