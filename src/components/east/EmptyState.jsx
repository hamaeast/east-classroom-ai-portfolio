export default function EmptyState({ children = 'No records yet.' }) {
  return <div className="glass-panel rounded-sm border-dashed border-mission-cyan/50 px-6 py-12 text-center text-sm text-muted-foreground">{children}</div>;
}