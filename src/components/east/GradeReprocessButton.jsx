import { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function GradeReprocessButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState('');
  const run = async () => {
    setRunning(true); setResult('');
    try {
      const preview = (await base44.functions.invoke('reprocessWeeklyGrades', { dryRun: true })).data;
      if (!preview.totalCorrections) { setResult('All weekly grading records already match the current rules.'); return; }
      const approved = window.confirm(`${preview.totalCorrections} grading corrections were found. Apply them now?`);
      if (!approved) { setResult('Preview complete; no records were changed.'); return; }
      const applied = (await base44.functions.invoke('reprocessWeeklyGrades', { dryRun: false })).data;
      setResult(`${applied.totalCorrections} grading corrections applied.`);
    } catch {
      setResult('Grading records could not be reprocessed. Please try again.');
    } finally { setRunning(false); }
  };
  return <div className="flex flex-col items-end gap-1"><button disabled={running} onClick={run} className="east-button">{running ? 'Checking grading records…' : 'Reprocess Weekly Grades'}</button>{result && <span className="max-w-72 text-right text-xs text-muted-foreground">{result}</span>}</div>;
}