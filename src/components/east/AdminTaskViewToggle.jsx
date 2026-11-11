export default function AdminTaskViewToggle({ value, onChange }) {
  return <div className="mb-6 inline-flex rounded-lg border border-border bg-muted/50 p-1" aria-label="Task view">
    <button type="button" onClick={() => onChange('new')} aria-pressed={value === 'new'} className={value === 'new' ? 'rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground' : 'rounded-md px-4 py-2 text-sm font-semibold text-muted-foreground'}>New</button>
    <button type="button" onClick={() => onChange('completed')} aria-pressed={value === 'completed'} className={value === 'completed' ? 'rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground' : 'rounded-md px-4 py-2 text-sm font-semibold text-muted-foreground'}>Completed</button>
  </div>;
}