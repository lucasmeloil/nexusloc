import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Wrench, Plus, X, Search, CheckCircle2, 
  AlertCircle, AlertTriangle, CalendarDays, Edit, Trash2 
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MaintenanceSchedule, Vehicle, SaleContract } from '../types';

const Maintenance: React.FC = () => {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [contracts, setContracts] = useState<SaleContract[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  
  const [form, setForm] = useState({
    vehicle_id: '',
    contract_id: '',
    scheduled_date: '',
    description: '',
    cost: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Fetch base data first
    const [vh, sc] = await Promise.all([
      supabase.from('vehicles').select('*').order('model'),
      supabase.from('sale_contracts').select('*, client:clients(*)').eq('status', 'active')
    ]);
    if (vh.data) setVehicles(vh.data);
    if (sc.data) setContracts(sc.data as SaleContract[]);

    // Try to fetch maintenance schedules (table might not exist)
    try {
      const { data: ms } = await supabase
        .from('maintenance_schedules')
        .select('*, vehicle:vehicles(*), contract:sale_contracts(*)')
        .order('scheduled_date', { ascending: true });
      if (ms) setSchedules(ms as MaintenanceSchedule[]);
    } catch (_) {}
    
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('maintenance_schedules').insert([{
      vehicle_id: form.vehicle_id,
      contract_id: form.contract_id || null,
      scheduled_date: form.scheduled_date,
      description: form.description,
      cost: form.cost,
      status: (isPast(new Date(form.scheduled_date)) && !isToday(new Date(form.scheduled_date))) ? 'overdue' : 'pending'
    }]);
    
    if (error) alert(error.message);
    else {
      setIsModalOpen(false);
      fetchData();
      setForm({ vehicle_id: '', contract_id: '', scheduled_date: '', description: '', cost: 0 });
    }
    setSaving(false);
  };

  const handleComplete = async (id: string) => {
    const { error } = await supabase.from('maintenance_schedules').update({
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', id);
    if (!error) fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir agendamento?')) return;
    const { error } = await supabase.from('maintenance_schedules').delete().eq('id', id);
    if (!error) fetchData();
  };

  const filtered = schedules.filter(s => 
    s.vehicle?.plate.toLowerCase().includes(search.toLowerCase()) || 
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shrink-0"><Wrench size={24} /></div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Oficina & Manutenção</h2>
            <p className="text-sm text-slate-500">Agende revisões e trocas de óleo preventivas.</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary w-full sm:w-auto flex justify-center items-center gap-2 shrink-0">
          <Plus size={18} /> Agendar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><CalendarDays size={24} /></div>
            <div><p className="text-sm text-slate-500 font-semibold">Pendentes</p><p className="text-2xl font-bold">{schedules.filter(s => s.status === 'pending').length}</p></div>
         </div>
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl"><AlertTriangle size={24} /></div>
            <div><p className="text-sm text-slate-500 font-semibold">Em Atraso</p><p className="text-2xl font-bold">{schedules.filter(s => s.status === 'overdue').length}</p></div>
         </div>
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><CheckCircle2 size={24} /></div>
            <div><p className="text-sm text-slate-500 font-semibold">Concluídas</p><p className="text-2xl font-bold">{schedules.filter(s => s.status === 'completed').length}</p></div>
         </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50">
           <div className="relative max-w-sm">
             <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input type="text" placeholder="Buscar placa ou serviço..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Veículo</th>
                <th className="px-6 py-4">Serviço/Descrição</th>
                <th className="px-6 py-4">Data Agendada</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-800">{s.vehicle?.model}</p>
                  <p className="text-xs text-slate-500">{s.vehicle?.plate} {s.contract?.client?.name ? `- Cliente: ${s.contract.client.name}` : ''}</p>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-700">{s.description}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{format(parseISO(s.scheduled_date), 'dd/MM/yyyy')}</td>
                <td className="px-6 py-4">
                  {s.status === 'pending' && <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase">Pendente</span>}
                  {s.status === 'overdue' && <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase">Atrasado</span>}
                  {s.status === 'completed' && <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase">Concluído</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  {s.status !== 'completed' && (
                    <button onClick={() => handleComplete(s.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg mr-2" title="Concluir"><CheckCircle2 size={18} /></button>
                  )}
                  <button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma manutenção encontrada.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Wrench size={20}/> Agendar Manutenção</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
             </div>
             <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Veículo *</label>
                  <select required value={form.vehicle_id} onChange={e => setForm({...form, vehicle_id: e.target.value})} className="input-field">
                     <option value="">Selecione...</option>
                     {vehicles.map(v => <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Contrato Ativo Relacionado (Opcional)</label>
                  <select value={form.contract_id} onChange={e => setForm({...form, contract_id: e.target.value})} className="input-field cursor-pointer">
                     <option value="">Nenhum (Moto Livre)</option>
                     {contracts.filter(c => c.vehicle_id === form.vehicle_id).map(c => 
                        <option key={c.id} value={c.id}>{c.client?.name}</option>
                     )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Data Agendada *</label>
                  <input type="date" required value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição / Serviço *</label>
                  <input type="text" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ex: Troca de óleo 5000km" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Custo Estimado (R$)</label>
                  <input type="number" step="0.01" value={form.cost} onChange={e => setForm({...form, cost: parseFloat(e.target.value) || 0})} className="input-field" />
                </div>
                <div className="pt-4 flex gap-3">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
                   <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : 'Salvar'}</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Maintenance;
