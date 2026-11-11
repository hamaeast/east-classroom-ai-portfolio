import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import PageHeader from '@/components/east/PageHeader';
import StatCard from '@/components/east/StatCard';
import EmptyState from '@/components/east/EmptyState';
import RejectWithFeedback from '@/components/east/RejectWithFeedback';
import { currentSchoolYearRange, inSchoolYear } from '@/lib/schoolYear';
import { isForApprovedPitch } from '@/lib/approvedServiceHours';

const HOURLY_VALUE = 11.00; // Arkansas minimum wage

export default function ServiceHours() {
  const {items,loading,reload}=useEntityList('ServiceEntry');
  const {items:pitches}=useEntityList('ProjectPitch');
  const {items:checkIns}=useEntityList('WeeklyCheckIn');
  const {items:users}=useEntityList('User');
  const students = users.filter(u=>u.role!=='admin' && !u.is_archived);
  const blank={project_title:'',project_pitch_id:'',studentEmails:[],service_date:'',hours:'',description:''};
  const [form,setForm]=useState(blank);
  const schoolYear = currentSchoolYearRange();
  const yearItems = items.filter(x => inSchoolYear(x.service_date, schoolYear));
  const approvedPitches = pitches.filter(pitch => pitch.approval_status === 'approved' && (pitch.community_partner_name || pitch.client_partner_name));
  const eligibleItems = yearItems.filter(x => isForApprovedPitch(x, checkIns, pitches));
  const approvedItems = eligibleItems.filter(x => (x.approval_status || 'approved') === 'approved');
  const countedIds = new Set(approvedItems.map(item => item.id));
  const hours=approvedItems.reduce((s,x)=>s+Number(x.hours||0),0), impact=hours*HOURLY_VALUE;
  // Stack entries logged for the same project into one row — combined hours/value — while still
  // ordering the list by date (using each group's most recent service date).
  const groupedByProject = Object.values(eligibleItems.reduce((acc, x) => {
    const key = x.project_title;
    if (!acc[key]) acc[key] = { project_title: key, service_date: x.service_date, hours: 0, value: 0, studentNames: new Set(), descriptions: [] };
    const g = acc[key];
    if (x.service_date > g.service_date) g.service_date = x.service_date;
    if (countedIds.has(x.id)) {
      g.hours += Number(x.hours || 0);
      g.value += Number(x.hours || 0) * Number(x.hourly_value || HOURLY_VALUE);
    }
    (x.student_names || '').split(',').map(s => s.trim()).filter(Boolean).forEach(n => g.studentNames.add(n));
    if (x.description) g.descriptions.push({ id: x.id, date: x.service_date, description: x.description, status: x.approval_status || 'approved', feedback: x.admin_feedback || '' });
    return acc;
  }, {})).map(g => ({ ...g, descriptions: g.descriptions.sort((a, b) => new Date(a.date) - new Date(b.date)) })).sort((a, b) => new Date(b.service_date) - new Date(a.service_date));
  const toggleStudent = (email) => setForm(f=>({...f, studentEmails: f.studentEmails.includes(email) ? f.studentEmails.filter(e=>e!==email) : [...f.studentEmails, email]}));
  const submit=async(e)=>{
    e.preventDefault();
    const tagged = students.filter(s=>form.studentEmails.includes(s.email));
    const pitch = approvedPitches.find(item => item.id === form.project_pitch_id);
    await base44.entities.ServiceEntry.create({
      project_title: pitch.project_title,
      project_pitch_id: pitch.id,
      partner_name: pitch.community_partner_name || pitch.client_partner_name,
      student_names: tagged.map(s=>s.full_name || s.email).join(', '),
      student_emails: tagged.map(s=>s.email).join(', '),
      member_ids: tagged.map(s=>s.id),
      member_emails: tagged.map(s=>s.email.toLowerCase()),
      service_date: form.service_date,
      hours: Number(form.hours),
      hourly_value: HOURLY_VALUE,
      description: form.description,
    });
    setForm(blank);
    reload();
  };
  const returnEntry = async (entry, feedback) => {
    await base44.entities.ServiceEntry.update(entry.id, { approval_status: 'rejected', admin_feedback: feedback, ai_check_attempts: 0 });
    reload();
  };
  const approveEntry = async (entry) => {
    await base44.entities.ServiceEntry.update(entry.id, { approval_status: 'approved', admin_feedback: '' });
    reload();
  };
  return <><PageHeader title="Service Impact" description={`Value service consistently: verified hours × Arkansas minimum wage ($${HOURLY_VALUE.toFixed(2)}/hr). Showing the ${schoolYear.label} school year (Aug 1 – Jul 31).`}/>
    <div className="mb-6 grid gap-4 sm:grid-cols-2"><StatCard label="Hours" value={hours.toFixed(1)} detail={`${schoolYear.label} school year`} tone="green"/><StatCard label="Total Estimated Value" value={`$${impact.toLocaleString(undefined,{maximumFractionDigits:2})}`} detail="labor value" tone="amber"/></div>
    <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border bg-white p-5 shadow-sm md:grid-cols-4">
      <select required value={form.project_pitch_id} onChange={e=>setForm({...form,project_pitch_id:e.target.value})}>
        <option value="">Select approved pitch with community partner…</option>
        {approvedPitches.map(p=><option key={p.id} value={p.id}>{p.project_title}</option>)}
      </select>
      <div className="east-label">
        Students
        <select multiple value={form.studentEmails} onChange={e=>setForm({...form,studentEmails:Array.from(e.target.selectedOptions).map(o=>o.value)})} className="h-auto">
          {students.map(s=><option key={s.id} value={s.email}>{s.full_name || s.email}</option>)}
        </select>
      </div>
      <input required type="date" value={form.service_date} onChange={e=>setForm({...form,service_date:e.target.value})}/>
      <input required type="number" step=".25" min="0" placeholder="Hours" value={form.hours} onChange={e=>setForm({...form,hours:e.target.value})}/>
      <input placeholder="Work completed" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
      <button className="east-button">Log service</button>
    </form>
    {loading ? <p>Loading…</p> : !groupedByProject.length ? <EmptyState>Log verified service work above.</EmptyState> : <div className="overflow-hidden rounded-xl border bg-white"><table className="east-table"><thead><tr><th>Date</th><th>Project</th><th>Student(s)</th><th>Hours</th><th>Accomplishment</th><th>Calculated value</th></tr></thead><tbody>{groupedByProject.map(g=><tr key={g.project_title}><td>{g.service_date}</td><td className="font-medium">{g.project_title}</td><td>{[...g.studentNames].join(', ') || '—'}</td><td>{g.hours}</td><td>{g.descriptions.length ? <ul className="space-y-2">{g.descriptions.map(d => <li key={d.id} className="flex flex-wrap items-center gap-2"><span><span className="text-xs text-muted-foreground">{d.date}:</span> {d.description}</span>{d.status === 'pending' ? <><button onClick={() => approveEntry(d)} className="rounded-lg bg-neon-cyan px-2 py-1 text-xs font-semibold text-background">Approve edit</button><RejectWithFeedback onReject={(feedback) => returnEntry(d, feedback)} label="Reject edit" confirmLabel="Send back again" /></> : d.status === 'rejected' ? <span className="text-xs font-semibold text-neon-magenta">Waiting on student</span> : <RejectWithFeedback onReject={(feedback) => returnEntry(d, feedback)} label="Return to student" confirmLabel="Send back" />}</li>)}</ul> : '—'}</td><td>${g.value.toFixed(2)}</td></tr>)}</tbody></table></div>}
  </>;
}