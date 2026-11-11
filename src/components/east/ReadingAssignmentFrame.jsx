import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function ReadingAssignmentFrame({ assignment, previewMode, saving, submission, remaining, savingDraft, draftError, onClose, onSubmit, children }) {
  return createPortal(<div role="dialog" aria-modal="true" aria-labelledby="open-assignment-title" className={previewMode ? 'fixed inset-0 z-[90] overflow-y-auto bg-background p-0' : 'fixed inset-0 z-[90] overflow-y-auto bg-background/95 p-3 backdrop-blur-sm'}>
    <form onSubmit={onSubmit} className={previewMode ? 'min-h-screen w-full overflow-hidden bg-background' : 'glass-panel mx-auto max-w-5xl overflow-hidden'}>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border/60 bg-background/95 p-5"><div><p className="text-xs font-bold uppercase tracking-wider text-neon-magenta">{assignment.assignment_type === 'reading' ? 'Reading assignment' : 'Assignment'}</p><h2 id="open-assignment-title" className="text-2xl font-semibold">{assignment.title}</h2>{assignment.description && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{assignment.description}</p>}</div>{onClose && <button type="button" disabled={saving} onClick={onClose} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-50" aria-label="Exit assignment"><X className="h-4 w-4" />Exit assignment</button>}</header>
      {children}
      <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-background/95 p-4"><p role="status" className="text-xs text-muted-foreground">{previewMode ? 'Student preview — answers will not be saved.' : submission ? 'Your submitted answers are shown above.' : draftError ? draftError : savingDraft ? 'Saving answers…' : `${remaining} question${remaining === 1 ? '' : 's'} remaining · Answers save automatically.`}</p>{!previewMode && !submission && <button type="submit" disabled={saving || remaining > 0} className="east-button">{saving ? 'Submitting…' : 'Submit final answers'}</button>}</footer>
    </form>
  </div>, document.body);
}