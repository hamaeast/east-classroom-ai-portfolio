export default function EvidenceAnalysisView({ analysis = [] }) {
  if (!analysis.length) return null;
  return <div className="md:col-span-3 rounded-lg border border-neon-cyan/30 bg-neon-cyan/5 p-3">
    <p className="text-xs font-bold uppercase tracking-wide text-neon-cyan">Evidence review</p>
    <div className="mt-2 space-y-2">{analysis.map((item, index) => <div key={`${item.url}-${index}`} className="text-xs text-muted-foreground">
      <p><b className="text-foreground">{item.accessible ? 'Public evidence found:' : 'Could not inspect:'}</b> {item.summary}</p>
      {item.demonstrated_learning && <p><b>Learning shown:</b> {item.demonstrated_learning}</p>}
      {item.suggestion && <p><b>Suggestion:</b> {item.suggestion}</p>}
    </div>)}</div>
  </div>;
}