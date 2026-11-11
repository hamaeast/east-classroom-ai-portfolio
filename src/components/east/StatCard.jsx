export default function StatCard({ label, value, detail, tone = 'navy' }) {
  const tones = { navy: 'border-mission-gold', cyan: 'border-mission-cyan', green: 'border-mission-cyan', amber: 'border-mission-gold' };
  return <div className={`glass-panel rounded-sm border-l-2 p-5 transition hover:-translate-y-0.5 ${tones[tone]}`}>
    <p className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold text-foreground">{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
  </div>;
}