import { BANDS, LEVELS, maskCount } from '@/lib/usageStats';

export default function StandardsUsageTable({ rows, note }) {
  return <section className="mb-6 overflow-hidden rounded-xl border bg-white shadow-sm">
    <div className="border-b px-5 py-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-neon-cyan">Standards — highest placement per student</h3>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
    <div className="overflow-x-auto">
      <table className="east-table">
        <thead><tr><th>Standard</th>{BANDS.map(band => <th key={band} className="text-right">{band}</th>)}{LEVELS.map(level => <th key={level} className="text-right">{level}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.key}>
          <td>{row.name}</td>
          {BANDS.map(band => <td key={band} className="text-right tabular-nums">{maskCount(row.bands[band])}</td>)}
          {LEVELS.map(level => <td key={level} className="text-right tabular-nums">{maskCount(row.levels[level])}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}