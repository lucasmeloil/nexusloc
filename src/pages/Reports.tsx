import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { SystemSettings } from '../types';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  CreditCard,
  DollarSign,
  PieChart,
  ArrowUpRight,
  Loader2,
  CalendarDays,
  FileSpreadsheet,
  ShoppingCart,
  Tag,
  Building2,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── helpers ────────────────────────────────────────────────────────────────
// Strips diacritics so jsPDF (no custom font) renders cleanly
const safe = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const brl = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

// Load image as base64 (needed for jsPDF addImage)
const urlToBase64 = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });

// ── Types ──────────────────────────────────────────────────────────────────
interface ReportData {
  rentalRevenue: number;
  rentalCount: number;
  rentalPending: number;
  saleRevenue: number;
  saleCount: number;
  totalRevenue: number;
  totalCount: number;
  avgValue: number;
  pendingBalance: number;
  revenueByDay: { date: string; rental: number; sale: number }[];
  revenueByMethod: { method: string; value: number }[];
  allRental: any[];
  allSale: any[];
}

// ═══════════════════════════════════════════════════════════════════════════
const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'custom'>('month');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [data, setData] = useState<ReportData | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Fetch company settings once for PDF header
  useEffect(() => {
    supabase.from('settings').select('*').single().then(({ data }) => {
      if (data) setSettings(data as SystemSettings);
    });
  }, []);

  useEffect(() => {
    if (period !== 'custom') {
      const now = new Date();
      if (period === 'day') {
        const d = format(now, 'yyyy-MM-dd');
        setDateRange({ start: d, end: d });
      } else if (period === 'week') {
        setDateRange({
          start: format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        });
      } else {
        setDateRange({ start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') });
      }
    }
  }, [period]);

  useEffect(() => { fetchReportData(); }, [dateRange]);

  // ── Data ──────────────────────────────────────────────────────────────
  const fetchReportData = async () => {
    setLoading(true);

    const [rentalRes, saleInstRes] = await Promise.all([
      supabase
        .from('contracts')
        .select('*, client:clients(name), vehicle:vehicles(model, plate)')
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`),
      supabase
        .from('sale_installments')
        .select('*, sale_contract:sale_contracts(id, sale_price, down_payment, installments, client:clients(name), vehicle:vehicles(model,plate))')
        .gte('paid_at', `${dateRange.start}T00:00:00`)
        .lte('paid_at', `${dateRange.end}T23:59:59`)
        .eq('status', 'paid'),
    ]);

    const contracts = rentalRes.data ?? [];
    const saleInst  = saleInstRes.data ?? [];

    const rentalRevenue = contracts.reduce((a, c) => a + (Number(c.deposit) || 0), 0);
    const rentalPending  = contracts.reduce((a, c) => a + (Number(c.balance)  || 0), 0);
    const saleRevenue   = saleInst.reduce((a: number, i: any) => a + (Number(i.paid_amount ?? i.amount) || 0), 0);

    const saleContractIds = new Set(saleInst.map((i: any) => i.sale_contract_id));

    const dayMap: Record<string, { rental: number; sale: number }> = {};
    const ensure = (d: string) => { if (!dayMap[d]) dayMap[d] = { rental: 0, sale: 0 }; };

    contracts.forEach((c: any) => {
      const d = format(parseISO(c.created_at), 'yyyy-MM-dd');
      ensure(d);
      dayMap[d].rental += Number(c.deposit) || 0;
    });
    saleInst.forEach((i: any) => {
      if (!i.paid_at) return;
      const d = format(parseISO(i.paid_at), 'yyyy-MM-dd');
      ensure(d);
      dayMap[d].sale += Number(i.paid_amount ?? i.amount) || 0;
    });

    const revenueByDay = Object.entries(dayMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const methodMap: Record<string, number> = {};
    contracts.forEach((c: any) => {
      const m = c.payment_method || 'Outros';
      methodMap[m] = (methodMap[m] || 0) + (Number(c.deposit) || 0);
    });
    if (saleRevenue > 0) methodMap['Parcela de Venda'] = saleRevenue;

    const totalRevenue = rentalRevenue + saleRevenue;
    const totalCount   = contracts.length + saleContractIds.size;

    setData({
      rentalRevenue, rentalCount: contracts.length, rentalPending,
      saleRevenue, saleCount: saleContractIds.size,
      totalRevenue, totalCount,
      avgValue: totalCount > 0 ? totalRevenue / totalCount : 0,
      pendingBalance: rentalPending,
      revenueByDay,
      revenueByMethod: Object.entries(methodMap).map(([method, value]) => ({ method, value })),
      allRental: contracts,
      allSale: saleInst,
    });
    setLoading(false);
  };

  // ── CSV Export ───────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!data) return;
    const headers = ['Tipo', 'Data', 'Cliente', 'Veiculo', 'Placa', 'Valor Total', 'Sinal/Pago', 'Saldo', 'Status'];
    const rentalRows = data.allRental.map((c: any) => [
      'Locacao',
      format(parseISO(c.created_at), 'dd/MM/yyyy'),
      c.client?.name || 'N/A',
      c.vehicle?.model || 'N/A',
      c.vehicle?.plate || 'N/A',
      Number(c.total_value).toFixed(2),
      Number(c.deposit).toFixed(2),
      Number(c.balance).toFixed(2),
      c.status,
    ]);
    const saleRows = data.allSale.map((i: any) => [
      'Parcela Venda',
      i.paid_at ? format(parseISO(i.paid_at), 'dd/MM/yyyy') : '',
      i.sale_contract?.client?.name || 'N/A',
      i.sale_contract?.vehicle?.model || 'N/A',
      i.sale_contract?.vehicle?.plate || 'N/A',
      Number(i.sale_contract?.sale_price || 0).toFixed(2),
      Number(i.paid_amount ?? i.amount).toFixed(2),
      '',
      'Pago',
    ]);
    const csv = [headers, ...rentalRows, ...saleRows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${dateRange.start}_a_${dateRange.end}.csv`;
    link.click();
  };

  // ── PDF Export ───────────────────────────────────────────────────────
  const exportPDF = async () => {
    if (!data) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // ─ Palette ─────────────────────────────────────────────────────────
    const PRIMARY:   [number, number, number] = [37, 99, 235];   // blue-600
    const VIOLET:    [number, number, number] = [124, 58, 237];   // violet-600
    const DARK:      [number, number, number] = [15, 23, 42];     // slate-900
    const MUTED:     [number, number, number] = [100, 116, 139];  // slate-500
    const LIGHT:     [number, number, number] = [241, 245, 249];  // slate-100
    const WHITE:     [number, number, number] = [255, 255, 255];
    const EMERALD:   [number, number, number] = [5, 150, 105];
    const AMBER:     [number, number, number] = [217, 119, 6];

    // ─ Header gradient band ─────────────────────────────────────────────
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, W, 42, 'F');

    // Accent stripe
    doc.setFillColor(...VIOLET);
    doc.rect(0, 38, W, 4, 'F');

    // Company logo (if available)
    const logoUrl = settings?.logo_url;
    let logoLoaded = false;
    if (logoUrl) {
      try {
        const b64 = await urlToBase64(logoUrl);
        doc.addImage(b64, 'PNG', 10, 6, 28, 28);
        logoLoaded = true;
      } catch { /* no logo — use text fallback */ }
    }

    const titleX = logoLoaded ? 44 : 14;

    // Company name
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(safe(settings?.company_name ?? 'NexusLoc'), titleX, 18);

    // Sub-info
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const sub: string[] = [];
    if (settings?.company_cnpj)   sub.push(`CNPJ: ${settings.company_cnpj}`);
    if (settings?.company_phone)  sub.push(settings.company_phone);
    if (settings?.company_email)  sub.push(settings.company_email);
    if (sub.length) doc.text(sub.join('   |   '), titleX, 25);

    // Report title (right side)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATORIO OPERACIONAL', W - 14, 16, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periodo: ${format(parseISO(dateRange.start), 'dd/MM/yyyy')} a ${format(parseISO(dateRange.end), 'dd/MM/yyyy')}`, W - 14, 22, { align: 'right' });
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, W - 14, 27, { align: 'right' });

    let y = 50;

    // ─ Summary boxes ────────────────────────────────────────────────────
    const boxes = [
      { label: 'Receita Total',      value: brl(data.totalRevenue),   color: EMERALD },
      { label: 'Locacoes',           value: brl(data.rentalRevenue),  color: PRIMARY },
      { label: 'Parcelas de Venda',  value: brl(data.saleRevenue),    color: VIOLET  },
      { label: 'Pendente',           value: brl(data.pendingBalance), color: AMBER   },
    ];
    const boxW = (W - 28) / boxes.length;
    boxes.forEach((b, i) => {
      const bx = 14 + i * (boxW + 2);
      doc.setFillColor(...(LIGHT));
      doc.roundedRect(bx, y, boxW, 22, 3, 3, 'F');
      doc.setDrawColor(...b.color);
      doc.setLineWidth(0.8);
      doc.roundedRect(bx, y, boxW, 22, 3, 3, 'S');
      // top colored bar
      doc.setFillColor(...b.color);
      doc.roundedRect(bx, y, boxW, 5, 3, 3, 'F');
      doc.rect(bx, y + 2, boxW, 3, 'F');
      // label
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...MUTED);
      doc.text(safe(b.label).toUpperCase(), bx + 4, y + 11);
      // value
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK);
      doc.text(b.value, bx + 4, y + 19);
    });

    y += 30;

    // ─ Stats row ────────────────────────────────────────────────────────
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    const stats = [
      `Total de movimentacoes: ${data.totalCount}`,
      `Locacoes: ${data.rentalCount}`,
      `Contratos de venda: ${data.saleCount}`,
      `Ticket medio: ${brl(data.avgValue)}`,
    ];
    doc.text(stats.join('    |    '), 14, y);
    y += 3;

    // Divider
    doc.setDrawColor(...LIGHT);
    doc.setLineWidth(0.4);
    doc.line(14, y, W - 14, y);
    y += 6;

    // ─ Rental contracts table ────────────────────────────────────────────
    if (data.allRental.length > 0) {
      // Section header
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(14, y, W - 28, 8, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text(`CONTRATOS DE LOCACAO  (${data.allRental.length})`, 18, y + 5.5);
      y += 10;

      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [['Data', 'Cliente', 'Veiculo / Placa', 'Valor Total', 'Sinal', 'Saldo', 'Status']],
        body: data.allRental.map((c: any) => [
          format(parseISO(c.created_at), 'dd/MM/yy'),
          safe(c.client?.name || 'N/A'),
          safe(`${c.vehicle?.model || ''} (${c.vehicle?.plate || ''})`),
          brl(Number(c.total_value)),
          brl(Number(c.deposit)),
          brl(Number(c.balance)),
          safe(c.status === 'active' ? 'Ativo' : c.status === 'finished' ? 'Finalizado' : 'Cancelado'),
        ]),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2.5, textColor: DARK, lineColor: [226, 232, 240] },
        headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 18 },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { cellWidth: 20, halign: 'center' },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ─ Sale installments table ───────────────────────────────────────────
    if (data.allSale.length > 0) {
      // Page break if needed
      if (y > H - 60) { doc.addPage(); y = 16; }

      doc.setFillColor(...VIOLET);
      doc.roundedRect(14, y, W - 28, 8, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text(`PARCELAS DE VENDA RECEBIDAS  (${data.allSale.length})`, 18, y + 5.5);
      y += 10;

      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [['Data Pagto', 'Cliente', 'Veiculo / Placa', 'Parcela', 'Valor Pago']],
        body: data.allSale.map((i: any) => [
          i.paid_at ? format(parseISO(i.paid_at), 'dd/MM/yy') : '—',
          safe(i.sale_contract?.client?.name || 'N/A'),
          safe(`${i.sale_contract?.vehicle?.model || ''} (${i.sale_contract?.vehicle?.plate || ''})`),
          `${i.installment_number ?? '?'}/${i.sale_contract?.installments ?? '?'}`,
          brl(Number(i.paid_amount ?? i.amount)),
        ]),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2.5, textColor: DARK, lineColor: [226, 232, 240] },
        headStyles: { fillColor: VIOLET, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        columnStyles: {
          0: { cellWidth: 22 },
          3: { cellWidth: 18, halign: 'center' },
          4: { halign: 'right' },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ─ Footer on every page ─────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFillColor(...LIGHT);
      doc.rect(0, H - 10, W, 10, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(
        safe(`${settings?.company_name ?? 'NexusLoc'}  |  Relatorio gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`),
        14, H - 4,
      );
      doc.text(`Pagina ${p} de ${pageCount}`, W - 14, H - 4, { align: 'right' });
    }

    doc.save(`relatorio_${dateRange.start}_a_${dateRange.end}.pdf`);
  };

  // ── Section wrapper ────────────────────────────────────────────────────
  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="card">
      <div className="flex items-center gap-2 mb-6 text-slate-900 border-b border-slate-100 pb-4">
        <span className="text-primary-600">{icon}</span>
        <h3 className="font-bold text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Relatórios Operacionais</h2>
          <p className="text-slate-500 mt-1">Análise unificada de locações e contratos c/ intenção de venda.</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm self-start">
          {([
            { id: 'day',    label: 'Hoje' },
            { id: 'week',   label: 'Semana' },
            { id: 'month',  label: 'Mês' },
            { id: 'custom', label: 'Personalizado' },
          ] as const).map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
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

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="card flex flex-wrap items-end gap-4 animate-in slide-in-from-top-2 shadow-xl border-primary-100">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
              <Calendar size={14} className="text-primary-500" /> Data Inicial
            </label>
            <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="input-field" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
              <Calendar size={14} className="text-primary-500" /> Data Final
            </label>
            <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="input-field" />
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
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Receita Total"
              value={`R$ ${data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={TrendingUp}
              color="bg-emerald-500"
              description={`${data.rentalCount} locações + ${data.saleCount} vendas`}
            />
            <StatCard
              title="Locações"
              value={`R$ ${data.rentalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={Tag}
              color="bg-blue-500"
              description={`${data.rentalCount} contratos no período`}
            />
            <StatCard
              title="Parcelas de Venda"
              value={`R$ ${data.saleRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={ShoppingCart}
              color="bg-violet-500"
              description="Parcelas pagas no período"
            />
            <StatCard
              title="Ticket Médio"
              value={`R$ ${data.avgValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={CreditCard}
              color="bg-primary-500"
              description="Média por movimentação"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Daily revenue */}
            <Section title="Faturamento Diário" icon={<CalendarDays size={20} />}>
              <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {data.revenueByDay.length === 0 ? (
                  <p className="text-sm text-slate-400 py-10 text-center">Nenhum faturamento registrado.</p>
                ) : (
                  data.revenueByDay.map(day => {
                    const total = day.rental + day.sale;
                    return (
                      <div key={day.date} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm text-primary-600">
                              <DollarSign size={12} />
                            </div>
                            <span className="text-sm font-bold text-slate-600">
                              {format(parseISO(day.date), "dd 'de' MMM", { locale: ptBR })}
                            </span>
                          </div>
                          <span className="text-sm font-black text-slate-900">
                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex gap-3 text-[10px] font-bold">
                          {day.rental > 0 && (
                            <span className="text-blue-500 flex items-center gap-1">
                              <Tag size={9} /> R$ {day.rental.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                          {day.sale > 0 && (
                            <span className="text-violet-500 flex items-center gap-1">
                              <ShoppingCart size={9} /> R$ {day.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Section>

            {/* By payment method */}
            <Section title="Meios de Pagamento" icon={<PieChart size={20} />}>
              <div className="space-y-6">
                {data.revenueByMethod.length === 0 ? (
                  <p className="text-sm text-slate-400 py-10 text-center">Nenhum dado financeiro.</p>
                ) : (
                  data.revenueByMethod.map(m => {
                    const pct = data.totalRevenue > 0 ? (m.value / data.totalRevenue) * 100 : 0;
                    const isVenda = m.method === 'Parcela de Venda';
                    return (
                      <div key={m.method} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            {isVenda
                              ? <ShoppingCart size={12} className="text-violet-500" />
                              : <Tag size={12} className="text-blue-500" />}
                            {m.method}
                          </span>
                          <span className="font-black text-primary-600">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-full transition-all duration-1000 ease-out ${isVenda ? 'bg-violet-500' : 'bg-primary-500'}`}
                            style={{ width: `${pct}%` }}
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

            {/* Export */}
            <Section title="Exportar Relatório" icon={<Download size={20} />}>
              <div className="space-y-4">
                {/* Company info badge */}
                {settings && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 mb-2">
                    {settings.logo_url
                      ? <img src={settings.logo_url} alt="logo" className="h-8 w-8 object-contain rounded-lg" />
                      : <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center"><Building2 size={16} className="text-primary-600" /></div>}
                    <div>
                      <p className="text-xs font-black text-slate-900">{settings.company_name}</p>
                      {settings.company_cnpj && <p className="text-[10px] text-slate-400">CNPJ: {settings.company_cnpj}</p>}
                    </div>
                  </div>
                )}

                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  Gere arquivos com todos os dados do período — locações <strong>e</strong> contratos de venda.
                </p>
                <button
                  onClick={exportPDF}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
                >
                  <Download size={18} /> Baixar PDF Profissional
                </button>
                <button
                  onClick={exportCSV}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95"
                >
                  <FileSpreadsheet size={18} /> Exportar Planilha (CSV)
                </button>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 mt-4">
                  <div className="flex gap-3">
                    <div className="p-2 bg-blue-500 text-white rounded-lg h-fit"><ArrowUpRight size={18} /></div>
                    <div>
                      <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Dados Inclusos</p>
                      <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                        {data.rentalCount} locaç{data.rentalCount !== 1 ? 'ões' : 'ão'} +{' '}
                        {data.allSale.length} parcela{data.allSale.length !== 1 ? 's' : ''} de venda no período selecionado.
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
