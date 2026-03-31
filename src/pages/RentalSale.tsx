import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { SaleContract, SaleInstallment, Client, Vehicle } from '../types';
import {
  ShoppingCart, Search, Plus, X, Save, Loader2, CheckCircle2, AlertCircle,
  MessageCircle, Receipt, ChevronDown, ChevronUp, Eye, Trash2, Edit,
  Bell, TrendingUp, Clock, DollarSign, AlertTriangle, FileText,
  CalendarDays, CreditCard, BadgeCheck, Send, RotateCcw,
} from 'lucide-react';
import { format, addWeeks, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── helpers ────────────────────────────────────────────────────────────────

const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const statusBadge = (s: SaleContract['status']) => {
  const map = {
    active:    { label: 'Ativo',      cls: 'bg-blue-100 text-blue-700' },
    paid:      { label: 'Quitado',    cls: 'bg-emerald-100 text-emerald-700' },
    overdue:   { label: 'Em Atraso',  cls: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Cancelado',  cls: 'bg-slate-100 text-slate-500' },
  };
  return map[s] ?? map.active;
};

const installmentStatusBadge = (s: SaleInstallment['status']) => {
  const map = {
    pending: { label: 'Pendente', cls: 'bg-amber-100 text-amber-700' },
    paid:    { label: 'Pago',     cls: 'bg-emerald-100 text-emerald-700' },
    overdue: { label: 'Vencida',  cls: 'bg-red-100 text-red-700' },
  };
  return map[s] ?? map.pending;
};

// ── Toast ──────────────────────────────────────────────────────────────────

interface ToastState { type: 'success' | 'error'; msg: string }

// ── Main Component ─────────────────────────────────────────────────────────

const RentalSale: React.FC = () => {
  const [contracts, setContracts] = useState<SaleContract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toast, setToast] = useState<ToastState | null>(null);

  // modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<SaleContract | null>(null);
  const [saving, setSaving] = useState(false);

  // detail panel
  const [selectedContract, setSelectedContract] = useState<SaleContract | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // pay installment modal
  const [payingInstallment, setPayingInstallment] = useState<SaleInstallment | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  // form
  const [form, setForm] = useState({
    client_id: '',
    vehicle_id: '',
    sale_price: 0,
    down_payment: 0,
    installments: 12,
    due_day: 10,
    notes: '',
  });

  // ── Computed ──
  const remaining = form.sale_price - form.down_payment;
  const installmentValue = form.installments > 0 ? remaining / form.installments : 0;

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [sc, cl, vh] = await Promise.all([
      supabase
        .from('sale_contracts')
        .select('*, client:clients(*), vehicle:vehicles(*), installment_records:sale_installments(*)')
        .order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('name'),
      supabase.from('vehicles').select('*').order('model'),
    ]);
    if (sc.data) setContracts(sc.data as SaleContract[]);
    if (cl.data) setClients(cl.data);
    if (vh.data) setVehicles(vh.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Create contract + installments ──
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) { showToast('error', 'Selecione um cliente.'); return; }
    if (!form.vehicle_id) { showToast('error', 'Selecione um veículo.'); return; }
    if (form.sale_price <= 0) { showToast('error', 'Informe o valor de venda.'); return; }
    setSaving(true);

    const contractPayload = {
      client_id: form.client_id,
      vehicle_id: form.vehicle_id,
      sale_price: form.sale_price,
      down_payment: form.down_payment,
      installments: form.installments,
      installment_value: parseFloat(installmentValue.toFixed(2)),
      due_day: form.due_day,
      status: 'active' as const,
      notes: form.notes || null,
    };

    if (editingContract) {
      const { error } = await supabase
        .from('sale_contracts')
        .update(contractPayload)
        .eq('id', editingContract.id);
      if (error) { showToast('error', error.message); }
      else { showToast('success', 'Contrato atualizado!'); setIsModalOpen(false); fetchData(); }
    } else {
      const { data: newContract, error } = await supabase
        .from('sale_contracts')
        .insert([contractPayload])
        .select()
        .single();

      if (error || !newContract) { showToast('error', error?.message ?? 'Erro ao criar contrato.'); }
      else {
        // generate installments
        const installments = Array.from({ length: form.installments }, (_, i) => {
          const base = addWeeks(new Date(), i + 1);
          // O dia do vencimento agora é exatamente X semanas a partir de hoje
          const dueDate = format(base, 'yyyy-MM-dd');
          const status = (isPast(base) && !isToday(base)) ? 'overdue' : 'pending';
          return {
            sale_contract_id: newContract.id,
            installment_number: i + 1,
            due_date: dueDate,
            amount: parseFloat(installmentValue.toFixed(2)),
            paid_at: null,
            paid_amount: null,
            receipt_sent: false,
            whatsapp_sent: false,
            status,
            notes: null,
          };
        });

        await supabase.from('sale_installments').insert(installments);
        showToast('success', `Contrato gerado com ${form.installments} parcelas!`);
        setIsModalOpen(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const handleOpenModal = (contract?: SaleContract) => {
    if (contract) {
      setEditingContract(contract);
      setForm({
        client_id: contract.client_id,
        vehicle_id: contract.vehicle_id,
        sale_price: contract.sale_price,
        down_payment: contract.down_payment,
        installments: contract.installments,
        due_day: contract.due_day,
        notes: contract.notes ?? '',
      });
    } else {
      setEditingContract(null);
      setForm({ client_id: '', vehicle_id: '', sale_price: 0, down_payment: 0, installments: 12, due_day: 10, notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este contrato e todas as parcelas?')) return;
    await supabase.from('sale_installments').delete().eq('sale_contract_id', id);
    const { error } = await supabase.from('sale_contracts').delete().eq('id', id);
    showToast(error ? 'error' : 'success', error ? error.message : 'Contrato removido.');
    fetchData();
  };

  // ── Pay installment ──
  const handlePayInstallment = async () => {
    if (!payingInstallment) return;
    setPaying(true);
    const { error } = await supabase
      .from('sale_installments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_amount: parseFloat(payAmount) || payingInstallment.amount,
        notes: payNotes || null,
      })
      .eq('id', payingInstallment.id);

    if (error) { showToast('error', error.message); }
    else {
      // check if all paid → update contract status
      const contractId = payingInstallment.sale_contract_id;
      const { data: remaining } = await supabase
        .from('sale_installments')
        .select('id')
        .eq('sale_contract_id', contractId)
        .neq('status', 'paid');
      if (remaining && remaining.length === 0) {
        await supabase.from('sale_contracts').update({ status: 'paid' }).eq('id', contractId);
      }
      showToast('success', 'Parcela baixada com sucesso!');
      setPayingInstallment(null);
      setPayAmount('');
      setPayNotes('');
      fetchData();
      // refresh detail panel
      if (selectedContract?.id === contractId) {
        const { data } = await supabase
          .from('sale_contracts')
          .select('*, client:clients(*), vehicle:vehicles(*), installment_records:sale_installments(*)')
          .eq('id', contractId)
          .single();
        if (data) setSelectedContract(data as SaleContract);
      }
    }
    setPaying(false);
  };

  const sendWhatsApp = (contract: SaleContract, installment?: SaleInstallment) => {
    const phone = contract.client?.phone?.replace(/\D/g, '');
    const msg = installment
      ? `Olá ${contract.client?.name}! 👋\n\nSua parcela ${installment.installment_number}/${contract.installments} de ${currency(installment.amount)} vence em ${format(parseISO(installment.due_date), 'dd/MM/yyyy')}.\n\nNexusLoc – Aluguel com Intenção de Venda`
      : `Olá ${contract.client?.name}! 👋\n\nSeu contrato de *${contract.vehicle?.model}* está em dia. Valor total: ${currency(contract.sale_price)}.\n\nNexusLoc`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ── Stats ──
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const paidContracts = contracts.filter(c => c.status === 'paid').length;
  const overdueContracts = contracts.filter(c => c.status === 'overdue').length;
  const totalPortfolio = contracts.reduce((a, c) => a + c.sale_price, 0);

  // ── Filter ──
  const filtered = contracts.filter(c => {
    const matchSearch =
      c.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.vehicle?.model?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-8 fade-in">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-semibold text-sm animate-in slide-in-from-top-2 duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-violet-100 text-violet-600 rounded-xl">
              <ShoppingCart size={22} />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Aluguel com Intenção de Venda</h2>
          </div>
          <p className="text-slate-500 ml-1">Contratos parcelados em até 150x com gestão completa de recibos e notificações.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary w-full sm:w-auto shadow-xl shadow-violet-500/20 bg-violet-600 hover:bg-violet-700">
          <Plus size={18} /> Novo Contrato
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Contratos', value: totalContracts, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Ativos', value: activeContracts, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Quitados', value: paidContracts, icon: BadgeCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Em Atraso', value: overdueContracts, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${bg}`}>
              <Icon size={22} className={color} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-black text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Portfolio Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-violet-200 text-xs font-black uppercase tracking-widest">Carteira Total</p>
          <p className="text-4xl font-black tracking-tight mt-1">{currency(totalPortfolio)}</p>
          <p className="text-violet-200 text-sm mt-1">Soma de todos os contratos</p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-5 py-3 rounded-2xl border border-white/20">
          <DollarSign size={20} className="text-violet-200" />
          <span className="font-bold text-sm">Portfólio de Vendas</span>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="card !p-0 overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente ou veículo..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:ring-4 focus:ring-violet-500/10 outline-none transition-all focus:border-violet-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-4 focus:ring-violet-500/10 outline-none"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="paid">Quitados</option>
            <option value="overdue">Em atraso</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left bg-slate-50/30">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Veículo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Financeiro</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Parcelas</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <ShoppingCart size={40} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold">Nenhum contrato encontrado.</p>
                  </td>
                </tr>
              ) : filtered.map(c => {
                const badge = statusBadge(c.status);
                const paid = c.installment_records?.filter(i => i.status === 'paid').length ?? 0;
                const total = c.installments;
                return (
                  <tr key={c.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900 truncate max-w-[180px]">{c.client?.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">#{c.id.slice(0, 8)}</p>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-6 py-5 hidden md:table-cell">
                      <p className="text-sm font-bold text-slate-700">{c.vehicle?.model}</p>
                      <p className="text-[10px] text-slate-400 font-black">{c.vehicle?.plate}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-black text-slate-900">{currency(c.sale_price)}</p>
                      <p className="text-[10px] font-bold text-violet-600">{c.installments}x {currency(c.installment_value)}</p>
                      <p className="text-[10px] text-slate-400">Entrada: {currency(c.down_payment)}</p>
                    </td>
                    <td className="px-6 py-5 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-violet-500 h-full rounded-full transition-all"
                            style={{ width: `${total > 0 ? (paid / total) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-500">{paid}/{total}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => { setSelectedContract(c); setIsDetailOpen(true); }}
                          className="p-2 text-violet-500 hover:bg-violet-50 rounded-xl"
                          title="Ver detalhes e parcelas"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => sendWhatsApp(c)}
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(c)}
                          className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-xl"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail / Admin Panel ── */}
      {isDetailOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-violet-100 text-violet-600 rounded-lg">
                    <ShoppingCart size={16} />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">Painel do Contrato</h3>
                </div>
                <p className="text-sm text-slate-500">
                  <span className="font-bold text-slate-700">{selectedContract.client?.name}</span>
                  {' '}&mdash;{' '}
                  {selectedContract.vehicle?.model} ({selectedContract.vehicle?.plate})
                </p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-900 p-1">
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Valor Total', value: currency(selectedContract.sale_price) },
                  { label: 'Entrada Paga', value: currency(selectedContract.down_payment) },
                  { label: 'Parcelas', value: `${selectedContract.installments}x ${currency(selectedContract.installment_value)}` },
                  { label: 'Vencimento', value: `Dia ${selectedContract.due_day}` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => sendWhatsApp(selectedContract)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all"
                >
                  <MessageCircle size={16} /> WhatsApp Geral
                </button>
                <button
                  onClick={() => {
                    showToast('success', 'Notificação push enviada ao admin!');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 text-sm font-bold rounded-xl transition-all"
                >
                  <Bell size={16} /> Notificar Admin
                </button>
              </div>

              {/* Installments Table */}
              <div>
                <h4 className="text-base font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                  <CreditCard size={18} className="text-violet-500" />
                  Parcelas
                </h4>
                <div className="space-y-2">
                  {(selectedContract.installment_records ?? [])
                    .sort((a, b) => a.installment_number - b.installment_number)
                    .map(inst => {
                      const iBadge = installmentStatusBadge(inst.status);
                      return (
                        <div
                          key={inst.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${inst.status === 'paid' ? 'bg-emerald-50/50 border-emerald-100' : inst.status === 'overdue' ? 'bg-red-50/50 border-red-100' : 'bg-white border-slate-100'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${inst.status === 'paid' ? 'bg-emerald-500 text-white' : inst.status === 'overdue' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              {inst.installment_number}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {currency(inst.amount)}
                              </p>
                              <p className="text-xs text-slate-500">
                                Vence em {format(parseISO(inst.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </p>
                              {inst.paid_at && (
                                <p className="text-[10px] text-emerald-600 font-bold">
                                  Pago em {format(new Date(inst.paid_at), 'dd/MM/yyyy')}
                                  {inst.paid_amount && ` · ${currency(inst.paid_amount)}`}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:shrink-0">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${iBadge.cls}`}>
                              {iBadge.label}
                            </span>

                            {inst.status !== 'paid' && (
                              <>
                                <button
                                  onClick={() => {
                                    setPayingInstallment(inst);
                                    setPayAmount(inst.amount.toString());
                                    setPayNotes('');
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all"
                                >
                                  <BadgeCheck size={14} /> Dar Baixa
                                </button>
                                <button
                                  onClick={() => sendWhatsApp(selectedContract, inst)}
                                  className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-xl border border-emerald-100"
                                  title="Enviar lembrete WhatsApp"
                                >
                                  <Send size={14} />
                                </button>
                              </>
                            )}

                            {inst.status === 'paid' && (
                              <button
                                onClick={() => {
                                  const phone = selectedContract.client?.phone?.replace(/\D/g, '');
                                  const msg = `✅ Recibo - Parcela ${inst.installment_number}/${selectedContract.installments}\nCliente: ${selectedContract.client?.name}\nVeículo: ${selectedContract.vehicle?.model}\nValor pago: ${currency(inst.paid_amount ?? inst.amount)}\nData: ${format(new Date(inst.paid_at!), 'dd/MM/yyyy')}\n\nNexusLoc`;
                                  window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
                              >
                                <Receipt size={14} /> Recibo
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pay Installment Modal ── */}
      {payingInstallment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-100 text-violet-600 rounded-xl"><BadgeCheck size={18} /></div>
                <h3 className="text-lg font-extrabold text-slate-900">Dar Baixa na Parcela</h3>
              </div>
              <button onClick={() => setPayingInstallment(null)} className="text-slate-400 hover:text-slate-900"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
                <p className="text-xs font-black uppercase text-violet-400">Parcela {payingInstallment.installment_number}</p>
                <p className="text-xl font-black text-violet-700 mt-1">{currency(payingInstallment.amount)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Vence em {format(parseISO(payingInstallment.due_date), 'dd/MM/yyyy')}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Valor Recebido (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Observações (opcional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="Ex: Pago via Pix, transferência..."
                  className="input-field"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setPayingInstallment(null)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={handlePayInstallment}
                  disabled={paying}
                  className="btn-primary flex-1 bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/20"
                >
                  {paying ? <Loader2 size={18} className="animate-spin" /> : <><BadgeCheck size={18} /> Confirmar Baixa</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── New / Edit Contract Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-100 text-violet-600 rounded-xl"><ShoppingCart size={18} /></div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {editingContract ? 'Editar Contrato' : 'Novo Contrato de Venda'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={24} /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Cliente *</label>
                  <select required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="input-field">
                    <option value="">Selecione...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Veículo *</label>
                  <select required value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} className="input-field">
                    <option value="">Selecione...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Valor de Venda (R$) *</label>
                  <input type="number" step="0.01" min="0" required value={form.sale_price || ''} onChange={e => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Entrada (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.down_payment || ''} onChange={e => setForm({ ...form, down_payment: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Parcelas (1-150) *</label>
                  <input type="number" min="1" max="150" required value={form.installments} onChange={e => setForm({ ...form, installments: parseInt(e.target.value) || 1 })} className="input-field" />
                </div>


                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Observações</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field min-h-[70px]" placeholder="Condições especiais, garantias..." />
                </div>
              </div>

              {/* Preview */}
              {form.sale_price > 0 && form.installments > 0 && (
                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-black uppercase text-violet-500">Resumo Financeiro</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Saldo</p>
                      <p className="text-sm font-black text-slate-900">{currency(remaining)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Parcelas</p>
                      <p className="text-sm font-black text-violet-700">{form.installments}x {currency(installmentValue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Total</p>
                      <p className="text-sm font-black text-slate-900">{currency(form.sale_price)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button type="submit" disabled={saving} className="btn-primary flex-1 bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/20 h-12">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> {editingContract ? 'Atualizar' : 'Criar Contrato'}</>}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalSale;
