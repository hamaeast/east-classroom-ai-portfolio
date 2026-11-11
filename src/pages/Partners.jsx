import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/east/PageHeader';
import EmptyState from '@/components/east/EmptyState';
import StatusBadge from '@/components/east/StatusBadge';

export default function Partners() {
  const { items, loading, reload } = useEntityList('CommunityPartner');
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';
  const [form,setForm]=useState({name:'',contact_name:'',email:'',organization_type:'',status:'active'});
  const submit=async(e)=>{e.preventDefault();await base44.entities.CommunityPartner.create(form);setForm({name:'',contact_name:'',email:'',organization_type:'',status:'active'});reload();};
  const toggleStatus=async(x)=>{await base44.entities.CommunityPartner.update(x.id,{status:x.status==='inactive'?'active':'inactive'});reload();};

  return <><PageHeader title="Community Partners" description="Maintain the relationships that connect student work to authentic community needs."/>
    {isAdmin && <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border bg-white p-5 shadow-sm md:grid-cols-5"><input required placeholder="Organization name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input placeholder="Contact person" value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})}/><input type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input placeholder="Organization type" value={form.organization_type} onChange={e=>setForm({...form,organization_type:e.target.value})}/><button className="east-button">Add partner</button></form>}
    {loading ? <p>Loading…</p> : !items.length ? <EmptyState>Add your first community partner above.</EmptyState> : <div className="overflow-hidden rounded-xl border bg-white shadow-sm"><table className="east-table"><thead><tr><th>Partner</th><th>Contact</th><th>Type</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead><tbody>{items.map(x=><tr key={x.id}><td className="font-medium">{x.name}</td><td>{x.contact_name || '—'}<span className="block text-xs text-slate-500">{x.email}</span></td><td>{x.organization_type || '—'}</td><td><StatusBadge status={x.status}/></td>{isAdmin && <td><button onClick={()=>toggleStatus(x)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">{x.status==='inactive'?'Activate':'Deactivate'}</button></td>}</tr>)}</tbody></table></div>}
  </>;
}