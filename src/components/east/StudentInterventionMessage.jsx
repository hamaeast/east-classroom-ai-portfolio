export default function StudentInterventionMessage({ recipients, checked, onChecked, message, onMessage }) {
  const names = recipients.map(student => student.display_name || student.full_name || student.email).join(', ');
  return <div className="rounded-lg border bg-muted/30 p-3">
    <label className="flex items-start gap-2 text-sm font-semibold">
      <input type="checkbox" className="mt-0.5 min-h-0" checked={checked} disabled={!recipients.length} onChange={event => onChecked(event.target.checked)} />
      Send a copy of the intervention message to the student{recipients.length === 1 ? '' : 's'}
    </label>
    <p className="mt-1 text-xs text-muted-foreground">{recipients.length ? `Recipients: ${names}` : 'No applicable student accounts were found for this concern.'}</p>
    {checked && <label className="east-label mt-3 block">Suggested message — edit before sending<textarea rows="5" className="mt-1" value={message} onChange={event => onMessage(event.target.value)} /></label>}
  </div>;
}