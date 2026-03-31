import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Contract, Expense } from '../types';
import { format, parseISO } from 'date-fns';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  PieChart,
  FileSpreadsheet,
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
  Tag,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';

// ── Types ──────────────────────────────────────────────────────────────────
interface SaleInstallmentRow {
  id: string;
  paid_at: string | null;
  amount: number;
  paid_amount: number | null;
  status: string;
  installment_number: number;
  sale_contract_id: string;
  sale_contract?: {
    id: string;
    sale_price: number;
    down_payment: number;
    installments: number;
    client?: { name: string } | null;
    vehicle?: { model: string; plate: string } | null;
  } | null;
}

// Unified transaction row for the history table
interface TxRow {
  key: string;
  date: string;
  description: string;
  subtitle: string;
  type: 'rental' | 'sale_installment' | 'expense';
  value: number;
  badge?: string;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-slate-700">{label}</label>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
const Billing: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [saleInstallments, setSaleInstallments] = useState<SaleInstallmentRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'Manutenção',
    type: 'expense' as 'expense' | 'revenue',
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [contractsRes, installmentsRes, expensesRes] = await Promise.all([
      supabase
        .from('contracts')
        .select('*, client:clients(name), vehicle:vehicles(model,plate)')
        .order('created_at', { ascending: false }),
      supabase
        .from('sale_installments')
        .select('*, sale_contract:sale_contracts(id, sale_price, down_payment, installments, client:clients(name), vehicle:vehicles(model,plate))')
        .order('paid_at', { ascending: false }),
      supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false }),
    ]);

    if (contractsRes.data)     setContracts(contractsRes.data);
    if (installmentsRes.data)  setSaleInstallments(installmentsRes.data as unknown as SaleInstallmentRow[]);
    if (expensesRes.data)      setExpenses(expensesRes.data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (formData.type === 'expense') {
      const { error } = await supabase.from('expenses').insert([{
        description: formData.description,
        amount: formData.amount,
        date: formData.date,
        category: formData.category,
      }]);
      if (error) showToast('error', 'Erro ao registrar: ' + error.message);
      else { showToast('success', 'Despesa registrada!'); setIsModalOpen(false); fetchData(); }
    } else {
      showToast('error', 'Receitas são geradas automaticamente pelos contratos.');
    }
    setSaving(false);
  };

  // ── Stats ──────────────────────────────────────────────────────────────
  // Rental
  const rentalInvoiced  = contracts.reduce((a, c) => a + (Number(c.total_value) || 0), 0);
  const rentalReceived  = contracts.reduce((a, c) => a + (Number(c.deposit) || 0), 0);
  const rentalPending   = contracts.reduce((a, c) => a + (Number(c.balance) || 0), 0);

  // Sale installments — only paid ones count as received
  const saleReceived = saleInstallments
    .filter(i => i.status === 'paid')
    .reduce((a, i) => a + (Number(i.paid_amount ?? i.amount) || 0), 0);

  const salePending = saleInstallments
    .filter(i => i.status !== 'paid')
    .reduce((a, i) => a + (Number(i.amount) || 0), 0);

  const totalReceived = rentalReceived + saleReceived;
  const totalPending  = rentalPending  + salePending;
  const totalExpenses = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const netBalance    = totalReceived - totalExpenses;

  // ── Build unified tx list sorted by date ──────────────────────────────
  const txList: TxRow[] = [
    ...contracts.map(c => ({
      key: `rental-${c.id}`,
      date: c.created_at,
      description: `Locação #${c.id.slice(0, 6).toUpperCase()}`,
      subtitle: `Cliente: ${(c as any).client?.name ?? '—'} · ${(c as any).vehicle?.model ?? ''} ${(c as any).vehicle?.plate ?? ''}`,
      type: 'rental' as const,
      value: Number(c.total_value) || 0,
      badge: c.status === 'active' ? 'Ativo' : c.status === 'finished' ? 'Finalizado' : 'Cancelado',
    })),
    ...saleInstallments.map(i => ({
      key: `sale-inst-${i.id}`,
      date: i.paid_at ?? '',
      description: `Parcela ${i.installment_number}/${i.sale_contract?.installments ?? '?'} — C/ Venda`,
      subtitle: `Cliente: ${i.sale_contract?.client?.name ?? '—'} · ${i.sale_contract?.vehicle?.model ?? ''} ${i.sale_contract?.vehicle?.plate ?? ''}`,
      type: 'sale_installment' as const,
      value: Number(i.paid_amount ?? i.amount) || 0,
      badge: i.status === 'paid' ? 'Pago' : i.status === 'overdue' ? 'Atrasado' : 'Pendente',
    })),
    ...expenses.map(e => ({
      key: `expense-${e.id}`,
      date: e.date,
      description: e.description,
      subtitle: `Categoria: ${e.category}`,
      type: 'expense' as const,
      value: Number(e.amount) || 0,
    })),
  ]
    .filter(r => !!r.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const badgeCls = (type: TxRow['type'], badge?: string) => {
    if (type === 'expense') return 'bg-red-50 text-red-600';
    if (type === 'sale_installment') {
      if (badge === 'Pago')     return 'bg-emerald-50 text-emerald-600';
      if (badge === 'Atrasado') return 'bg-orange-50 text-orange-600';
      return 'bg-violet-50 text-violet-600';
    }
    if (badge === 'Ativo')     return 'bg-blue-50 text-blue-600';
    if (badge === 'Finalizado') return 'bg-slate-100 text-slate-500';
    return 'bg-slate-100 text-slate-400';
  };

  const valueColor = (type: TxRow['type']) => {
    if (type === 'expense') return 'text-red-600';
    return 'text-emerald-600';
  };

  // ── Export CSV ──────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Data', 'Descrição', 'Subtítulo', 'Tipo', 'Status', 'Valor'];
    const rows = txList.map(r => [
      r.date ? format(new Date(r.date), 'dd/MM/yyyy') : '',
      r.description,
      r.subtitle,
      r.type === 'rental' ? 'Locação' : r.type === 'sale_installment' ? 'Parcela Venda' : 'Despesa',
      r.badge ?? '',
      `${r.type === 'expense' ? '-' : ''}${r.value.toFixed(2)}`,
    ]);
    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `faturamento_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10 fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-semibold text-sm animate-in slide-in-from-top-2 duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Faturamento</h2>
          <p className="text-slate-500 mt-1">Controle financeiro unificado — locações + contratos c/ intenção de venda.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button onClick={exportCSV} className="btn-secondary flex-1 sm:flex-none">
            <FileSpreadsheet size={18} /> Exportar CSV
          </button>
          <button className="btn-primary flex-1 sm:flex-none" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Lançamento
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Faturamento Bruto"
          value={`R$ ${rentalInvoiced.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          color="bg-primary-500"
          description="Total contratado em locações"
          loading={loading}
        />
        <StatCard
          title="Total Recebido"
          value={`R$ ${totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={ArrowUpRight}
          color="bg-emerald-500"
          description="Locações + parcelas de venda pagas"
          loading={loading}
        />
        <StatCard
          title="Saldos Pendentes"
          value={`R$ ${totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="bg-amber-500"
          description="Locações + parcelas de venda abertas"
          loading={loading}
        />
        <StatCard
          title="Despesas Totais"
          value={`R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={ArrowDownRight}
          color="bg-red-500"
          description="Manutenções e operacionais"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transaction History */}
        <div className="lg:col-span-2 card !p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50/30 gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Histórico de Transações</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-semibold">Locações · Parcelas de venda · Despesas</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm transition-all text-xs font-bold">
                <Filter size={16} /> Filtros
              </button>
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm transition-all text-xs font-bold">
                <Calendar size={16} /> Este Mês
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-primary-500" /></td></tr>
                ) : txList.length === 0 ? (
                  <tr><td colSpan={4} className="py-16 text-center text-slate-400 font-medium">Nenhuma movimentação encontrada.</td></tr>
                ) : (
                  txList.map(row => (
                    <tr key={row.key} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-slate-500 whitespace-nowrap">
                        {row.date ? format(new Date(row.date), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{row.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">{row.subtitle}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {/* source icon */}
                          <div className="flex items-center gap-1">
                            {row.type === 'rental'
                              ? <Tag size={10} className="text-blue-400" />
                              : row.type === 'sale_installment'
                              ? <ShoppingCart size={10} className="text-violet-400" />
                              : <ArrowDownRight size={10} className="text-red-400" />}
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                              row.type === 'rental' ? 'text-blue-400'
                              : row.type === 'sale_installment' ? 'text-violet-400'
                              : 'text-red-400'
                            }`}>
                              {row.type === 'rental' ? 'Locação' : row.type === 'sale_installment' ? 'C/ Venda' : 'Despesa'}
                            </span>
                          </div>
                          {row.badge && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase w-fit ${badgeCls(row.type, row.badge)}`}>
                              {row.badge}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm font-black text-right whitespace-nowrap ${valueColor(row.type)}`}>
                        {row.type === 'expense' ? '- ' : ''}R$ {row.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cash Flow */}
          <div className="card !p-0 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2"><PieChart size={20} className="text-primary-400" /> Fluxo de Caixa</h3>
              <p className="text-slate-400 text-xs mt-1">Saldo consolidado (locações + vendas)</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Rental received */}
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-500">Locações Recebidas</span>
                <span className="text-blue-600">R$ {rentalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: totalReceived > 0 ? `${(rentalReceived / totalReceived) * 100}%` : '0%' }} />
              </div>

              {/* Sale received */}
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-500">Parcelas de Venda Recebidas</span>
                <span className="text-violet-600">R$ {saleReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-violet-500 h-full rounded-full transition-all" style={{ width: totalReceived > 0 ? `${(saleReceived / totalReceived) * 100}%` : '0%' }} />
              </div>

              {/* Expenses */}
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-500">Despesas Totais</span>
                <span className="text-red-600">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: totalReceived > 0 ? `${Math.min((totalExpenses / totalReceived) * 100, 100)}%` : '0%' }} />
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-1">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Saldo Líquido</span>
                <span className={`font-black text-3xl tracking-tighter ${netBalance >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
                  R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <p className="text-xs text-slate-400 mt-1">Recebido total − Despesas</p>
              </div>
            </div>
          </div>

          {/* Quick Stats breakdown */}
          <div className="card space-y-4">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest">Resumo de Vendas</h3>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Parcelas pagas</span>
              <span className="font-black text-emerald-600">R$ {saleReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Parcelas pendentes</span>
              <span className="font-black text-amber-600">R$ {salePending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-3">
              <span className="text-slate-700 font-bold">Total previsto</span>
              <span className="font-black text-violet-600">R$ {(saleReceived + salePending).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* New Entry */}
          <div className="card bg-gradient-to-br from-primary-600 to-indigo-700 text-white shadow-2xl shadow-primary-500/20 border-none p-8">
            <h3 className="text-2xl font-black mb-2 tracking-tight">Lançamento</h3>
            <p className="text-primary-100 text-sm mb-8 font-medium leading-relaxed opacity-90">Registre despesas operacionais da sua frota.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-4 bg-white text-primary-600 font-extrabold rounded-2xl hover:bg-primary-50 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Novo Lançamento
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900">Novo Lançamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-900">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-4">
                <button type="button" onClick={() => setFormData({ ...formData, type: 'expense' })}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all ${formData.type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}>
                  Despesa
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, type: 'revenue' })}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all ${formData.type === 'revenue' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
                  Receita
                </button>
              </div>
              <div className="space-y-4">
                <Field label="Descrição">
                  <input type="text" required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input-field" placeholder="Ex: Troca de óleo" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Valor (R$)">
                    <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="input-field" />
                  </Field>
                  <Field label="Data">
                    <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="input-field" />
                  </Field>
                </div>
                <Field label="Categoria">
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="input-field">
                    <option value="Manutenção">Manutenção</option>
                    <option value="Limpeza">Limpeza</option>
                    <option value="Combustível">Combustível</option>
                    <option value="Seguro">Seguro</option>
                    <option value="Impostos">Impostos (IPVA/Licenc.)</option>
                    <option value="Outros">Outros</option>
                  </select>
                </Field>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 shadow-lg shadow-primary-500/20">
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <><Save size={18} /> Confirmar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
