import QuickPanel from './QuickPanel';

export default function StudentServiceHours({ entries, users = [] }) {
  const emailToName = {};
  users.forEach(u => { if (u.email) emailToName[u.email.toLowerCase()] = u.full_name || u.email; });
  const byStudent = {};
  entries.forEach(x => {
    // student_names lists every teammate tagged on the entry, but student_emails records only
    // who the hours actually belong to — prefer that so a tagged-but-not-submitting student
    // isn't credited with hours they didn't earn.
    const emails = (x.student_emails || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    if (emails.length) {
      emails.forEach(email => {
        const name = emailToName[email] || email;
        byStudent[name] = (byStudent[name] || 0) + Number(x.hours || 0);
      });
    } else {
      (x.student_names || '').split(',').map(n => n.trim()).filter(Boolean).forEach(name => {
        byStudent[name] = (byStudent[name] || 0) + Number(x.hours || 0);
      });
    }
  });
  const rows = Object.entries(byStudent).sort((a, b) => b[1] - a[1]);
  return <div className="mt-6">
    <QuickPanel title="Service hours by student — this school year">
      {!rows.length ? <p className="text-sm text-slate-500">No service hours logged yet.</p> : <div className="max-h-72 space-y-2 overflow-y-auto">
        {rows.map(([name, total]) => <div key={name} className="flex items-center justify-between border-b py-2 last:border-0 text-sm">
          <p className="font-medium">{name}</p>
          <span className="text-xs font-semibold text-slate-600">{total.toFixed(1)} hrs</span>
        </div>)}
      </div>}
    </QuickPanel>
  </div>;
}