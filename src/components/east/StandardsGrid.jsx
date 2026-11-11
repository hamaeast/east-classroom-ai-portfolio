import { STANDARD_KEYS, STANDARD_NAMES } from '@/lib/eastStandards';
import StandardGrowthChart from './StandardGrowthChart';

const BANDS = ['K-2', '3-6', '7-8', '9-12'];

export default function StandardsGrid({ band, assessment, assessments = [] }) {
  const byKey = Object.fromEntries((assessment?.results || []).map(result => [result.standard_key, result]));
  return <div className="grid gap-3">
    {STANDARD_KEYS.map(key => {
      const result = byKey[key];
      const aboveBand = result && BANDS.indexOf(result.assessed_grade_band) > BANDS.indexOf(band);
      return <article key={key} className="grid gap-5 rounded-xl border bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div><p className="text-xs font-bold uppercase tracking-wide text-neon-cyan">EAST Standard</p><h3 className="mt-1 font-semibold text-foreground">{STANDARD_NAMES[key]}</h3>
          {result ? <div className="mt-4 space-y-2"><div className="flex flex-wrap gap-2"><span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">Demonstrated grade level: {result.assessed_grade_band || assessment.grade_band}</span><span className="inline-flex rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">{result.level}</span>{aboveBand && <span className="inline-flex rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-bold text-success">Above enrolled band · points capped at {band} Mastery</span>}</div><p className="text-sm font-semibold text-foreground">{result.target}</p><p className="text-sm text-muted-foreground">{result.evidence_summary}</p></div> : <p className="mt-4 text-sm text-muted-foreground">No assessment generated yet for this standard.</p>}
          {!result && band && <p className="mt-2 text-xs text-muted-foreground">Uses the {band} playbook targets: Emerging, Proficient, and Mastery.</p>}</div>
        <StandardGrowthChart assessments={assessments} standardKey={key} />
      </article>;
    })}
  </div>;
}