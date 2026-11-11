import { FACILITATION_ACTIONS } from '@/lib/facilitationConstants';

export default function FacilitationActions({ selected, onChange }) {
  const toggle = action => onChange(selected.includes(action) ? selected.filter(item => item !== action) : [...selected, action]);
  return <fieldset><legend className="east-label mb-2">What did you do? Select all that apply.</legend><div className="grid gap-2 sm:grid-cols-2">
    {FACILITATION_ACTIONS.map(action => <label key={action} className="flex items-start gap-2 rounded-lg border p-2 text-sm"><input type="checkbox" className="mt-0.5 min-h-0" checked={selected.includes(action)} onChange={() => toggle(action)} />{action}</label>)}
  </div></fieldset>;
}