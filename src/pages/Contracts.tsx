import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Contract, Client, Vehicle, ContractStatus } from '../types';
import {
  FileText,
  Search,
  MessageCircle,
  Clock,
  Calendar,
  DollarSign,
  User,
  Car,
  ChevronRight,
  Printer,
  X,
  Save,
  Loader2,
  CircleCheck,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  PlusCircle,
} from 'lucide-react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { generateContractPDF } from '../lib/contractPDF';
import type { SystemSettings } from '../types';

const Contracts: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [billingContract, setBillingContract] = useState<Contract | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Billing formData
  const [billingData, setBillingData] = useState({
    hasAvaria: false,
    avariaNotes: '',
    extraCharge: 0,
  });

  const [formData, setFormData] = useState({
    client_id: '',
    vehicle_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    total_value: 0,
    payment_method: 'Pix',
    deposit: 0,
    balance: 0,
    status: 'active' as ContractStatus,
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [c, cl, v, s] = await Promise.all([
      supabase.from('contracts').select('*, client:clients(*), vehicle:vehicles(*)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('name'),
      supabase.from('vehicles').select('*').order('model'),
      supabase.from('settings').select('*').single()
    ]);
    if (c.data) setContracts(c.data);
    if (cl.data) setClients(cl.data);
    if (v.data) setVehicles(v.data);
    if (s.data) setSettings(s.data);
    setLoading(false);
  };

  useEffect(() => {
    if (formData.vehicle_id && formData.start_date && formData.end_date) {
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      if (vehicle) {
        const start = parseISO(formData.start_date);
        const end = parseISO(formData.end_date);
        const days = Math.max(1, differenceInDays(end, start));
        const total = days * (vehicle.daily_rate || 0);
        if (formData.total_value !== total && !editingContract) {
          setFormData(prev => ({ ...prev, total_value: total }));
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.vehicle_id, formData.start_date, formData.end_date, vehicles]);

  const handleOpenModal = (contract?: Contract) => {
    if (contract) {
      setEditingContract(contract);
      setFormData({
        client_id: contract.client_id,
        vehicle_id: contract.vehicle_id,
        start_date: contract.start_date,
        end_date: contract.end_date,
        total_value: contract.total_value,
        payment_method: contract.payment_method || 'Pix',
        deposit: contract.deposit,
        balance: contract.balance,
        status: contract.status,
      });
    } else {
      setEditingContract(null);
      setFormData({
        client_id: '',
        vehicle_id: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        total_value: 0,
        payment_method: settings?.currency === 'BRL' ? 'Pix' : 'Cash',
        deposit: 0,
        balance: 0,
        status: 'active',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContract(null);
  };

  const handleOpenBilling = (contract: Contract) => {
    setBillingContract(contract);
    setBillingData({ hasAvaria: false, avariaNotes: '', extraCharge: 0 });
    setIsBillingModalOpen(true);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) { showToast('error', 'Selecione um cliente.'); return; }
    if (!formData.vehicle_id) { showToast('error', 'Selecione um veículo.'); return; }
    setSaving(true);
    const balanceValue = parseFloat((formData.total_value - formData.deposit).toFixed(2));
    const contractData = {
      client_id: formData.client_id,
      vehicle_id: formData.vehicle_id,
      start_date: formData.start_date,
      end_date: formData.end_date,
      total_value: parseFloat(formData.total_value.toFixed(2)),
      payment_method: formData.payment_method,
      deposit: parseFloat(formData.deposit.toString()),
      balance: balanceValue,
      status: formData.status,
    };
    if (editingContract) {
      const { error } = await supabase.from('contracts').update(contractData).eq('id', editingContract.id);
      if (error) { showToast('error', error.message); } else {
        if (editingContract.vehicle_id !== formData.vehicle_id) {
          await supabase.from('vehicles').update({ status: 'available' }).eq('id', editingContract.vehicle_id);
          await supabase.from('vehicles').update({ status: 'rented' }).eq('id', formData.vehicle_id);
        }
        showToast('success', 'Contrato atualizado!'); handleCloseModal(); fetchData();
      }
    } else {
      const { error } = await supabase.from('contracts').insert([contractData]);
      if (error) { showToast('error', error.message); } else {
        await supabase.from('vehicles').update({ status: 'rented' }).eq('id', formData.vehicle_id);
        showToast('success', 'Contrato gerado!'); handleCloseModal(); fetchData();
      }
    }
    setSaving(false);
  };

  const handleFinalizeBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingContract) return;
    setSaving(true);
    const newTotal = Number(billingContract.total_value) + Number(billingData.extraCharge);
    const { error } = await supabase.from('contracts').update({
      status: 'finished',
      total_value: newTotal,
      deposit: newTotal, // Consider paid
      balance: 0,
      metadata: {
        billing: {
          has_avaria: billingData.hasAvaria,
          avaria_notes: billingData.avariaNotes,
          extra_charge: billingData.extraCharge,
          finalized_at: new Date().toISOString()
        }
      }
    }).eq('id', billingContract.id);

    if (error) { showToast('error', error.message); } else {
      await supabase.from('vehicles').update({ status: 'available' }).eq('id', billingContract.vehicle_id);
      showToast('success', 'Contrato finalizado e faturado!');
      setIsBillingModalOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const generatePDF = async (contract: Contract) => {
    if (!settings) {
      showToast('error', 'Configurações do sistema não carregadas.');
      return;
    }
    const company = {
      name: settings.company_name,
      cnpj: settings.company_cnpj,
      address: settings.company_address,
      phone: settings.company_phone,
      email: settings.company_email,
      logo: settings.logo_url
    };

    const extras = contract.metadata?.billing ? {
      hasAvaria: contract.metadata.billing.has_avaria,
      avariaNotes: contract.metadata.billing.avaria_notes,
      extraCharge: contract.metadata.billing.extra_charge
    } : undefined;

    await generateContractPDF(contract, company, settings.contract_clauses, extras);
  };

  const sendWhatsApp = (contract: Contract) => {
    const phone = contract.client?.phone?.replace(/\D/g, '');
    const msg = `Olá ${contract.client?.name}, aqui está o seu contrato da NexusLoc referente ao ${contract.vehicle?.model}. Valor total: R$ ${Number(contract.total_value).toFixed(2)}. Qual dúvida estamos à disposição!`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const deleteContract = async (contract: Contract) => {
    if (!window.confirm('Excluir este contrato permanentemente?')) return;
    const { error } = await supabase.from('contracts').delete().eq('id', contract.id);
    if (!error && contract.status === 'active') {
      await supabase.from('vehicles').update({ status: 'available' }).eq('id', contract.vehicle_id);
    }
    showToast(error ? 'error' : 'success', error ? error.message : 'Contrato removido.');
    fetchData();
  };

  const filtered = contracts.filter(c =>
    c.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.vehicle?.model?.toLowerCase().includes(search.toLowerCase()) ||
    c.id.includes(search)
  );

  const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);
  const days = formData.start_date && formData.end_date
    ? Math.max(1, differenceInDays(parseISO(formData.end_date), parseISO(formData.start_date)))
    : 0;

  return (
    <div className="space-y-8 fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-semibold text-sm animate-in slide-in-from-top-2 duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Contratos</h2>
          <p className="text-slate-500 mt-1">Gestão de termos e encerramento de locações.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary w-full sm:w-auto shadow-xl shadow-primary-500/20">
          <FileText size={18} /> Gerar Novo Contrato
        </button>
      </div>

      <div className="card !p-0 overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={18} /></span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contrato..." className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left bg-slate-50/30">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Cliente / ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Veículo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest"> Financeiro</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="py-20 text-center text-slate-500">Nenhum contrato encontrado.</td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-900 leading-tight truncate max-w-[180px]">{item.client?.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-tighter">#{item.id.slice(0, 8)}</p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${item.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.status === 'active' ? 'Ativo' : 'Finalizado'}
                    </span>
                  </td>
                  <td className="px-6 py-5 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-700">{item.vehicle?.model}</p>
                        <p className="text-[10px] text-slate-400 font-black">{item.vehicle?.plate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-black text-slate-900">Total: R$ {Number(item.total_value).toFixed(2)}</p>
                    <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Pago: R$ {Number(item.deposit).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{format(parseISO(item.start_date), 'dd/MM')} a {format(parseISO(item.end_date), 'dd/MM')}</p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => sendWhatsApp(item)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl"><MessageCircle size={18} /></button>
                      <button onClick={() => generatePDF(item)} className="p-2 text-primary-500 hover:bg-primary-50 rounded-xl"><Printer size={18} /></button>
                      {item.status === 'active' && (
                        <button onClick={() => handleOpenBilling(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl" title="Faturar"><Receipt size={18} /></button>
                      )}
                      <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><Edit size={18} /></button>
                      <button onClick={() => deleteContract(item)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">{editingContract ? 'Editar Contrato' : 'Nova Locação'}</h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-900"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveContract} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Cliente *</label>
                  <select required value={formData.client_id} onChange={e => setFormData({ ...formData, client_id: e.target.value })} className="input-field">
                    <option value="">Selecione...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Veículo *</label>
                  <select required value={formData.vehicle_id} onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })} className="input-field">
                    <option value="">Selecione...</option>
                    {vehicles.filter(v => v.status === 'available' || v.id === formData.vehicle_id).map(v => (
                      <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Início</label>
                  <input type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="input-field" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Fim</label>
                  <input type="date" required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="input-field" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Valor Total (R$)</label>
                  <input type="number" step="0.01" value={formData.total_value} onChange={e => setFormData({ ...formData, total_value: parseFloat(e.target.value) })} className="input-field" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Valor Pago (R$)</label>
                  <input type="number" step="0.01" value={formData.deposit} onChange={e => setFormData({ ...formData, deposit: parseFloat(e.target.value) })} className="input-field" />
                </div>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="animate-spin" /> : 'Salvar Contrato'}</button>
                <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Billing / Finalize Modal */}
      {isBillingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Receipt size={20} /></div>
                <h3 className="text-xl font-extrabold text-slate-900">Encerramento</h3>
              </div>
              <button onClick={() => setIsBillingModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={24} /></button>
            </div>
            <form onSubmit={handleFinalizeBilling} className="p-6 space-y-6">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase">Resumo da Locação</p>
                <p className="text-lg font-black text-slate-900 mt-1">{billingContract?.client?.name}</p>
                <p className="text-sm font-bold text-primary-600">{billingContract?.vehicle?.model} — {billingContract?.vehicle?.plate}</p>
                <div className="mt-4 flex justify-between items-center pt-4 border-t border-slate-200">
                  <span className="text-sm font-bold text-slate-500">Valor Inicial:</span>
                  <span className="text-sm font-black text-slate-900">R$ {Number(billingContract?.total_value).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <input 
                    type="checkbox" 
                    id="hasAvaria" 
                    checked={billingData.hasAvaria} 
                    onChange={e => setBillingData({ ...billingData, hasAvaria: e.target.checked })} 
                    className="w-5 h-5 rounded-md text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <label htmlFor="hasAvaria" className="flex items-center gap-2 text-sm font-bold text-amber-900 cursor-pointer select-none">
                    <AlertTriangle size={16} /> Identificou avarias no veículo?
                  </label>
                </div>

                {billingData.hasAvaria && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Descrição dos Danos</label>
                      <textarea 
                        required={billingData.hasAvaria}
                        value={billingData.avariaNotes}
                        onChange={e => setBillingData({ ...billingData, avariaNotes: e.target.value })}
                        className="input-field min-h-[80px]" 
                        placeholder="Ex: Risco na porta traseira, pneu avariado..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Taxa Adicional (R$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        value={billingData.extraCharge}
                        onChange={e => setBillingData({ ...billingData, extraCharge: parseFloat(e.target.value) || 0 })}
                        className="input-field" 
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-slate-500 font-bold">Total Final:</span>
                  <span className="text-2xl font-black text-slate-900">
                    R$ {(Number(billingContract?.total_value || 0) + (billingData.extraCharge || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button type="submit" disabled={saving} className="btn-primary w-full h-14 text-lg shadow-xl shadow-primary-500/20">
                  {saving ? <Loader2 className="animate-spin" /> : 'Finalizar e Faturar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;
