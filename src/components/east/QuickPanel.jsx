export default function QuickPanel({ title, children }) {
  return <section className="glass-panel rounded-sm p-5 transition"><div className="mb-4 flex items-center gap-3"><h3 className="font-display text-sm font-bold uppercase tracking-wider text-mission-cyan">{title}</h3><span className="h-px flex-1 bg-mission-cyan/35" /></div>{children}</section>;
}