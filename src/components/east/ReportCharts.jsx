import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import QuickPanel from './QuickPanel';

const COLORS = ['#117b8a', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportCharts({ projects, service, tech, pitches = [] }) {
  const statusCounts = ['planning', 'active', 'blocked', 'complete'].map(status => ({ name: status, value: projects.filter(p => p.status === status).length })).filter(x => x.value > 0);
  const hoursByMonth = {};
  service.forEach(s => { const m = (s.service_date || '').slice(0, 7); if (!m) return; hoursByMonth[m] = (hoursByMonth[m] || 0) + Number(s.hours || 0); });
  const hoursData = Object.entries(hoursByMonth).sort().map(([month, hours]) => ({ month, hours: Number(hours.toFixed(1)) }));
  const approvedPitches = pitches.filter(p => p.approval_status === 'approved');
  const techData = tech.map(name => ({ name, count: approvedPitches.filter(p => (p.technology_use || '').includes(name)).length }));
  const totalServiceHours = service.reduce((s, x) => s + Number(x.hours || 0), 0);

  // Dedupe technology from project.technology_tools case-insensitively, auto-correcting to Title Case,
  // and count distinct students using each one.
  const techByProject = {};
  projects.forEach(p => {
    const studentNames = (p.student_names || '').split(',').map(s => s.trim()).filter(Boolean);
    (p.technology_tools || '').split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
      const key = t.toLowerCase();
      if (!techByProject[key]) techByProject[key] = { display: t.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()), students: new Set() };
      studentNames.forEach(s => techByProject[key].students.add(s));
    });
  });
  const projectTechList = Object.values(techByProject).map(x => ({ name: x.display, students: x.students.size })).sort((a, b) => b.students - a.students);

  return <div className="grid gap-6 lg:grid-cols-2">
    <QuickPanel title="Project Status Breakdown">
      {statusCounts.length ? <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={statusCounts} dataKey="value" nameKey="name" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>{statusCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <p className="text-sm text-slate-500">No projects yet.</p>}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Projects</p><p className="text-lg font-semibold text-slate-950">{projects.length}</p></div>
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Service hours entered</p><p className="text-lg font-semibold text-slate-950">{totalServiceHours.toFixed(1)}</p></div>
      </div>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Technology across projects</p>
        {projectTechList.length ? <ul className="space-y-1 text-sm">
          {projectTechList.map(t => <li key={t.name} className="flex items-center justify-between"><span>{t.name}</span><span className="text-slate-500">{t.students} student{t.students === 1 ? '' : 's'}</span></li>)}
        </ul> : <p className="text-sm text-slate-500">No technology recorded yet.</p>}
      </div>
    </QuickPanel>
    <QuickPanel title="Service Hours by Month">
      {hoursData.length ? <ResponsiveContainer width="100%" height={220}><BarChart data={hoursData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="hours" fill="#0ea5e9" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="text-sm text-slate-500">No service hours logged yet.</p>}
    </QuickPanel>
    <QuickPanel title="Technology Usage Across Projects">
      {techData.length ? <ResponsiveContainer width="100%" height={220}><BarChart data={techData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} fontSize={12} /><YAxis type="category" dataKey="name" width={100} fontSize={12} /><Tooltip /><Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer> : <p className="text-sm text-slate-500">No technology recorded yet.</p>}
    </QuickPanel>
  </div>;
}