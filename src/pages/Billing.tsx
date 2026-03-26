import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Contract, Expense } from '../types';

import { format } from 'date-fns';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download, 
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
  CheckCircle2
} from 'lucide-react';
import { StatCard } from '../components/StatCard';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-slate-700">{label}</label>
    {children}
  </div>
);

const Billing: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
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
    type: 'expense' as 'expense' | 'revenue'
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: contractsData } = await supabase.from('contracts').select('*, client:clients(name)').order('created_at', { ascending: false });
    const { data: expensesData } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    
    if (contractsData) setContracts(contractsData);
    if (expensesData) setExpenses(expensesData);
    setLoading(false);
  };

  const handleOpenModal = () => {
    setFormData({
      description: '',
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      category: 'Manutenção',
      type: 'expense'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (formData.type === 'expense') {
      const { error } = await supabase.from('expenses').insert([{
        description: formData.description,
        amount: formData.amount,
        date: formData.date,
        category: formData.category
      }]);

      if (error) {
        showToast('error', 'Erro ao registrar despesa: ' + error.message);
      } else {
        showToast('success', 'Despesa registrada com sucesso!');
        setIsModalOpen(false);
        fetchData();
      }
    } else {
      // In this system, extra revenue would usually come through contracts, 
      // but if we want to allow manual adjustment, we would need a revenue table or similar.
      // For now, let's just show an alert or handle it as a negative expense if the schema permits,
      // but it's better to just implement it as an expense for now or tell user it's for expenses.
      showToast('error', 'Atualmente apenas o registro de despesas manuais é suportado nesta tela.');
    }
    setSaving(false);
  };

  const totalInvoiced = contracts.reduce((acc, c) => acc + (Number(c.total_value) || 0), 0);
  const totalReceived = contracts.reduce((acc, c) => acc + (Number(c.deposit) || 0), 0);
  const totalPending = contracts.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-10 fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-semibold text-sm animate-in slide-in-from-top-2 duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {toast.msg}
        </div>
      )}

       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Faturamento</h2>
          <p className="text-slate-500 mt-1">Controle financeiro, recebíveis e despesas da frota.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button className="btn-secondary flex-1 sm:flex-none">
            <FileSpreadsheet size={18} />
            Exportar
          </button>
          <button className="btn-primary flex-1 sm:flex-none" onClick={handleOpenModal}>
            <Plus size={18} />
            Lançamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Faturamento Bruto" 
          value={`R$ ${totalInvoiced.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={TrendingUp} 
          color="bg-primary-500" 
          description="Total contratado (Histórico)"
          loading={loading}
        />
        <StatCard 
          title="Valor Recebido" 
          value={`R$ ${totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={ArrowUpRight} 
          color="bg-emerald-500" 
          description="Entradas já compensadas"
          loading={loading}
        />
        <StatCard 
          title="Saldos Pendentes" 
          value={`R$ ${totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={DollarSign} 
          color="bg-amber-500" 
          description="Valores a serem liquidados"
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
         <div className="lg:col-span-2 card !p-0 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50/30 gap-4">
              <h3 className="text-xl font-bold text-slate-900">Histórico de Transações</h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm transition-all text-xs font-bold"><Filter size={16} /> Filtros</button>
                <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm transition-all text-xs font-bold"><Calendar size={16} /> Este Mês</button>
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
                  ) : (
                    <>
                      {contracts.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">{format(new Date(c.created_at), 'dd/MM/yyyy')}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-900 group-hover:text-primary-600 transition-colors">Locação #{c.id.slice(0,6).toUpperCase()}</p>
                            <p className="text-xs text-slate-500 italic">Cliente: {c.client?.name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-wider">Receita</span>
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-emerald-600 text-right">R$ {Number(c.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                      {expenses.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">{format(new Date(e.date), 'dd/MM/yyyy')}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">{e.description}</p>
                            <p className="text-xs text-slate-500 italic">Categoria: {e.category}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-wider">Despesa</span>
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-red-600 text-right">- R$ {Number(e.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
         </div>

         <div className="space-y-6">
            <div className="card !p-0 overflow-hidden">
               <div className="p-6 bg-slate-900 text-white">
                  <h3 className="text-xl font-bold flex items-center gap-2"><PieChart size={20} className="text-primary-400" /> Fluxo de Caixa</h3>
                  <p className="text-slate-400 text-xs mt-1">Saldo consolidado do período</p>
               </div>
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-500">Receita Recebida</span>
                  <span className="text-emerald-600">R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-emerald-500 h-full w-[85%] rounded-full" />
                </div>
                
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-500">Despesas Totais</span>
                  <span className="text-red-600">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-red-500 h-full w-[15%] rounded-full" />
                </div>

                <div className="pt-6 border-t border-slate-100 flex flex-col gap-1">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Saldo Líquido</span>
                  <span className={`font-black text-3xl tracking-tighter ${totalReceived - totalExpenses >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
                    R$ {(totalReceived - totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-primary-600 to-indigo-700 text-white shadow-2xl shadow-primary-500/20 border-none p-8">
              <h3 className="text-2xl font-black mb-2 tracking-tight">Manual</h3>
              <p className="text-primary-100 text-sm mb-8 font-medium leading-relaxed opacity-90">Registre manutenções, multas ou despesas operacionais da sua frota.</p>
              <button 
                onClick={handleOpenModal}
                className="w-full py-4 bg-white text-primary-600 font-extrabold rounded-2xl hover:bg-primary-50 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Novo Lançamento
              </button>
            </div>
         </div>
      </div>

      {/* Modal - Novo Lançamento */}
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
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, type: 'expense'})}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all ${formData.type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Despesa
                </button>
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, type: 'revenue'})}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all ${formData.type === 'revenue' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-50'}`}
                >
                  Receita
                </button>
              </div>

              <div className="space-y-4">
                <Field label="Descrição">
                  <input 
                    type="text" 
                    required 
                    value={formData.description} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })} 
                    className="input-field" 
                    placeholder="Ex: Troca de óleo, Limpeza, etc." 
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Valor (R$)">
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      value={formData.amount} 
                      onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} 
                      className="input-field" 
                    />
                  </Field>
                  <Field label="Data">
                    <input 
                      type="date" 
                      required 
                      value={formData.date} 
                      onChange={e => setFormData({ ...formData, date: e.target.value })} 
                      className="input-field" 
                    />
                  </Field>
                </div>

                <Field label="Categoria">
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="input-field"
                  >
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
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="btn-primary flex-1 shadow-lg shadow-primary-500/20"
                >
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
