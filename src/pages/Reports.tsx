import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  CreditCard,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  CalendarDays,
  FileSpreadsheet,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Contract } from '../types';

interface ReportData {
  totalRevenue: number;
  contractCount: number;
  averageContractValue: number;
  pendingBalance: number;
  revenueByDay: { date: string; value: number }[];
  revenueByMethod: { method: string; value: number }[];
  allContracts: any[];
}

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'custom'>('month');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    const updateRange = () => {
      const now = new Date();
      if (period === 'day') {
        const d = format(now, 'yyyy-MM-dd');
        setDateRange({ start: d, end: d });
      } else if (period === 'week') {
        setDateRange({
          start: format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        });
      } else if (period === 'month') {
        setDateRange({
          start: format(startOfMonth(now), 'yyyy-MM-dd'),
          end: format(endOfMonth(now), 'yyyy-MM-dd'),
        });
      }
    };
    if (period !== 'custom') updateRange();
  }, [period]);

  useEffect(() => {
    fetchReportData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('*, client:clients(name), vehicle:vehicles(model, plate)')
      .gte('created_at', `${dateRange.start}T00:00:00`)
      .lte('created_at', `${dateRange.end}T23:59:59`);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (contracts) {
      const total = contracts.reduce((acc, c) => acc + (Number(c.deposit) || 0), 0);
      const pending = contracts.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
      
      const dayMap: Record<string, number> = {};
      const methodMap: Record<string, number> = {};

      contracts.forEach(c => {
        const d = format(parseISO(c.created_at), 'yyyy-MM-dd');
        dayMap[d] = (dayMap[d] || 0) + (Number(c.deposit) || 0);

        const m = c.payment_method || 'Outros';
        methodMap[m] = (methodMap[m] || 0) + (Number(c.deposit) || 0);
      });

      setData({
        totalRevenue: total,
        contractCount: contracts.length,
        averageContractValue: contracts.length > 0 ? total / contracts.length : 0,
        pendingBalance: pending,
        revenueByDay: Object.entries(dayMap).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date)),
        revenueByMethod: Object.entries(methodMap).map(([method, value]) => ({ method, value })),
        allContracts: contracts,
      });
    }
    setLoading(false);
  };

  const exportCSV = () => {
    if (!data) return;
    const headers = ['ID', 'Data', 'Cliente', 'Veículo', 'Placa', 'Valor Total', 'Sinal', 'Saldo', 'Status', 'Metodo'];
    const rows = data.allContracts.map(c => [
      c.id.slice(0, 8),
      format(parseISO(c.created_at), 'dd/MM/yyyy'),
      c.client?.name || 'N/A',
      c.vehicle?.model || 'N/A',
      c.vehicle?.plate || 'N/A',
      c.total_value,
      c.deposit,
      c.balance,
      c.status,
      c.payment_method
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${dateRange.start}_a_${dateRange.end}.csv`;
    link.click();
  };

  const exportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Relatório Operacional - NexusLoc', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${format(parseISO(dateRange.start), 'dd/MM/yyyy')} a ${format(parseISO(dateRange.end), 'dd/MM/yyyy')}`, 14, 30);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 35);

    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`Resumo Financeiro:`, 14, 45);
    doc.setFontSize(10);
    doc.text(`Receita Total: R$ ${data.totalRevenue.toLocaleString('pt-BR')}`, 14, 52);
    doc.text(`Saldos Pendentes: R$ ${data.pendingBalance.toLocaleString('pt-BR')}`, 14, 57);
    doc.text(`Total de Contratos: ${data.contractCount}`, 14, 62);
    doc.text(`Ticket Médio: R$ ${data.averageContractValue.toLocaleString('pt-BR')}`, 14, 67);

    const tableData = data.allContracts.map(c => [
      format(parseISO(c.created_at), 'dd/MM/yyyy'),
      c.client?.name || 'N/A',
      `${c.vehicle?.model} (${c.vehicle?.plate})`,
      `R$ ${Number(c.total_value).toLocaleString('pt-BR')}`,
      c.status
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['Data', 'Cliente', 'Veículo', 'Valor Total', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`relatorio_${dateRange.start}_a_${dateRange.end}.pdf`);
  };

  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="card">
      <div className="flex items-center gap-2 mb-6 text-slate-900 border-b border-slate-100 pb-4">
        <span className="text-primary-600">{icon}</span>
        <h3 className="font-bold text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Relatórios Operacionais</h2>
          <p className="text-slate-500 mt-1">Análise de desempenho e faturamento por período.</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm self-start">
          {[
            { id: 'day', label: 'Hoje' },
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mês' },
            { id: 'custom', label: 'Personalizado' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                period === p.id 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div className="card flex flex-wrap items-end gap-4 animate-in slide-in-from-top-2 shadow-xl border-primary-100">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
              <Calendar size={14} className="text-primary-500" /> Data Inicial
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
              <Calendar size={14} className="text-primary-500" /> Data Final
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="input-field"
            />
          </div>
          <button onClick={fetchReportData} className="btn-primary min-w-[140px] shadow-lg shadow-primary-500/20">
            Filtrar Dados
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Receita no Período"
              value={`R$ ${data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={TrendingUp}
              color="bg-emerald-500"
              description={`${data.contractCount} contratos assinados`}
            />
            <StatCard
              title="Ticket Médio"
              value={`R$ ${data.averageContractValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={CreditCard}
              color="bg-primary-500"
              description="Média por locação"
            />
            <StatCard
              title="Saldo Pendente"
              value={`R$ ${data.pendingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              color="bg-amber-500"
              description="Total a receber"
            />
            <StatCard
              title="Locações Totais"
              value={data.contractCount.toString()}
              icon={BarChart3}
              color="bg-purple-500"
              description="Contratos no período"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Section title="Faturamento Diário" icon={<CalendarDays size={20} />}>
              <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {data.revenueByDay.length === 0 ? (
                  <p className="text-sm text-slate-400 py-10 text-center">Nenhum faturamento registrado.</p>
                ) : (
                  data.revenueByDay.map(day => (
                    <div key={day.date} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-primary-600">
                          <DollarSign size={14} />
                        </div>
                        <span className="text-sm font-bold text-slate-600">
                          {format(parseISO(day.date), "dd 'de' MMM", { locale: ptBR })}
                        </span>
                      </div>
                      <span className="text-sm font-black text-slate-900">
                        R$ {day.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section title="Meios de Pagamento" icon={<PieChart size={20} />}>
              <div className="space-y-6">
                {data.revenueByMethod.length === 0 ? (
                  <p className="text-sm text-slate-400 py-10 text-center">Nenhum dado financeiro.</p>
                ) : (
                  data.revenueByMethod.map(m => {
                    const percent = (m.value / data.totalRevenue) * 100;
                    return (
                      <div key={m.method} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-slate-700">{m.method}</span>
                          <span className="font-black text-primary-600">{percent.toFixed(1)}%</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-primary-500 transition-all duration-1000 ease-out" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Total: R$ {m.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </Section>

            <Section title="Exportar Relatório" icon={<Download size={20} />}>
              <div className="space-y-4">
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  Gere arquivos detalhados para contabilidade ou análise externa.
                </p>
                <button 
                  onClick={exportPDF}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
                >
                  <Download size={18} />
                  Baixar PDF Detalhado
                </button>
                <button 
                  onClick={exportCSV}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95"
                >
                  <FileSpreadsheet size={18} />
                  Exportar Planilha (CSV)
                </button>
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 mt-4">
                  <div className="flex gap-3">
                    <div className="p-2 bg-blue-500 text-white rounded-lg h-fit">
                      <ArrowUpRight size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Dados Inclusos</p>
                      <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                        A exportação contém todos os {data.contractCount} contratos visualizados no período selecionado acima.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </>
      ) : (
        <div className="py-20 text-center text-slate-400">Dados não disponíveis para este período.</div>
      )}
    </div>
  );
};

export default Reports;
