import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

const PERIODS = [1, 2, 3, 4, 5, 6, 7];
const GRADES = [7, 8, 9];

export default function ClassPeriodPrompt() {
  const { user, updateCurrentUser } = useAuth();
  const [me, setMe] = useState(null);
  const [period, setPeriod] = useState(user?.class_period || '');
  const [grade, setGrade] = useState(user?.grade || '');
  const [saving, setSaving] = useState(false);

  const effectiveMe = me || user;
  if (!effectiveMe || effectiveMe.role === 'admin' || (effectiveMe.class_period && effectiveMe.grade)) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!period || !grade) return;
    setSaving(true);
    await updateCurrentUser({ class_period: Number(period), grade: Number(grade) });
    setMe({ ...effectiveMe, class_period: Number(period), grade: Number(grade) });
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
      <h2 className="mb-1 text-lg font-semibold text-slate-950">A couple quick questions</h2>
      <p className="mb-4 text-sm text-slate-500">Tell us your class period and grade to continue.</p>
      <label className="east-label">Class period
        <select required value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="">Select period…</option>
          {PERIODS.map(p => <option key={p} value={p}>Period {p}</option>)}
        </select>
      </label>
      <label className="east-label mt-3 block">Grade
        <select required value={grade} onChange={e => setGrade(e.target.value)}>
          <option value="">Select grade…</option>
          {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
        </select>
      </label>
      <button disabled={saving} className="east-button mt-4 w-full">{saving ? 'Saving…' : 'Continue'}</button>
    </form>
  </div>;
}