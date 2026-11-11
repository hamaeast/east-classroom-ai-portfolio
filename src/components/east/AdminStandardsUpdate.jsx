import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { useStandardsUpdate } from '@/components/east/StandardsUpdateProvider';
import useStandardsAssessmentData from '@/hooks/useStandardsAssessmentData';
import { gradeBandFor } from '@/lib/eastStandards';
import { assessmentResults, buildStandardsContext, buildStandardsPrompt, hasStandardsDataChanged, standardsResponseSchema } from '@/lib/standardsAssessment';
import { buildCurrentAssessment, hasPositionGrowth, preserveHighestResults } from '@/lib/standardsProgress';

export default function AdminStandardsUpdate({ students }) {
  const { items: assessments } = useEntityList('StandardsAssessment');
  const { data, loading } = useStandardsAssessmentData(students);
  const { running, progress, start, cancel } = useStandardsUpdate();
  const updateAll = () => {
    const eligible = students.filter(student => gradeBandFor(Number(student.grade)));
    const checkedAt = new Date().toISOString();
    const pending = eligible.filter(student => {
      const current = buildCurrentAssessment(assessments.filter(item => item.student_id === student.id));
      return !current || hasStandardsDataChanged(student, data, current.last_checked_at || current.generated_at);
    });
    const pendingIds = new Set(pending.map(student => student.id));
    const alreadyCurrent = eligible.filter(student => !pendingIds.has(student.id)).map(student => buildCurrentAssessment(assessments.filter(item => item.student_id === student.id)));
    start(async (setProgress, isCanceled) => {
    setProgress(`Updating 0 of ${pending.length}…`);
    let updated = 0, unchanged = 0, failed = 0;
    for (let index = 0; index < alreadyCurrent.length; index += 500) {
      await base44.entities.StandardsAssessment.bulkUpdate(alreadyCurrent.slice(index, index + 500).map(item => ({ id: item.id, last_checked_at: checkedAt })));
    }
    for (let index = 0; index < pending.length; index += 1) {
      if (isCanceled()) break;
      const student = pending[index], band = gradeBandFor(Number(student.grade));
      try {
        const history = assessments.filter(item => item.student_id === student.id);
        const current = buildCurrentAssessment(history);
        const ai = await base44.integrations.Core.InvokeLLM({ prompt: buildStandardsPrompt(student, buildStandardsContext(student, data)), response_json_schema: standardsResponseSchema });
        const results = preserveHighestResults(assessmentResults(ai), current);
        if (hasPositionGrowth(results, current)) {
          const now = new Date().toISOString();
          await base44.entities.StandardsAssessment.create({ student_id: student.id, grade_level: Number(student.grade), grade_band: band, generated_at: now, last_checked_at: now, results });
          updated += 1;
        } else {
          await base44.entities.StandardsAssessment.update(current.id, { last_checked_at: new Date().toISOString() });
          unchanged += 1;
        }
      } catch { failed += 1; }
      setProgress(`Updating ${index + 1} of ${pending.length}…`);
    }
    return { updated, unchanged, failed, skipped: eligible.length - pending.length };
    });
  };
  return <div className="mb-6 rounded-lg border bg-white p-4"><p className="font-semibold">Update all student standards</p><p className="mt-1 text-sm text-muted-foreground">Only reassesses students with new or changed evidence and never lowers a standard. You can visit other pages while it runs; keep this tab open and you’ll be notified when it finishes.</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={updateAll} disabled={loading || running || !students.length} className="east-button">{running ? progress : 'Update all students'}</button>{running && <button type="button" onClick={cancel} className="rounded-lg border px-4 text-sm font-semibold text-muted-foreground">Cancel update</button>}</div>{!running && progress && <p className="mt-2 text-sm text-muted-foreground">{progress}</p>}</div>;
}