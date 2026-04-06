import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Plus, X, Search, DollarSign, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { TrafficInfraction, SaleContract, Vehicle } from '../types';

const Infractions: React.FC = () => {
  const [infractions, setInfractions] = useState<TrafficInfraction[]>([]);
  const [contracts, setContracts] = useState<SaleContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    contract_id: '',
    infraction_date: '',
    notice_number: '',
    description: '',
    amount: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Fetch contracts first
    const { data: sc } = await supabase.from('sale_contracts').select('*, client:clients(*), vehicle:vehicles(*)').eq('status', 'active');
    if (sc) setContracts(sc as SaleContract[]);

    // Try to fetch infractions (table might not exist yet)
    try {
      const { data: inf } = await supabase
        .from('traffic_infractions')
        .select('*, vehicle:vehicles(*), contract:sale_contracts(*, client:clients(*))')
        .order('created_at', { ascending: false });
      if (inf) setInfractions(inf as TrafficInfraction[]);
    } catch (_) {}
    
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const contract = contracts.find(c => c.id === form.contract_id);
    if (!contract) return;
    
    // Add to DB
    const payload = {
      contract_id: form.contract_id,
      vehicle_id: contract.vehicle_id,
      infraction_date: new Date(form.infraction_date).toISOString(),
      notice_number: form.notice_number,
      description: form.description,
      amount: form.amount,
      status: 'pending' // pending meaning: needs to be added to installer or paid separate
    };

    const { error } = await supabase.from('traffic_infractions').insert([payload]);
    if (error) alert(error.message);
    else {
      setIsModalOpen(false);
      setForm({ contract_id: '', infraction_date: '', notice_number: '', description: '', amount: 0 });
      fetchData();
    }
    setSaving(false);
  };

  const handleApplyToInstallment = async (inf: TrafficInfraction) => {
    if (!window.confirm(`Deseja embutir R$ ${inf.amount} na próxima parcela aberta do contrato?`)) return;
    
    // Find next pending installment
    const { data: insts } = await supabase.from('sale_installments')
      .select('*')
      .eq('sale_contract_id', inf.contract_id)
      .eq('status', 'pending')
      .order('installment_number', { ascending: true })
      .limit(1);
      
    if (insts && insts.length > 0) {
      const nextInst = insts[0];
      const newAmount = nextInst.amount + inf.amount;
      
      // Update installment
      await supabase.from('sale_installments').update({
        amount: parseFloat(newAmount.toFixed(2)),
        notes: (nextInst.notes || '') + ` | Acréscimo referencial à Multa (${inf.notice_number}) no valor de R$ ${inf.amount}`
      }).eq('id', nextInst.id);
      
      // Update infraction status
      await supabase.from('traffic_infractions').update({
        status: 'added_to_installment',
        linked_installment_id: nextInst.id
      }).eq('id', inf.id);
      
      alert(`Multa somada com sucesso à parcela ${nextInst.installment_number}!`);
      fetchData();
    } else {
      alert("Nenhuma parcela pendente encontrada para este contrato. O cliente já deve ter quitado!");
    }
  };

  const generateDriverIndication = (inf: TrafficInfraction) => {
    // Generate text output or simple print
    const client = inf.contract?.client;
    if (!client) return;
    const txt = `DECLARAÇÃO DE INDICAÇÃO DE CONDUTOR\n\nEu, ITABAIANA LOCAÇÕES, proprietário do veículo de placa ${inf.vehicle?.plate}, indico o(a) Sr(a) ${client.name}, condutor(a) do mesmo sob contrato vigente, portador(a) do CPF ${client.cpf_cnpj} e CNH anexada a este formulário, como principal condutor no momento da autuação AIT nº ${inf.notice_number} datada em ${format(parseISO(inf.infraction_date), 'dd/MM/yyyy')}.\n\nAssinatura: _____________________________`;
    
    // In a real app we'd use jspdf, but simple alert/prompt is ok for MVP or open in new window
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`<pre style="font-family: monospace; font-size: 16px; max-width: 600px; margin: 40px auto; line-height: 1.5;">${txt}</pre>`);
      newWindow.document.title = `Indicação_${inf.notice_number}`;
      newWindow.print();
    }
  };

  const filtered = infractions.filter(i => 
    i.notice_number.toLowerCase().includes(search.toLowerCase()) || 
    i.contract?.client?.name.toLowerCase().includes(search.toLowerCase()) ||
    i.vehicle?.plate.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
         <div className="flex items-center gap-3">
           <div className="p-3 bg-red-100 text-red-600 rounded-xl shrink-0"><ShieldAlert size={24} /></div>
           <div>
             <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Infrações e Multas de Trânsito</h2>
             <p className="text-sm text-slate-500">Repasse administrativo (NIC) e repasse de cobrança para parcelas.</p>
           </div>
         </div>
         <button onClick={() => setIsModalOpen(true)} className="btn-primary w-full sm:w-auto flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 shrink-0">
           <Plus size={18} /> Registrar Multa
         </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-4 border-b border-slate-50">
            <div className="relative max-w-sm">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar AIT, Placa ou Cliente..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
         </div>
         <div className="overflow-x-auto">
           <table className="w-full text-left min-w-[750px]">
             <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
             <tr>
               <th className="px-6 py-4">Autuação (AIT) / Data</th>
               <th className="px-6 py-4">Veículo / Condutor</th>
               <th className="px-6 py-4">Valor</th>
               <th className="px-6 py-4">Status Cobrança</th>
               <th className="px-6 py-4 text-right">Ações</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-50 text-sm">
             {filtered.map(i => (
               <tr key={i.id} className="hover:bg-slate-50/50">
                 <td className="px-6 py-4">
                   <p className="font-bold text-slate-800">{i.notice_number}</p>
                   <p className="text-xs text-slate-500">{format(parseISO(i.infraction_date), 'dd/MM/yyyy HH:mm')}</p>
                   <p className="text-xs text-slate-400 truncate max-w-[150px]">{i.description}</p>
                 </td>
                 <td className="px-6 py-4">
                   <p className="font-bold text-slate-700">{i.vehicle?.plate}</p>
                   <p className="text-xs text-slate-500 truncate max-w-[150px]">{i.contract?.client?.name}</p>
                 </td>
                 <td className="px-6 py-4 font-bold text-slate-800">
                   R$ {i.amount.toFixed(2)}
                 </td>
                 <td className="px-6 py-4">
                    {i.status === 'pending' && <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase">Pendente Cobrança</span>}
                    {i.status === 'added_to_installment' && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase">Embutida na Parcela</span>}
                    {i.status === 'paid' && <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">Pago/Resolvido</span>}
                 </td>
                 <td className="px-6 py-4">
                   <div className="flex flex-wrap items-center justify-end gap-2">
                     {i.status === 'pending' && (
                       <button onClick={() => handleApplyToInstallment(i)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all whitespace-nowrap" title="Embutir na próxima parcela semanal">
                         + Embutir
                       </button>
                     )}
                     <button onClick={() => generateDriverIndication(i)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all whitespace-nowrap" title="PDF de Indicação Detran">
                       NIC
                     </button>
                   </div>
                 </td>
               </tr>
             ))}
             {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma multa registrada.</td></tr>}
           </tbody>
         </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><ShieldAlert size={20}/> Registrar Multa</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
             </div>
             <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Contrato (Condutor) *</label>
                  <select required value={form.contract_id} onChange={e => setForm({...form, contract_id: e.target.value})} className="input-field">
                     <option value="">Selecione quem estava com o veículo...</option>
                     {contracts.map(c => <option key={c.id} value={c.id}>{c.client?.name} - {c.vehicle?.plate}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Nº AIT *</label>
                      <input type="text" required value={form.notice_number} onChange={e => setForm({...form, notice_number: e.target.value})} className="input-field" placeholder="Ex: T123456" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Valor (R$) *</label>
                      <input type="number" step="0.01" required value={form.amount || ''} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} className="input-field" />
                    </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Data / Hora da Multa *</label>
                  <input type="datetime-local" required value={form.infraction_date} onChange={e => setForm({...form, infraction_date: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Infração Cometida *</label>
                  <input type="text" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ex: Avanço de Semáforo" className="input-field" />
                </div>
                <div className="pt-4 flex gap-3">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
                   <button type="submit" disabled={saving} className="btn-primary flex-1 bg-red-600 hover:bg-red-700">{saving ? 'Salvando...' : 'Salvar Multa'}</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Infractions;
