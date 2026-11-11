import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/east/PageHeader';
import StatCard from '@/components/east/StatCard';
import QuickPanel from '@/components/east/QuickPanel';
import EmptyState from '@/components/east/EmptyState';
import LearningSummaryView from '@/components/east/LearningSummaryView';
import StudentInputHistory from '@/components/east/StudentInputHistory';
import AbsenceImpactReport from '@/components/east/AbsenceImpactReport';
import MissingAssignmentsReport from '@/components/east/MissingAssignmentsReport';
import { approvedServiceEntries } from '@/lib/approvedServiceHours';

export default function StudentReport() {
  const { items: projects } = useEntityList('Project');
  const { items: service } = useEntityList('ServiceEntry');
  const { items: checks } = useEntityList('WeeklyCheckIn');
  const { items: skills } = useEntityList('StudentSkill');
  const { items: pitches } = useEntityList('ProjectPitch');
  const { items: weeklyGoals } = useEntityList('WeeklyGoal');
  const { items: assignments } = useEntityList('Assignment');
  const { items: assignmentGrades } = useEntityList('AssignmentGrade');
  const { items: readingResponses } = useEntityList('ReadingResponse');
  const { items: users } = useEntityList('User');
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';

  const names = users.filter(u => u.role !== 'admin' && !u.is_archived)
    .map(u => u.full_name || u.email)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const [selected, setSelected] = useState('');
  const [includeDenied, setIncludeDenied] = useState(false);
  useEffect(() => { if (!isAdmin && me?.full_name) setSelected(me.full_name); }, [isAdmin, me]);

  const myProjects = selected ? projects.filter(p => (p.student_names || '').includes(selected)) : [];
  const selectedUser = users.find(u => u.full_name === selected);
  // Match service entries by the submitter's email when recorded — student_names lists every
  // teammate tagged on the entry, so a name-substring match would also credit hours to students
  // who were only tagged, not the one who actually submitted/earned them.
  const countedService = approvedServiceEntries(service, checks, pitches).filter(s => (s.approval_status || 'approved') === 'approved');
  const myService = selected ? countedService.filter(s => {
    const emails = (s.student_emails || '').toLowerCase().split(',').map(e => e.trim()).filter(Boolean);
    if (emails.length) return selectedUser && emails.includes((selectedUser.email || '').toLowerCase());
    return (s.student_names || '').includes(selected);
  }) : [];
  const myChecks = selectedUser ? checks.filter(c => c.created_by_id === selectedUser.id) : [];
  const myGoals = selectedUser ? weeklyGoals.filter(goal => goal.student_id === selectedUser.id) : [];
  const myAssignmentGrades = selectedUser ? assignmentGrades.filter(grade => grade.student_id === selectedUser.id && assignments.some(assignment => assignment.id === grade.assignment_id && !/^(Weekly Goal|Goal Reflection)/.test(assignment.title))) : [];
  const myReadingResponses = selectedUser ? readingResponses.filter(response => response.student_id === selectedUser.id) : [];
  const myCerts = selected ? skills.filter(s => s.student_name === selected && s.certification_name) : [];
  const mySkills = selected ? skills.filter(s => s.student_name === selected) : [];
  const skillsByYear = mySkills.reduce((acc, s) => { const y = s.school_year || 'Unspecified year'; (acc[y] = acc[y] || []).push(s); return acc; }, {});
  const myPitches = selected ? pitches.filter(p => (p.student_names || '').includes(selected))
    .filter(p => p.approval_status === 'approved' || (includeDenied && p.approval_status === 'rejected')) : [];

  const totalHours = myService.reduce((s, x) => s + Number(x.hours || 0), 0);
  const totalValue = myService.reduce((s, x) => s + Number(x.hours || 0) * Number(x.hourly_value || 0) + Number(x.donated_goods_value || 0), 0);
  const avgGrade = myChecks.filter(x => x.grade != null).reduce((s, x, _, a) => s + Number(x.grade) / a.length, 0);

  return <div className="student-report-print"><PageHeader title={selected ? `Student snapshot — ${selected}` : 'Individual Student Report'} description="A complete record of the student's submitted work, grades, service, projects, and skills." action={selected && <button onClick={() => window.print()} className="east-button print:hidden"><Printer size={16} />Print report</button>} />
    <p className="mb-2 hidden text-sm text-slate-500 print:block">Printed {new Date().toLocaleDateString()}</p>
    {isAdmin ? <select className="mb-6 max-w-sm print:hidden" value={selected} onChange={e => setSelected(e.target.value)}><option value="">Select a student…</option>{names.map(n => <option key={n} value={n}>{n}</option>)}</select> : <p className="mb-6 text-sm text-slate-500">This is your personal report — pitches, check-ins, service hours, and skills you've submitted.</p>}

    {!selected ? <EmptyState>{isAdmin ? 'Choose a student above to view their snapshot.' : 'Your snapshot will appear here once your name is on a project, service entry, or check-in.'}</EmptyState> : <>
      {isAdmin && selectedUser && <div className="mb-6"><h3 className="mb-2 text-sm font-semibold">Learning summary (overall)</h3><LearningSummaryView student={selectedUser} fixedRange="overall" compact /></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Service Hours" value={totalHours.toFixed(1)} tone="green" />
        <StatCard label="Community Value" value={`$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} tone="amber" />
        <StatCard label="Certifications Earned" value={myCerts.length} tone="cyan" />
        <StatCard label="Avg. Check-In Grade" value={avgGrade ? `${avgGrade.toFixed(1)}/10` : '—'} />
      </div>

      {isAdmin && selectedUser && <div className="mt-6 grid gap-4 lg:grid-cols-2"><AbsenceImpactReport student={selectedUser} assignments={assignments} /><MissingAssignmentsReport student={selectedUser} assignments={assignments} grades={myAssignmentGrades} responses={myReadingResponses} today={new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date())} /></div>}

      <StudentInputHistory goals={myGoals} checkIns={myChecks} assignmentGrades={myAssignmentGrades} assignments={assignments} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <QuickPanel title="Certifications">
          {myCerts.length ? <ul className="space-y-1 text-sm">{myCerts.map(c => <li key={c.id}><b>{c.certification_name}</b> — {c.skill_name}{c.certificate_url && <a href={c.certificate_url} target="_blank" rel="noreferrer" className="ml-2 text-cyan-700 underline print:hidden">view</a>}</li>)}</ul> : <p className="text-sm text-slate-500">No certifications logged yet.</p>}
        </QuickPanel>
        <QuickPanel title="Community Partners">
          {myProjects.length ? <ul className="space-y-1 text-sm">{myProjects.map(p => <li key={p.id}>{p.partner_name || 'No partner listed'} — <span className="text-slate-500">{p.title}</span></li>)}</ul> : <p className="text-sm text-slate-500">No projects yet.</p>}
        </QuickPanel>
      </div>

      <div className="mt-6">
        <QuickPanel title="Skills Logged by School Year">
          {Object.keys(skillsByYear).length ? <div className="space-y-4">{Object.entries(skillsByYear).map(([year, yearSkills]) => <div key={year} className="border-b pb-3 last:border-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{year}</p>
            <ul className="space-y-1 text-sm">{yearSkills.map(s => <li key={s.id}><b>{s.skill_name}</b>{s.software_tools ? ` — ${s.software_tools}` : ''} · <span className="capitalize">{s.proficiency}</span></li>)}</ul>
          </div>)}</div> : <p className="text-sm text-slate-500">No skills logged yet.</p>}
        </QuickPanel>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold">Service Hour Log</h3>
        {myService.length ? <table className="east-table"><thead><tr><th>Date</th><th>Project</th><th>Partner</th><th>Hours</th><th>Value</th></tr></thead>
          <tbody>{myService.map(s => <tr key={s.id}><td>{s.service_date}</td><td className="font-medium">{s.project_title}</td><td>{s.partner_name || '—'}</td><td>{s.hours}</td><td>${(Number(s.hours || 0) * Number(s.hourly_value || 0) + Number(s.donated_goods_value || 0)).toFixed(0)}</td></tr>)}</tbody>
        </table> : <p className="text-sm text-slate-500">No service hours logged yet.</p>}
      </div>

      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold">Weekly Service Log</h3>
        {myChecks.length ? <table className="east-table"><thead><tr><th>Week ending</th><th>Community partner</th><th>Hours</th><th>Accomplishment</th></tr></thead>
          <tbody>{[...myChecks].sort((a, b) => (a.week_ending || '').localeCompare(b.week_ending || '')).map(c => <tr key={c.id}><td>{c.week_ending}</td><td>{c.partner_name || '—'}</td><td>{c.hours}</td><td>{c.accomplishment}</td></tr>)}</tbody>
        </table> : <p className="text-sm text-slate-500">No weekly check-ins logged yet.</p>}
      </div>

      <div className="mt-6">
        <QuickPanel title="Project Pitches">
          <label className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-600 print:hidden">
            <input type="checkbox" className="h-4 w-auto" checked={includeDenied} onChange={e => setIncludeDenied(e.target.checked)} />
            Include pitches denied by admin
          </label>
          {myPitches.length ? <div className="space-y-4">{myPitches.map(p => {
            const pitchChecks = checks.filter(c => c.project_pitch_id === p.id);
            return <div key={p.id} className="border-b pb-4 last:border-0 text-sm">
              <p className="font-medium">{p.project_title}</p>
              <p className="text-xs text-slate-500">Submitted by {p.student_names} · <span className="capitalize">{p.approval_status || 'pending'}</span></p>
              <p className="mt-1"><b>Problem:</b> {p.problem}</p>
              <p><b>Solution:</b> {p.solution}</p>
              <div className="mt-2 rounded-lg bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Weekly check-ins for this pitch</p>
                {pitchChecks.length ? <div className="space-y-2">{pitchChecks.map(c => <div key={c.id} className="border-b border-slate-200 pb-2 last:border-0"><p className="font-medium">Week ending {c.week_ending}</p><p className="text-xs text-slate-500">{c.hours} hrs · Grade: {c.grade != null ? `${c.grade}/10` : 'Pending'}</p><p className="mt-1"><b>Accomplished:</b> {c.accomplishment}</p></div>)}</div> : <p className="text-xs text-slate-500">No check-ins tagged to this pitch yet.</p>}
              </div>
            </div>;
          })}</div> : <p className="text-sm text-slate-500">No approved pitches{includeDenied ? ' or denied pitches' : ''} yet.</p>}
        </QuickPanel>
      </div>
    </>}
  </div>;
}