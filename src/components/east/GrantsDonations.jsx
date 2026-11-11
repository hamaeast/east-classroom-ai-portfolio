import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import QuickPanel from './QuickPanel';

export default function GrantsDonations() {
  const { items, loading, reload } = useEntityList('Donation');
  const blank = { source_name: '', contact_name: '', contact_info: '', amount: '', confirmation_date: '', notes: '' };
  const [form, setForm] = useState(blank);
  const total = items.reduce((s, x) => s + Number(x.amount || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    await base44.entities.Donation.create({ ...form, amount: Number(form.amount) });
    setForm(blank);
    reload();
  };

  return <QuickPanel title="Grants & donations received">
    <p className="mb-3 text-sm text-slate-600">Total received: <span className="font-semibold">${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></p>
    <form onSubmit={submit} className="mb-4 grid gap-2 sm:grid-cols-2">
      <input required placeholder="Grant / donor name" value={form.source_name} onChange={e => setForm({ ...form, source_name: e.target.value })} />
      <input placeholder="Contact name" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
      <input placeholder="Contact info (email/phone)" value={form.contact_info} onChange={e => setForm({ ...form, contact_info: e.target.value })} />
      <input required type="date" value={form.confirmation_date} onChange={e => setForm({ ...form, confirmation_date: e.target.value })} />
      <input required type="number" step=".01" min="0" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
      <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      <button className="east-button sm:col-span-2">Log grant / donation</button>
    </form>
    {loading ? <p className="text-sm text-slate-500">Loading…</p> : !items.length ? <p className="text-sm text-slate-500">No grants or donations logged yet.</p> : <div className="max-h-60 space-y-2 overflow-y-auto text-sm">
      {items.map(x => <div key={x.id} className="flex items-center justify-between border-b py-2 last:border-0">
        <div><p className="font-medium">{x.source_name}</p><p className="text-xs text-slate-500">{x.contact_name} · confirmed {x.confirmation_date}</p></div>
        <span className="font-semibold">${Number(x.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      </div>)}
    </div>}
  </QuickPanel>;
}