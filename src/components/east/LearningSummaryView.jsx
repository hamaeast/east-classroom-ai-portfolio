import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { buildStudentContext, buildSummaryPrompt } from '@/lib/studentSummaryContext';
import EmptyState from './EmptyState';

// Renders the live AI-generated learning summary for one student. Re-generates automatically
// whenever any of that student's underlying data (pitches, goals, check-ins, feedback, hours, skills)
// changes, so admin and student views always reflect the same, current picture.
export default function LearningSummaryView({ student, fixedRange, compact = false, notifyStudent = false }) {
  const { items: pitches } = useEntityList('ProjectPitch');
  const { items: checkIns } = useEntityList('WeeklyCheckIn');
  const { items: comments } = useEntityList('Comment');
  const { items: serviceEntries } = useEntityList('ServiceEntry');
  const { items: skills } = useEntityList('StudentSkill');
  const { items: weeklyGoals } = useEntityList('WeeklyGoal');
  const [summary, setSummary] = useState('');
  const [checkedDates, setCheckedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [rangeState, setRange] = useState('overall');
  const range = fixedRange || rangeState;
  const checkedAt = checkedDates[`${student.id}:${range}`] || student[`learning_summary_${range}_checked_at`];
  const { text, fingerprint, hasData } = buildStudentContext(student, { pitches, checkIns, comments, serviceEntries, skills, weeklyGoals, range });
  const checkedLabel = checkedAt ? <p className="mb-3 text-xs text-muted-foreground">Information checked {new Date(checkedAt).toLocaleString()}{!hasData ? ' · No new work to summarize yet' : ''}</p> : null;

  useEffect(() => {
    let cancelled = false;
    if (!hasData) {
      setSummary(''); setLoading(false);
      if (notifyStudent) {
        const now = new Date().toISOString();
        base44.entities.User.update(student.id, { [`learning_summary_${range}_checked_at`]: now }).then(() => {
          if (!cancelled) setCheckedDates(previous => ({ ...previous, [`${student.id}:${range}`]: now }));
        });
      }
      return () => { cancelled = true; };
    }

    // Reuse the cached summary stored on the student if it was generated from this exact
    // data fingerprint — only call the AI again when something actually changed.
    const cachedText = student[`learning_summary_${range}_text`];
    const cachedFingerprint = student[`learning_summary_${range}_fingerprint`];
    if (cachedFingerprint === fingerprint && cachedText) {
      setSummary(cachedText);
      setLoading(false);
      if (notifyStudent) {
        const now = new Date().toISOString();
        base44.entities.User.update(student.id, { [`learning_summary_${range}_checked_at`]: now, learning_summary_popup_generated_at: now, learning_summary_popup_range: range }).then(() => {
          if (!cancelled) setCheckedDates(previous => ({ ...previous, [`${student.id}:${range}`]: now }));
        });
      }
      return () => { cancelled = true; };
    }

    setLoading(true);
    base44.integrations.Core.InvokeLLM({ prompt: buildSummaryPrompt(text, range) }).then(result => {
      if (cancelled) return;
      setSummary(result);
      setLoading(false);
      const now = new Date().toISOString();
      base44.entities.User.update(student.id, {
        [`learning_summary_${range}_text`]: result,
        [`learning_summary_${range}_fingerprint`]: fingerprint,
        [`learning_summary_${range}_checked_at`]: now,
        ...(notifyStudent ? { learning_summary_popup_generated_at: now, learning_summary_popup_range: range } : {})
      }).then(() => {
        if (!cancelled) setCheckedDates(previous => ({ ...previous, [`${student.id}:${range}`]: now }));
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, hasData, range, student.id]);

  const rangeOptions = [['overall', 'Overall'], ['month', 'Last month']];
  const RangeToggle = () => (
    <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {rangeOptions.map(([val, label]) => (
        <button key={val} onClick={() => setRange(val)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${range === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
      ))}
    </div>
  );

  if (!hasData) return <>{!fixedRange && <RangeToggle />}{checkedLabel}<EmptyState>No pitches, check-ins, or skills logged yet for {student.full_name || student.email}{range === 'month' ? ' in the last month' : ''}.</EmptyState></>;
  if (loading && !summary) return <>{!fixedRange && <RangeToggle />}<p className="text-sm text-slate-500">Generating summary…</p></>;

  return <div>
    {!fixedRange && <RangeToggle />}
    <div className={`rounded-xl border bg-white shadow-sm ${compact ? 'p-3' : 'p-6'}`}>
      {checkedLabel}
      {loading && <p className="mb-3 text-xs font-semibold text-cyan-700">Updating with latest data…</p>}
      <div className={`max-w-none text-slate-700 ${compact ? 'space-y-1 text-xs' : 'space-y-3 text-sm'}`}>
        <ReactMarkdown components={{
          h1: (props) => <h2 className={`${compact ? 'text-sm' : 'text-lg'} font-bold text-slate-900`} {...props} />,
          h2: (props) => <h2 className={`${compact ? 'text-sm' : 'text-lg'} font-bold text-slate-900`} {...props} />,
          h3: (props) => <h3 className={`${compact ? 'text-xs' : 'text-base'} font-bold text-slate-900`} {...props} />,
          strong: (props) => <strong className="font-bold" {...props} />,
          ul: (props) => <ul className="list-disc space-y-1 pl-5" {...props} />,
          p: (props) => <p className="leading-relaxed" {...props} />,
        }}>{summary}</ReactMarkdown>
      </div>
    </div>
  </div>;
}