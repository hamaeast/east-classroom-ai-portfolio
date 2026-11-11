export default function PitchLifecycleActions({ status, onComplete, onArchive, onDelete }) {
  if (status === 'deleted') return null;
  return <>
    {status !== 'completed' && <button type="button" onClick={onComplete} className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white">Mark complete</button>}
    {status !== 'archived' && <button type="button" onClick={onArchive} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground">Archive</button>}
    <button type="button" onClick={onDelete} className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">Delete</button>
  </>;
}