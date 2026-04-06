import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Contract, Client, Vehicle, ContractStatus, SaleContract, SaleInstallment } from '../types';
import {
  FileText, Search, MessageCircle, X, Save, Loader2, Edit, Trash2,
  AlertCircle, CheckCircle2, AlertTriangle, Receipt, Printer,
  ShoppingCart, Eye, BadgeCheck, Send, CreditCard, Plus,
  TrendingUp,
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths, differenceInDays, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateContractPDF } from '../lib/contractPDF';
import { generateSaleContractPDF } from '../lib/saleContractPDF';
import { generateReceiptPDF } from '../lib/receiptPDF';
import type { SystemSettings } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const saleBadge = (s: SaleContract['status']) => {
  const m: Record<string, { label: string; cls: string }> = {
    active:    { label: 'Ativo',     cls: 'bg-blue-100 text-blue-700' },
    paid:      { label: 'Quitado',   cls: 'bg-emerald-100 text-emerald-700' },
    overdue:   { label: 'Em Atraso', cls: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-500' },
  };
  return m[s] ?? m.active;
};

const instBadge = (s: SaleInstallment['status']) => {
  const m: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pendente', cls: 'bg-amber-100 text-amber-700' },
    paid:    { label: 'Pago',     cls: 'bg-emerald-100 text-emerald-700' },
    overdue: { label: 'Vencida',  cls: 'bg-red-100 text-red-700' },
  };
  return m[s] ?? m.pending;
};

