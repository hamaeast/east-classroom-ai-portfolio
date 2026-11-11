export default function PageHeader({ eyebrow = 'EAST Initiative', title, description, action }) {
  return <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div><p className="text-xs font-bold uppercase tracking-[.18em] text-neon-magenta">{eyebrow}</p><h2 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{title}</h2>{description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}</div>
    {action}
  </header>;
}