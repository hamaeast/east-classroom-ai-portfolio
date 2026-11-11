import { Lock } from 'lucide-react';

// One nine-weeks standards grade card — used for a frozen snapshot grade and for
// the live "next nine weeks" expected grade. Kept stateless so the parent can
// render several side by side.
export default function LearningSummaryGradeCard({ eyebrow, percent, pointsLabel, footer, suggestions = [], suggestionsTitle = 'Two ways to display a higher grade', highlight = false, frozen = false, className = '' }) {
  return (
    <section className={`rounded-xl border p-5 shadow-sm ${frozen ? 'border-border bg-muted/40' : highlight ? 'border-primary/50 bg-card' : 'border-border bg-card/70'} ${className}`}>
      <div className="flex items-center gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">{eyebrow}</p>
        {frozen && <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"><Lock size={11} /> Frozen</span>}
      </div>
      {percent == null ? (
        <p className="mt-2 text-sm text-muted-foreground">No standards report has been run for this student yet.</p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <p className={`text-4xl font-bold ${percent < 70 ? 'text-destructive' : frozen ? 'text-muted-foreground' : 'text-foreground'}`}>{percent}%</p>
            {pointsLabel && <p className="pb-1 text-sm text-muted-foreground">{pointsLabel}</p>}
          </div>
          {footer && <p className="mt-1 text-xs text-muted-foreground">{footer}</p>}
          {suggestions.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold">{suggestionsTitle}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                {suggestions.map(item => <li key={item}>{item}</li>)}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  );
}