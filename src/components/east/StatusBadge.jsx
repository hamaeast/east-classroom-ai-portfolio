export default function StatusBadge({ status }) {
  const colors = { active:'bg-emerald-50 text-emerald-700', complete:'bg-emerald-50 text-emerald-700', approved:'bg-emerald-50 text-emerald-700', planning:'bg-blue-50 text-blue-700', pending:'bg-blue-50 text-blue-700', prospective:'bg-amber-50 text-amber-700', blocked:'bg-red-50 text-red-700', rejected:'bg-red-50 text-red-700', inactive:'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${colors[status] || colors.inactive}`}>{status}</span>;
}