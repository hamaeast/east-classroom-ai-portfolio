const VIEWS = [
  ['pending', 'New'],
  ['revision_requested', 'Revision Pending'],
  ['approved', 'Approved'],
  ['completed', 'Completed'],
  ['archived', 'Archived'],
  ['deleted', 'Deleted'],
];

export default function PitchViewToggle({ value, onChange, counts }) {
  return <div className="mb-5 flex w-fit flex-wrap rounded-lg border border-border bg-card p-1">
    {VIEWS.map(([key, label]) => <button key={key} type="button" onClick={() => onChange(key)} className={`rounded-md px-4 py-2 text-sm font-semibold ${value === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{label} ({counts[key] || 0})</button>)}
  </div>;
}