// ═══════════════════════════════════════════════════════════════════════════
const Contracts: React.FC = () => {
  const [tab, setTab] = useState<'rental' | 'sale'>('rental');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Rental state ────────────────────────────────────────────────────────
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [billingContract, setBillingContract] = useState<Contract | null>(null);
  const [saving, setSaving] = useState(false);
  const [billingData, setBillingData] = useState({ hasAvaria: false, avariaNotes: '', extraCharge: 0 });
  const [formData, setFormData] = useState({
    client_id: '', vehicle_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    total_value: 0, payment_method: 'Pix', deposit: 0, balance: 0,
    status: 'active' as ContractStatus,
  });

  // ── Sale state ──────────────────────────────────────────────────────────
  const [saleContracts, setSaleContracts] = useState<SaleContract[]>([]);
  const [saleLoading, setSaleLoading] = useState(false);
  const [saleSearch, setSaleSearch] = useState('');
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleContract | null>(null);
  const [editingSale, setEditingSale] = useState<SaleContract | null>(null);
  const [savingSale, setSavingSale] = useState(false);
  const [payingInst, setPayingInst] = useState<SaleInstallment | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [amortMode, setAmortMode] = useState<'auto' | 'specific'>('auto');
  const [amortTargetId, setAmortTargetId] = useState<string>('');
  const [saleForm, setSaleForm] = useState({
    client_id: '', vehicle_id: '', sale_price: 0,
    down_payment: 0, installments: 12, due_day: 10, notes: '',
  });

  const saleRemaining = saleForm.sale_price - saleForm.down_payment;
  const instValue = saleForm.installments > 0 ? saleRemaining / saleForm.installments : 0;

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchRental = useCallback(async () => {
    setLoading(true);
    const [c, cl, v, s] = await Promise.all([
      supabase.from('contracts').select('*, client:clients(*), vehicle:vehicles(*)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('name'),
      supabase.from('vehicles').select('*').order('model'),
      supabase.from('settings').select('*').single(),
    ]);
    if (c.data) setContracts(c.data);
    if (cl.data) setClients(cl.data);
    if (v.data) setVehicles(v.data);
    if (s.data) setSettings(s.data);
    setLoading(false);
  }, []);

  const fetchSale = useCallback(async () => {
    setSaleLoading(true);
    const { data } = await supabase
      .from('sale_contracts')
      .select('*, client:clients(*), vehicle:vehicles(*), installment_records:sale_installments(*)')
      .order('created_at', { ascending: false });
    if (data) setSaleContracts(data as SaleContract[]);
    setSaleLoading(false);
  }, []);

  useEffect(() => { fetchRental(); }, [fetchRental]);
  useEffect(() => { if (tab === 'sale') fetchSale(); }, [tab, fetchSale]);

  // ── Rental auto-calc ───────────────────────────────────────────────────
  useEffect(() => {
    if (formData.vehicle_id && formData.start_date && formData.end_date) {
      const v = vehicles.find(x => x.id === formData.vehicle_id);
      if (v) {
        const days = Math.max(1, differenceInDays(parseISO(formData.end_date), parseISO(formData.start_date)));
        const total = days * (v.daily_rate || 0);
        if (!editingContract) setFormData(p => ({ ...p, total_value: total }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.vehicle_id, formData.start_date, formData.end_date, vehicles]);

  // ── Rental CRUD ────────────────────────────────────────────────────────
  const handleOpenModal = (c?: Contract) => {
    if (c) {
      setEditingContract(c);
      setFormData({ client_id: c.client_id, vehicle_id: c.vehicle_id, start_date: c.start_date, end_date: c.end_date, total_value: c.total_value, payment_method: c.payment_method || 'Pix', deposit: c.deposit, balance: c.balance, status: c.status });
    } else {
      setEditingContract(null);
      setFormData({ client_id: '', vehicle_id: '', start_date: format(new Date(), 'yyyy-MM-dd'), end_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'), total_value: 0, payment_method: 'Pix', deposit: 0, balance: 0, status: 'active' });
    }
    setIsModalOpen(true);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) { showToast('error', 'Selecione um cliente.'); return; }
    if (!formData.vehicle_id) { showToast('error', 'Selecione um veículo.'); return; }
    setSaving(true);
    const payload = { ...formData, balance: parseFloat((formData.total_value - formData.deposit).toFixed(2)), total_value: parseFloat(formData.total_value.toFixed(2)), deposit: parseFloat(formData.deposit.toString()) };
    if (editingContract) {
      const { error } = await supabase.from('contracts').update(payload).eq('id', editingContract.id);
      if (error) showToast('error', error.message);
      else { showToast('success', 'Contrato atualizado!'); setIsModalOpen(false); fetchRental(); }
    } else {
      const { error } = await supabase.from('contracts').insert([payload]);
      if (error) showToast('error', error.message);
      else { await supabase.from('vehicles').update({ status: 'rented' }).eq('id', formData.vehicle_id); showToast('success', 'Contrato gerado!'); setIsModalOpen(false); fetchRental(); }
    }
    setSaving(false);
  };

  const handleFinalizeBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingContract) return;
    setSaving(true);
    const newTotal = Number(billingContract.total_value) + Number(billingData.extraCharge);
    const { error } = await supabase.from('contracts').update({ status: 'finished', total_value: newTotal, deposit: newTotal, balance: 0, metadata: { billing: { has_avaria: billingData.hasAvaria, avaria_notes: billingData.avariaNotes, extra_charge: billingData.extraCharge, finalized_at: new Date().toISOString() } } }).eq('id', billingContract.id);
    if (error) showToast('error', error.message);
    else { await supabase.from('vehicles').update({ status: 'available' }).eq('id', billingContract.vehicle_id); showToast('success', 'Contrato finalizado!'); setIsBillingModalOpen(false); fetchRental(); }
    setSaving(false);
  };

  const generatePDF = async (c: Contract) => {
    if (!settings) { showToast('error', 'Configurações não carregadas.'); return; }
    const company = { name: settings.company_name, cnpj: settings.company_cnpj, address: settings.company_address, phone: settings.company_phone, email: settings.company_email, logo: settings.logo_url };
    const extras = c.metadata?.billing ? { hasAvaria: c.metadata.billing.has_avaria, avariaNotes: c.metadata.billing.avaria_notes, extraCharge: c.metadata.billing.extra_charge } : undefined;
    await generateContractPDF(c, company, settings.contract_clauses, extras);
  };

  const sendWhatsApp = (c: Contract) => {
    const phone = c.client?.phone?.replace(/\D/g, '');
    const msg = `Olá ${c.client?.name}, aqui está o seu contrato da Itabaiana Loc referente ao ${c.vehicle?.model}. Valor total: R$ ${Number(c.total_value).toFixed(2)}.`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const deleteContract = async (c: Contract) => {
    if (!window.confirm('Excluir este contrato?')) return;
    const { error } = await supabase.from('contracts').delete().eq('id', c.id);
    if (!error && c.status === 'active') await supabase.from('vehicles').update({ status: 'available' }).eq('id', c.vehicle_id);
    showToast(error ? 'error' : 'success', error ? error.message : 'Contrato removido.');
    fetchRental();
  };

  const filteredRental = contracts.filter(c =>
    c.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.vehicle?.model?.toLowerCase().includes(search.toLowerCase()) ||
    c.id.includes(search)
  );

  // ── Sale CRUD ──────────────────────────────────────────────────────────
  const handleOpenSaleModal = (c?: SaleContract) => {
    if (c) {
      setEditingSale(c);
      setSaleForm({ client_id: c.client_id, vehicle_id: c.vehicle_id, sale_price: c.sale_price, down_payment: c.down_payment, installments: c.installments, due_day: c.due_day, notes: c.notes ?? '' });
    } else {
      setEditingSale(null);
      setSaleForm({ client_id: '', vehicle_id: '', sale_price: 0, down_payment: 0, installments: 12, due_day: 10, notes: '' });
    }
    setIsSaleModalOpen(true);
  };

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.client_id) { showToast('error', 'Selecione um cliente.'); return; }
    if (!saleForm.vehicle_id) { showToast('error', 'Selecione um veículo.'); return; }
    if (saleForm.sale_price <= 0) { showToast('error', 'Informe o valor de venda.'); return; }

    // Verifica se veiculo já está bloqueado
    const veh = vehicles.find(v => v.id === saleForm.vehicle_id);
    if (!editingSale && veh && (veh.status === 'rented' || veh.status === 'in_sale')) {
      showToast('error', `Veículo indisponível — status atual: ${veh.status === 'rented' ? 'Alugado' : 'Em Contrato de Venda'}.`);
      return;
    }

    setSavingSale(true);
    const payload = { client_id: saleForm.client_id, vehicle_id: saleForm.vehicle_id, sale_price: saleForm.sale_price, down_payment: saleForm.down_payment, installments: saleForm.installments, installment_value: parseFloat(instValue.toFixed(2)), due_day: saleForm.due_day, status: 'active' as const, notes: saleForm.notes || null };
    if (editingSale) {
      const { error } = await supabase.from('sale_contracts').update(payload).eq('id', editingSale.id);
      if (error) showToast('error', error.message);
      else { showToast('success', 'Contrato atualizado!'); setIsSaleModalOpen(false); fetchSale(); }
    } else {
      const { data: nc, error } = await supabase.from('sale_contracts').insert([payload]).select().single();
      if (error || !nc) { showToast('error', error?.message ?? 'Erro ao criar.'); }
      else {
        // Bloqueia o veículo
        await supabase.from('vehicles').update({ status: 'in_sale' }).eq('id', saleForm.vehicle_id);

        const insts = Array.from({ length: saleForm.installments }, (_, i) => {
          const d = addWeeks(new Date(), i + 1);
          return { sale_contract_id: nc.id, installment_number: i + 1, due_date: format(d, 'yyyy-MM-dd'), amount: parseFloat(instValue.toFixed(2)), paid_at: null, paid_amount: null, receipt_sent: false, whatsapp_sent: false, status: (isPast(d) && !isToday(d)) ? 'overdue' : 'pending', notes: null };
        });
        await supabase.from('sale_installments').insert(insts);
        showToast('success', `Contrato gerado com ${saleForm.installments} parcelas! Veículo bloqueado.`);
        setIsSaleModalOpen(false);
        fetchSale();
        fetchRental(); // atualiza lista de veículos disponíveis
      }
    }
    setSavingSale(false);
  };

  const handleDeleteSale = async (id: string) => {
    if (!window.confirm('Excluir contrato e todas as parcelas? O veículo ficará disponível novamente.')) return;
    // Busca vehicle_id antes de deletar para liberar o veículo
    const contract = saleContracts.find(c => c.id === id);
    await supabase.from('sale_installments').delete().eq('sale_contract_id', id);
    const { error } = await supabase.from('sale_contracts').delete().eq('id', id);
    if (!error && contract?.vehicle_id) {
      await supabase.from('vehicles').update({ status: 'available' }).eq('id', contract.vehicle_id);
    }
    showToast(error ? 'error' : 'success', error ? error.message : 'Contrato removido. Veículo liberado.');
    fetchSale();
    fetchRental();
  };

  const handlePayInstallment = async () => {
    if (!payingInst) return;
    setPaying(true);
    const paidVal = parseFloat(payAmount) || payingInst.amount;
    const surplus = paidVal - payingInst.amount;

    const { error } = await supabase.from('sale_installments').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_amount: paidVal,
      notes: payNotes || null
    }).eq('id', payingInst.id);

    if (error) {
      showToast('error', error.message);
    } else {
      const cid = payingInst.sale_contract_id;

      // ── Amortização (Abater do fim ou parcela específica) ─────────────────
      if (surplus > 0.01) {
        if (amortMode === 'specific' && amortTargetId) {
          const { data: targetInst } = await supabase
            .from('sale_installments')
            .select('*')
            .eq('id', amortTargetId)
            .single();
          
          if (targetInst) {
            const toAbate = Math.min(targetInst.amount, surplus);
            const newAmount = Math.max(0, targetInst.amount - toAbate);
            await supabase.from('sale_installments').update({
              amount: parseFloat(newAmount.toFixed(2)),
              status: newAmount <= 0.01 ? 'paid' : targetInst.status,
              paid_at: newAmount <= 0.01 ? new Date().toISOString() : targetInst.paid_at,
              notes: newAmount <= 0.01
                ? `Totalmente quitada via amortização direta (Pgto extra parc. ${payingInst.installment_number})`
                : `Abatimento parcial via amortização direta (Pgto extra parc. ${payingInst.installment_number})`
            }).eq('id', amortTargetId);
          }
        } else {
          // Default: abater do fim do contrato (auto)
          const { data: pendings } = await supabase
            .from('sale_installments')
            .select('*')
            .eq('sale_contract_id', cid)
            .neq('status', 'paid')
            .neq('id', payingInst.id)
            .order('installment_number', { ascending: false });

          if (pendings && pendings.length > 0) {
            let currentSurplus = surplus;
            for (const inst of pendings) {
              if (currentSurplus <= 0.009) break;
              const toAbate = Math.min(inst.amount, currentSurplus);
              const newAmount = Math.max(0, inst.amount - toAbate);
              currentSurplus -= toAbate;

              await supabase.from('sale_installments').update({
                amount: parseFloat(newAmount.toFixed(2)),
                status: newAmount <= 0.01 ? 'paid' : inst.status,
                paid_at: newAmount <= 0.01 ? new Date().toISOString() : inst.paid_at,
                notes: newAmount <= 0.01
                  ? `Totalmente quitada via amortização (Pgto extra parc. ${payingInst.installment_number})`
                  : `Valor reduzido via amortização (Pgto extra parc. ${payingInst.installment_number})`
              }).eq('id', inst.id);
            }
          }
        }
      }

      const { data: rem } = await supabase.from('sale_installments').select('id').eq('sale_contract_id', cid).neq('status', 'paid');
      if (rem && rem.length === 0) {
        await supabase.from('sale_contracts').update({ status: 'paid' }).eq('id', cid);
        const sc = saleContracts.find(c => c.id === cid);
        if (sc?.vehicle_id) await supabase.from('vehicles').update({ status: 'available' }).eq('id', sc.vehicle_id);
        fetchRental();
      }
      showToast('success', surplus > 0 ? `Parcela baixada e excedente de ${fmt(surplus)} amortizado no fim do contrato!` : 'Parcela baixada!');
      
      // Auto-generate receipt prompt
      if (window.confirm('Baixar recibo em PDF agora?')) {
        const sc = saleContracts.find(c => c.id === cid);
        if (sc && settings) {
          const updatedInst = { ...payingInst, status: 'paid', paid_at: new Date().toISOString(), paid_amount: paidVal };
          handleGenerateReceipt(sc, updatedInst as SaleInstallment);
        }
      }
      setPayingInst(null);
      setPayAmount('');
      setPayNotes('');
      fetchSale();
      if (selectedSale?.id === cid) {
        const { data } = await supabase.from('sale_contracts').select('*, client:clients(*), vehicle:vehicles(*), installment_records:sale_installments(*)').eq('id', cid).single();
        if (data) setSelectedSale(data as SaleContract);
      }
    }
    setPaying(false);
  };

  const generateSalePDF = async (c: SaleContract) => {
    if (!settings) { showToast('error', 'Configurações não carregadas.'); return; }
    const company = { name: settings.company_name, cnpj: settings.company_cnpj, address: settings.company_address, phone: settings.company_phone, email: settings.company_email, logo: settings.logo_url };
    await generateSaleContractPDF(c, company, settings.contract_clauses);
  };

  const sendSaleWhatsApp = (c: SaleContract, installment?: SaleInstallment) => {
    const phone = c.client?.phone?.replace(/\D/g, '');
    const msg = installment
      ? `Olá ${c.client?.name}! 👋\n\nSua parcela ${installment.installment_number}/${c.installments} de ${fmt(installment.amount)} vence em ${format(parseISO(installment.due_date), 'dd/MM/yyyy')}.\n\nItabaiana Loc – Aluguel com Intenção de Venda`
      : `Olá ${c.client?.name}! 👋\n\nSeu contrato de *${c.vehicle?.model}* está em dia. Valor total: ${fmt(c.sale_price)}.\n\nItabaiana Loc`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleGenerateReceipt = async (c: SaleContract, inst: SaleInstallment) => {
    if (!settings) { showToast('error', 'Configurações não carregadas.'); return; }
    try {
      showToast('success', 'Gerando recibo PDF...');
      await generateReceiptPDF({ installment: inst, contract: c, settings });
      
      const phone = c.client?.phone?.replace(/\D/g, '');
      const msg = `✅ *COMPROVANTE DE PAGAMENTO*\n\nOlá *${c.client?.name}*!\nRecebemos o pagamento da parcela *${inst.installment_number}/${c.installments}* do seu contrato.\n\n💰 *Valor:* ${fmt(inst.paid_amount || inst.amount)}\n📅 *Data:* ${format(new Date(inst.paid_at || ''), 'dd/MM/yyyy', { locale: ptBR })}\n\n_Estou enviando o PDF do recibo em anexo abaixo_ 👇`;
      
      setTimeout(() => {
        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }, 1500);
    } catch (e) {
      showToast('error', 'Erro ao gerar PDF.');
      console.error(e);
    }
  };

  const filteredSale = saleContracts.filter(c =>
    c.client?.name?.toLowerCase().includes(saleSearch.toLowerCase()) ||
    c.vehicle?.model?.toLowerCase().includes(saleSearch.toLowerCase())
  );

  // ══════════════════════════════════════════════════════════════════════
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
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Contratos</h2>
          <p className="text-slate-500 mt-1">Gestão de locações e contratos de venda parcelada.</p>
        </div>
        {tab === 'rental' ? (
          <button onClick={() => handleOpenModal()} className="btn-primary w-full sm:w-auto shadow-xl shadow-primary-500/20">
            <FileText size={18} /> Gerar Locação
          </button>
        ) : (
          <button onClick={() => handleOpenSaleModal()} className="btn-primary w-full sm:w-auto bg-violet-600 hover:bg-violet-700 shadow-xl shadow-violet-500/20">
            <ShoppingCart size={18} /> Novo Contrato de Venda
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setTab('rental')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'rental' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <FileText size={16} /> Locações
        </button>
        <button
          onClick={() => setTab('sale')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'sale' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <ShoppingCart size={16} /> Aluguel c/ Intenção de Venda
        </button>
      </div>

      {/* ─── TAB: LOCAÇÕES ─────────────────────────────────────────────── */}
      {tab === 'rental' && (
        <div className="card !p-0 overflow-hidden shadow-2xl shadow-slate-200/50">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative max-w-md w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><FileText size={16} /></span>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contrato..." className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-4 focus:ring-primary-500/10 outline-none transition-all" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-slate-50/30">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Cliente / ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Veículo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Financeiro</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto" /></td></tr>
                ) : filteredRental.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-slate-500">Nenhum contrato encontrado.</td></tr>
                ) : filteredRental.map(item => (
                  <tr key={item.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900 truncate max-w-[180px]">{item.client?.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">#{item.id.slice(0, 8)}</p>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${item.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {item.status === 'active' ? 'Ativo' : 'Finalizado'}
                      </span>
                    </td>
                    <td className="px-6 py-5 hidden md:table-cell">
                      <p className="text-sm font-bold text-slate-700">{item.vehicle?.model}</p>
                      <p className="text-[10px] text-slate-400 font-black">{item.vehicle?.plate}</p>
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
                          <button onClick={() => { setBillingContract(item); setBillingData({ hasAvaria: false, avariaNotes: '', extraCharge: 0 }); setIsBillingModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Receipt size={18} /></button>
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
      )}

      {/* ─── TAB: ALUGUEL C/ VENDA ──────────────────────────────────────── */}
      {tab === 'sale' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total',      value: saleContracts.length,                                          cls: 'text-violet-600',  bg: 'bg-violet-50' },
              { label: 'Ativos',     value: saleContracts.filter(c => c.status === 'active').length,       cls: 'text-blue-600',    bg: 'bg-blue-50' },
              { label: 'Quitados',   value: saleContracts.filter(c => c.status === 'paid').length,         cls: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Em Atraso',  value: saleContracts.filter(c => c.status === 'overdue').length,      cls: 'text-red-600',     bg: 'bg-red-50' },
            ].map(({ label, value, cls, bg }) => (
              <div key={label} className="card flex items-center gap-4 py-4">
                <div className={`p-3 rounded-2xl ${bg}`}><ShoppingCart size={20} className={cls} /></div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-black text-slate-900">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="card !p-0 overflow-hidden shadow-2xl shadow-slate-200/50">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative max-w-md w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><FileText size={16} /></span>
                <input type="text" value={saleSearch} onChange={e => setSaleSearch(e.target.value)} placeholder="Buscar cliente ou veículo..." className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-4 focus:ring-violet-500/10 outline-none transition-all focus:border-violet-400" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left bg-slate-50/30">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Veículo</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Financeiro</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Progresso</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {saleLoading ? (
                    <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto" /></td></tr>
                  ) : filteredSale.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <ShoppingCart size={40} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-semibold">Nenhum contrato de venda encontrado.</p>
                        <p className="text-slate-300 text-sm mt-1">Clique em "Novo Contrato de Venda" para começar.</p>
                      </td>
                    </tr>
                  ) : filteredSale.map(c => {
                    const badge = saleBadge(c.status);
                    const paidCount = c.installment_records?.filter(i => i.status === 'paid').length ?? 0;
                    const totalPaid = (c.installment_records?.reduce((acc, inst) => acc + (Number(inst.paid_amount) || 0), 0) ?? 0) + Number(c.down_payment || 0);
                    const remainingBalance = Math.max(0, Number(c.sale_price) - totalPaid);
                    const pct = c.sale_price > 0 ? (totalPaid / c.sale_price) * 100 : 0;
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
                          <p className="text-sm font-black text-slate-900">{fmt(c.sale_price)}</p>
                          <p className="text-[10px] font-bold text-violet-600">{c.installments}x {fmt(c.installment_value)}</p>
                          <p className="text-[10px] text-slate-400">Entrada: {fmt(c.down_payment)}</p>
                        </td>
                        <td className="px-6 py-5 hidden lg:table-cell">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-violet-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] font-black text-slate-400 shrink-0">{paidCount}/{c.installments}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <p className="font-bold text-emerald-600">Pago: {fmt(totalPaid)}</p>
                              <p className="font-bold text-slate-400">Falta: {fmt(remainingBalance)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setSelectedSale(c); setIsDetailOpen(true); }} className="p-2 text-violet-500 hover:bg-violet-50 rounded-xl" title="Ver parcelas"><Eye size={18} /></button>
                            <button onClick={() => sendSaleWhatsApp(c)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl" title="WhatsApp"><MessageCircle size={18} /></button>
                            <button onClick={() => generateSalePDF(c)} className="p-2 text-violet-600 hover:bg-violet-50 rounded-xl" title="Baixar contrato PDF"><Printer size={18} /></button>
                            <button onClick={() => handleOpenSaleModal(c)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl" title="Editar"><Edit size={18} /></button>
                            <button onClick={() => handleDeleteSale(c.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl" title="Excluir"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Novo Contrato de Locação ─────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[96vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">{editingContract ? 'Editar Contrato' : 'Nova Locação'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveContract} className="flex-1 overflow-y-auto p-6 space-y-5">
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
                    {vehicles.filter(v => v.status === 'available' || v.id === formData.vehicle_id).map(v => <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>)}
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
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button type="submit" disabled={saving} className="btn-primary flex-1 h-12">{saving ? <Loader2 className="animate-spin" /> : 'Salvar Contrato'}</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Encerramento de Locação ───────────────────────────────── */}
      {isBillingModalOpen && billingContract && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2"><div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Receipt size={20} /></div><h3 className="text-xl font-extrabold text-slate-900">Encerramento</h3></div>
              <button onClick={() => setIsBillingModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={24} /></button>
            </div>
            <form onSubmit={handleFinalizeBilling} className="p-6 space-y-6">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="text-lg font-black text-slate-900">{billingContract.client?.name}</p>
                <p className="text-sm font-bold text-primary-600">{billingContract.vehicle?.model} — {billingContract.vehicle?.plate}</p>
                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between">
                  <span className="text-sm font-bold text-slate-500">Valor:</span>
                  <span className="text-sm font-black">R$ {Number(billingContract.total_value).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <input type="checkbox" id="hasAvaria" checked={billingData.hasAvaria} onChange={e => setBillingData({ ...billingData, hasAvaria: e.target.checked })} className="w-5 h-5 rounded-md cursor-pointer" />
                <label htmlFor="hasAvaria" className="flex items-center gap-2 text-sm font-bold text-amber-900 cursor-pointer"><AlertTriangle size={16} /> Identificou avarias?</label>
              </div>
              {billingData.hasAvaria && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Descrição dos Danos</label>
                    <textarea required={billingData.hasAvaria} value={billingData.avariaNotes} onChange={e => setBillingData({ ...billingData, avariaNotes: e.target.value })} className="input-field min-h-[70px]" placeholder="Ex: Risco na porta..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Taxa Adicional (R$)</label>
                    <input type="number" step="0.01" min="0" value={billingData.extraCharge} onChange={e => setBillingData({ ...billingData, extraCharge: parseFloat(e.target.value) || 0 })} className="input-field" />
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-500 font-bold">Total Final:</span>
                <span className="text-2xl font-black">R$ {(Number(billingContract.total_value) + (billingData.extraCharge || 0)).toFixed(2)}</span>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full h-14 text-lg shadow-xl shadow-primary-500/20">{saving ? <Loader2 className="animate-spin" /> : 'Finalizar e Faturar'}</button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Novo Contrato de Venda ────────────────────────────────── */}
      {isSaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-100 text-violet-600 rounded-xl"><ShoppingCart size={18} /></div>
                <h3 className="text-xl font-extrabold text-slate-900">{editingSale ? 'Editar Contrato' : 'Novo Contrato de Venda'}</h3>
              </div>
              <button onClick={() => setIsSaleModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveSale} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Cliente *</label>
                  <select required value={saleForm.client_id} onChange={e => setSaleForm({ ...saleForm, client_id: e.target.value })} className="input-field">
                    <option value="">Selecione...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Veículo *</label>
                  <select required value={saleForm.vehicle_id} onChange={e => setSaleForm({ ...saleForm, vehicle_id: e.target.value })} className="input-field">
                    <option value="">Selecione...</option>
                    {vehicles
                      .filter(v => v.status === 'available' || v.id === saleForm.vehicle_id)
                      .map(v => (
                        <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Valor de Venda (R$) *</label>
                  <input type="number" step="0.01" min="0" required value={saleForm.sale_price || ''} onChange={e => setSaleForm({ ...saleForm, sale_price: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Entrada (R$)</label>
                  <input type="number" step="0.01" min="0" value={saleForm.down_payment || ''} onChange={e => setSaleForm({ ...saleForm, down_payment: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Nº de Parcelas (1–150)</label>
                  <input type="number" min="1" max="150" required value={saleForm.installments} onChange={e => setSaleForm({ ...saleForm, installments: parseInt(e.target.value) || 1 })} className="input-field" />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Observações</label>
                  <textarea value={saleForm.notes} onChange={e => setSaleForm({ ...saleForm, notes: e.target.value })} className="input-field min-h-[60px]" placeholder="Condições especiais..." />
                </div>
              </div>
              {saleForm.sale_price > 0 && (
                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-[10px] font-black uppercase text-violet-400">Saldo</p><p className="text-sm font-black text-slate-900">{fmt(saleRemaining)}</p></div>
                  <div><p className="text-[10px] font-black uppercase text-violet-400">Parcelas</p><p className="text-sm font-black text-violet-700">{saleForm.installments}x {fmt(instValue)}</p></div>
                  <div><p className="text-[10px] font-black uppercase text-violet-400">Total</p><p className="text-sm font-black text-slate-900">{fmt(saleForm.sale_price)}</p></div>
                </div>
              )}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button type="submit" disabled={savingSale} className="btn-primary flex-1 h-12 bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/20">
                  {savingSale ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> {editingSale ? 'Atualizar' : 'Criar Contrato'}</>}
                </button>
                <button type="button" onClick={() => setIsSaleModalOpen(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Painel de Parcelas (Detail) ──────────────────────────────────── */}
      {isDetailOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-violet-100 text-violet-600 rounded-lg"><CreditCard size={16} /></div>
                  <h3 className="text-xl font-extrabold text-slate-900">Parcelas do Contrato</h3>
                </div>
                <p className="text-sm text-slate-500"><span className="font-bold text-slate-700">{selectedSale.client?.name}</span> — {selectedSale.vehicle?.model} · {fmt(selectedSale.sale_price)} em {selectedSale.installments}x</p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-900 p-1"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {(selectedSale.installment_records ?? [])
                .sort((a, b) => a.installment_number - b.installment_number)
                .map(inst => {
                  const ib = instBadge(inst.status);
                  return (
                    <div key={inst.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border ${inst.status === 'paid' ? 'bg-emerald-50/50 border-emerald-100' : inst.status === 'overdue' ? 'bg-red-50/50 border-red-100' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${inst.status === 'paid' ? 'bg-emerald-500 text-white' : inst.status === 'overdue' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {inst.installment_number}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{fmt(inst.amount)}</p>
                          <p className="text-xs text-slate-500">Vence {format(parseISO(inst.due_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                          {inst.paid_at && <p className="text-[10px] text-emerald-600 font-bold">Pago em {format(new Date(inst.paid_at), 'dd/MM/yyyy')}{inst.paid_amount ? ` · ${fmt(inst.paid_amount)}` : ''}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${ib.cls}`}>{ib.label}</span>
                        {inst.status !== 'paid' && (
                          <>
                            <button onClick={() => { setPayingInst(inst); setPayAmount(inst.amount.toString()); setPayNotes(''); }} className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl">
                              <BadgeCheck size={14} /> Dar Baixa
                            </button>
                            <button onClick={() => sendSaleWhatsApp(selectedSale, inst)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-xl border border-emerald-100" title="Lembrete WhatsApp">
                              <Send size={14} />
                            </button>
                          </>
                        )}
                        {inst.status === 'paid' && (
                          <button
                            onClick={() => handleGenerateReceipt(selectedSale, inst)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                          >
                            <Receipt size={14} /> Recibo PDF
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Dar Baixa em Parcela ──────────────────────────────────── */}
      {payingInst && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-100 text-violet-600 rounded-xl"><BadgeCheck size={18} /></div>
                <h3 className="text-lg font-extrabold text-slate-900">Dar Baixa na Parcela</h3>
              </div>
              <button onClick={() => setPayingInst(null)} className="text-slate-400 hover:text-slate-900"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
                <p className="text-xs font-black uppercase text-violet-400">Parcela {payingInst.installment_number}</p>
                <p className="text-xl font-black text-violet-700 mt-1">{fmt(payingInst.amount)}</p>
                <p className="text-xs text-slate-500 mt-1">Vence em {format(parseISO(payingInst.due_date), 'dd/MM/yyyy')}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Valor Recebido (R$)</label>
                <input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="input-field" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Observações (opcional)</label>
                <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Ex: Pago via Pix..." className="input-field" />
              </div>

              {parseFloat(payAmount) > payingInst.amount && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-widest">
                    <TrendingUp size={16} /> Saldo Restante: {fmt(parseFloat(payAmount) - payingInst.amount)}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-amber-700">Como deseja amortizar o saldo extra?</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setAmortMode('auto')}
                        className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase transition-all border ${amortMode === 'auto' ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-white border-amber-200 text-amber-600 hover:bg-amber-100'}`}
                      >
                        Abater do Final
                      </button>
                      <button 
                        onClick={() => setAmortMode('specific')}
                        className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase transition-all border ${amortMode === 'specific' ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-white border-amber-200 text-amber-600 hover:bg-amber-100'}`}
                      >
                        Escolher Parcela
                      </button>
                    </div>
                  </div>
                  {amortMode === 'specific' && (
                    <div className="space-y-1.5 animate-in zoom-in-95 duration-200">
                      <label className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Selecionar Semana/Parcela:</label>
                      <select 
                        value={amortTargetId}
                        onChange={e => setAmortTargetId(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-amber-500/10 outline-none"
                      >
                        <option value="">Selecione uma parcela...</option>
                        {selectedSale?.installment_records
                          ?.filter(i => i.status !== 'paid' && i.id !== payingInst.id)
                          .sort((a,b) => a.installment_number - b.installment_number)
                          .map(i => (
                            <option key={i.id} value={i.id}>
                              Parcela {i.installment_number} — {fmt(i.amount)} (Vence {format(parseISO(i.due_date), 'dd/MM/yyyy')})
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setPayingInst(null)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handlePayInstallment} disabled={paying} className="btn-primary flex-1 bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/20">
                  {paying ? <Loader2 size={18} className="animate-spin" /> : <><BadgeCheck size={18} /> Confirmar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;
