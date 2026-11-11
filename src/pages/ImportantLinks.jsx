import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/east/PageHeader';
import EmptyState from '@/components/east/EmptyState';
import LinkNoteBox from '@/components/east/LinkNoteBox';
import AdminPublishedLink from '@/components/east/AdminPublishedLink';

export default function ImportantLinks() {
  const { items, loading, reload } = useEntityList('ImportantLink');
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';
  const [form, setForm] = useState({ title: '', url: '', description: '' });

  const submit = async (e) => {
    e.preventDefault();
    await base44.entities.ImportantLink.create(form);
    setForm({ title: '', url: '', description: '' });
    reload();
  };
  const save = async (id, changes) => { await base44.entities.ImportantLink.update(id, changes); await reload(); };
  const remove = async (id) => { await base44.entities.ImportantLink.delete(id); reload(); };

  return <><PageHeader title="Important Links" description="Quick access to the resources students need most." />
    {isAdmin && <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border bg-white p-5 shadow-sm md:grid-cols-3">
      <input required placeholder="Link title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      <input required placeholder="URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
      <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      <button className="east-button w-fit md:col-span-3">Add link</button>
    </form>}
    {loading ? <p>Loading…</p> : !items.length ? <EmptyState>Important links will appear here.</EmptyState> : <div className="grid gap-4 md:grid-cols-2">
      {items.map(x => isAdmin ? <AdminPublishedLink key={x.id} link={x} onSave={save} onDelete={remove} /> : <div key={x.id} className="rounded-xl border bg-white p-5 shadow-sm">
        <a href={x.url} target="_blank" rel="noreferrer" className="font-semibold text-cyan-700 underline">{x.title}</a>
        {x.description && <p className="mt-1 text-sm text-slate-600">{x.description}</p>}
        <LinkNoteBox linkId={x.id} />
      </div>)}
    </div>}
  </>;
}