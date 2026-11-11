export default function UsageStatsTable({ title, note, rows }) {
  return <section className="mb-6 overflow-hidden rounded-xl border bg-white shadow-sm">
    <div className="border-b px-5 py-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-neon-cyan">{title}</h3>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
    <table className="east-table">
      <thead><tr><th>What it counts</th><th className="w-40 text-right">Number</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.label}><td>{row.label}</td><td className="text-right font-semibold tabular-nums">{row.value}</td></tr>)}</tbody>
    </table>
  </section>;
}