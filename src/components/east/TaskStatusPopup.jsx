const statusText = { accepted: 'Your teacher agreed to this task.', declined: 'Your teacher declined this task.', completed: 'Your teacher completed this task.' };

export default function TaskStatusPopup({ notices, dismissing, onDismiss }) {
  if (!notices.length) return null;
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
    <div className="glass-panel w-full max-w-md rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-foreground">Task status update{notices.length > 1 ? 's' : ''}</h2>
      <ul className="my-4 max-h-72 space-y-3 overflow-y-auto">{notices.map(task => <li key={`${task.id}:${task.status}`} className="border-b border-border/60 pb-3 last:border-0"><p className="font-semibold">{task.title}</p><p className="text-sm text-muted-foreground">{statusText[task.status]}</p></li>)}</ul>
      <button disabled={dismissing} onClick={onDismiss} className="east-button w-full">{dismissing ? 'Dismissing…' : 'Dismiss'}</button>
    </div>
  </div>;
}