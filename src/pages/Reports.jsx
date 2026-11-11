import { Link } from 'react-router-dom';
import { Printer, UserRoundSearch } from 'lucide-react';
import useEntityList from '@/hooks/useEntityList';
import PageHeader from '@/components/east/PageHeader';
import StatCard from '@/components/east/StatCard';
import QuickPanel from '@/components/east/QuickPanel';
import ReportCharts from '@/components/east/ReportCharts';
import CustomServiceReport from '@/components/east/CustomServiceReport';
import CheckInComplianceReport from '@/components/east/CheckInComplianceReport';
import StandardsProficiencyMix from '@/components/east/StandardsProficiencyMix';
import { currentSchoolYearRange, previousSchoolYearRange, inSchoolYear } from '@/lib/schoolYear';
import { approvedServiceEntries } from '@/lib/approvedServiceHours';

export default function Reports() {
  const {items:projects}=useEntityList('Project'); const {items:partners}=useEntityList('CommunityPartner'); const {items:service}=useEntityList('ServiceEntry'); const {items:checks}=useEntityList('WeeklyCheckIn'); const {items:pitches}=useEntityList('ProjectPitch'); const {items:users}=useEntityList('User'); const {items:exemptions}=useEntityList('CheckInExemption'); const {items:dismissals}=useEntityList('CheckInDismissal'); const {items:assessments}=useEntityList('StandardsAssessment');
  const countedService=approvedServiceEntries(service,checks,pitches).filter(x=>(x.approval_status||'approved')==='approved');
  const schoolYear=currentSchoolYearRange(); const yearService=countedService.filter(x=>inSchoolYear(x.service_date,schoolYear));
  const prevSchoolYear=previousSchoolYearRange(); const prevYearService=countedService.filter(x=>inSchoolYear(x.service_date,prevSchoolYear));
  const hours=yearService.reduce((s,x)=>s+Number(x.hours||0),0), impact=yearService.reduce((s,x)=>s+Number(x.hours||0)*Number(x.hourly_value||0)+Number(x.donated_goods_value||0),0);
  const prevHours=prevYearService.reduce((s,x)=>s+Number(x.hours||0),0), prevImpact=prevYearService.reduce((s,x)=>s+Number(x.hours||0)*Number(x.hourly_value||0)+Number(x.donated_goods_value||0),0);
  const tech=[...new Set(pitches.filter(x=>x.approval_status==='approved').flatMap(x=>(x.technology_use||'').split(',').map(t=>t.trim()).filter(Boolean)))];
  const byPartner=partners.map(p=>{const label=p.contact_name||p.name;const entries=countedService.filter(x=>x.partner_name===label);return {name:label,hours:entries.reduce((s,x)=>s+Number(x.hours||0),0),value:entries.reduce((s,x)=>s+Number(x.hours||0)*Number(x.hourly_value||0)+Number(x.donated_goods_value||0),0)};}).filter(x=>x.hours>0);
  return <><PageHeader title="Administrator Report" description="A concise, printable snapshot of program activity, accountability, and community value." action={<button onClick={()=>window.print()} className="east-button print:hidden"><Printer size={16}/>Print report</button>}/>
    <p className="mb-4 text-sm text-slate-500">Reporting date: {new Date().toLocaleDateString()} · Service hours shown for the {schoolYear.label} school year (Aug 1 – Jul 31)</p><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Projects" value={projects.length} detail={`${projects.filter(x=>x.status==='complete').length} completed`} tone="cyan"/><StatCard label="Community Partners" value={partners.length}/><StatCard label="Service Hours" value={hours.toFixed(1)} detail={`${schoolYear.label} · ${prevHours.toFixed(1)} in ${prevSchoolYear.label}`} tone="green"/><StatCard label="Community Value" value={`$${impact.toLocaleString(undefined,{maximumFractionDigits:0})}`} detail={`${schoolYear.label} · $${prevImpact.toLocaleString(undefined,{maximumFractionDigits:0})} in ${prevSchoolYear.label}`} tone="amber"/></div>
    <div className="mt-6 print:hidden"><QuickPanel title="Individual Student Report"><p className="mb-3 text-sm text-slate-600">View one student's full snapshot — their projects with weekly check-ins tagged to each, community service report, and skills log.</p><Link to="/student-report" className="east-button inline-flex"><UserRoundSearch size={16}/>Run student report</Link></QuickPanel></div>
    <div className="mt-6 print:hidden"><CustomServiceReport service={countedService} users={users} /></div>
    <div className="mt-6"><CheckInComplianceReport projects={projects} checks={checks} schoolYear={schoolYear} users={users} exemptions={exemptions} dismissals={dismissals} /></div>
    <div className="mt-6"><StandardsProficiencyMix assessments={assessments} /></div>
    <div className="mt-6"><ReportCharts projects={projects} service={countedService} tech={tech} pitches={pitches} /></div>
    <div className="mt-6"><QuickPanel title="Technology Applied"><div className="flex flex-wrap gap-2">{tech.length ? tech.map(x=><span key={x} className="rounded-full bg-cyan-50 px-3 py-1 text-sm text-cyan-800">{x}</span>) : <p className="text-sm text-slate-500">No technology recorded yet.</p>}</div></QuickPanel></div>
    <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm"><h3 className="mb-4 text-sm font-semibold">Value by Community Partner</h3>{byPartner.length ? <table className="east-table"><thead><tr><th>Partner</th><th>Hours</th><th>Community value</th></tr></thead><tbody>{byPartner.map(x=><tr key={x.name}><td className="font-medium">{x.name}</td><td>{x.hours.toFixed(1)}</td><td>${x.value.toLocaleString(undefined,{maximumFractionDigits:0})}</td></tr>)}</tbody></table> : <p className="text-sm text-slate-500">No partner-linked service hours yet.</p>}</div>
    <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm"><h3 className="mb-4 text-sm font-semibold">Project Portfolio</h3><table className="east-table"><thead><tr><th>Project</th><th>Students</th><th>Status</th><th>Progress</th><th>Technology</th></tr></thead><tbody>{projects.map(x=><tr key={x.id}><td className="font-medium">{x.title}</td><td>{x.student_names}</td><td className="capitalize">{x.status}</td><td>{x.progress||0}%</td><td>{x.technology_tools||'—'}</td></tr>)}</tbody></table></div>
    <p className="mt-6 text-xs text-slate-500">Community value uses each service entry’s documented hourly volunteer rate plus donated goods. Adjust the rate when local or role-specific valuation is more appropriate.</p></>;
}