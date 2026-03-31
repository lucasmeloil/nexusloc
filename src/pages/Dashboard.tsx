import React, { useEffect, useState } from 'react';
import {
  Car,
  TrendingUp,
  CircleCheck,
  Calendar,
  Clock,
  ChevronRight,
  FileText,
  Loader2,
  ShoppingCart,
  Tag,
  AlertTriangle,
  Send,
  BellRing,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StatCard } from '../components/StatCard';
import { format } from 'date-fns';
import type { Contract, Client, Vehicle } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────
interface ContractWithRelations extends Omit<Contract, 'vehicle'> {
  client: Client;
  vehicle: Pick<Vehicle, 'model' | 'plate'>;
}

interface SaleContractRow {
  id: string;
  created_at: string;
  sale_price: number;
  down_payment: number;
  installments: number;
  status: string;
  client: { id: string; name: string } | null;
  vehicle: { model: string; plate: string } | null;
  installment_records?: { status: string; amount: number; paid_amount: number | null }[];
}

// Unified activity row shown in the table
interface ActivityRow {
  id: string;
  created_at: string;
  type: 'rental' | 'sale';
  client_name: string;
  vehicle_model: string;
  vehicle_plate: string;
  status: string;
  value: number;
}

interface TopClient {
  id: string;
  name: string;
  contractCount: number;
  totalSpent: number;
}

interface InstallmentAlert {
  id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: 'pending' | 'overdue';
  contract_id: string;
  client_name: string;
  client_phone: string;
  vehicle_model: string;
  vehicle_plate: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const rentalBadge = (s: string) => {
  if (s === 'active')   return { text: 'Locação Ativa',     cls: 'bg-blue-100 text-blue-700' };
  if (s === 'finished') return { text: 'Finalizada',         cls: 'bg-slate-100 text-slate-500' };
  return                       { text: 'Cancelada',          cls: 'bg-red-100 text-red-600' };
};

const saleBadge = (s: string) => {
  if (s === 'active')  return { text: 'Venda Ativa',  cls: 'bg-violet-100 text-violet-700' };
  if (s === 'paid')    return { text: 'Venda Quitada', cls: 'bg-emerald-100 text-emerald-700' };
  if (s === 'overdue') return { text: 'Venda Atrasada', cls: 'bg-orange-100 text-orange-700' };
  return                      { text: 'Cancelada',      cls: 'bg-red-100 text-red-600' };
};

// ═══════════════════════════════════════════════════════════════════════════
const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    availableVehicles: 0,
    rentedVehicles: 0,
    inSaleVehicles: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    saleRevenue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityRow[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [alerts, setAlerts] = useState<InstallmentAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      const [vehiclesRes, contractsRes, saleRes, alertsRes] = await Promise.all([
        supabase.from('vehicles').select('status'),
        supabase
          .from('contracts')
          .select('*, client:clients(*), vehicle:vehicles(model, plate)')
          .order('created_at', { ascending: false }),
        supabase
          .from('sale_contracts')
          .select('id, created_at, sale_price, down_payment, installments, status, client:clients(id, name), vehicle:vehicles(model, plate), installment_records:sale_installments(status, amount, paid_amount)')
          .order('created_at', { ascending: false }),
        supabase
          .from('sale_installments')
          .select('id, installment_number, due_date, amount, status, sale_contract_id, contract:sale_contracts(client:clients(name, phone), vehicle:vehicles(model, plate))')
          .in('status', ['pending', 'overdue'])
          .lte('due_date', format(new Date(), 'yyyy-MM-dd'))
          .order('due_date', { ascending: true })
      ]);

      // ── Alertas (Hoje / Atrasados) ───────────────────────────────────
      if (alertsRes.data) {
        const parsedAlerts = (alertsRes.data as any[]).map(a => ({
          id: a.id,
          installment_number: a.installment_number,
          due_date: a.due_date,
          amount: Number(a.amount) || 0,
          status: a.status,
          contract_id: a.sale_contract_id,
          client_name: a.contract?.client?.name || '—',
          client_phone: a.contract?.client?.phone || '',
          vehicle_model: a.contract?.vehicle?.model || '—',
          vehicle_plate: a.contract?.vehicle?.plate || ''
        }));
        setAlerts(parsedAlerts);
      }

      // ── Vehicle stats ────────────────────────────────────────────────
      if (vehiclesRes.data) {
        setStats(prev => ({
          ...prev,
          availableVehicles: vehiclesRes.data.filter(v => v.status === 'available').length,
          rentedVehicles:    vehiclesRes.data.filter(v => v.status === 'rented').length,
          inSaleVehicles:    vehiclesRes.data.filter(v => v.status === 'in_sale').length,
        }));
      }

      // ── Sale contracts revenue ───────────────────────────────────────
      if (saleRes.data) {
        const saleRevenue = (saleRes.data as unknown as SaleContractRow[]).reduce((acc, sc) => {
          const paid = (sc.installment_records ?? [])
            .filter(i => i.status === 'paid')
            .reduce((s, i) => s + (Number(i.paid_amount ?? i.amount) || 0), 0);
          return acc + Number(sc.down_payment) + paid;
        }, 0);
        setStats(prev => ({ ...prev, saleRevenue }));
      }

      // ── Rental contracts stats + top clients ─────────────────────────
      if (contractsRes.data) {
        const allContracts = contractsRes.data as ContractWithRelations[];

        const revenue = allContracts
          .filter(c => c.status === 'active' || c.status === 'finished')
          .reduce((acc, c) => acc + (Number(c.deposit) || 0), 0);

        const pending = allContracts
          .filter(c => c.status === 'active')
          .reduce((acc, c) => acc + (Number(c.balance) || 0), 0);

        setStats(prev => ({ ...prev, monthlyRevenue: revenue, pendingPayments: pending }));

        // Top clients from rental
        const clientMap: Record<string, { name: string; count: number; total: number }> = {};
        for (const c of allContracts) {
          if (!c.client_id || !c.client) continue;
          if (!clientMap[c.client_id]) clientMap[c.client_id] = { name: c.client.name, count: 0, total: 0 };
          clientMap[c.client_id].count += 1;
          clientMap[c.client_id].total += Number(c.total_value) || 0;
        }
        // Add sale contracts to top clients
        if (saleRes.data) {
          for (const sc of (saleRes.data as unknown as SaleContractRow[])) {
            if (!sc.client?.id) continue;
            if (!clientMap[sc.client.id]) clientMap[sc.client.id] = { name: sc.client.name, count: 0, total: 0 };
            clientMap[sc.client.id].count += 1;
            clientMap[sc.client.id].total += Number(sc.sale_price) || 0;
          }
        }
        const ranked: TopClient[] = Object.entries(clientMap)
          .map(([id, v]) => ({ id, name: v.name, contractCount: v.count, totalSpent: v.total }))
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5);
        setTopClients(ranked);
      }

      // ── Unified activity feed (rental + sale, sorted by date, top 8) ─
      const rentalRows: ActivityRow[] = ((contractsRes.data ?? []) as ContractWithRelations[]).map(c => ({
        id: c.id,
        created_at: c.created_at,
        type: 'rental',
        client_name:   c.client?.name ?? '—',
        vehicle_model: c.vehicle?.model ?? '—',
        vehicle_plate: c.vehicle?.plate ?? '',
        status: c.status,
        value: Number(c.total_value) || 0,
      }));

      const saleRows: ActivityRow[] = ((saleRes.data ?? []) as unknown as SaleContractRow[]).map(sc => ({
        id: sc.id,
        created_at: sc.created_at,
        type: 'sale',
        client_name:   sc.client?.name ?? '—',
        vehicle_model: sc.vehicle?.model ?? '—',
        vehicle_plate: sc.vehicle?.plate ?? '',
        status: sc.status,
        value: Number(sc.sale_price) || 0,
      }));

      const combined = [...rentalRows, ...saleRows]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8);

      setRecentActivity(combined);
      setLoading(false);
    };

    fetchAll();
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 mt-1">Visão geral da sua frota e faturamento.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Calendar size={18} />
            {format(new Date(), 'MMMM yyyy').replace(/^\w/, c => c.toUpperCase())}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Disponíveis"   value={stats.availableVehicles.toString()} icon={CircleCheck}   color="bg-emerald-500" description="Prontos para locar"              loading={loading} />
        <StatCard title="Alugados"      value={stats.rentedVehicles.toString()}    icon={Car}           color="bg-blue-500"    description="Contratos de locação ativos"   loading={loading} />
        <StatCard title="Em Venda"      value={stats.inSaleVehicles.toString()}    icon={ShoppingCart}  color="bg-violet-500"  description="Aluguel c/ intenção de venda"  loading={loading} />
        <StatCard
          title="Total Recebido"
          value={`R$ ${(stats.monthlyRevenue + stats.saleRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          color="bg-primary-500"
          description="Locações + parcelas de venda"
          loading={loading}
        />
        <StatCard
          title="Pendente"
          value={`R$ ${stats.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Clock}
          color="bg-amber-500"
          description="Saldos a receber"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Alertas de Cobrança (Painel Específico) */}
          <div className={`card ${alerts.length > 0 ? 'border-l-4 border-l-red-500 shadow-xl shadow-red-500/10' : 'border-l-4 border-l-emerald-500'}`}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${alerts.length > 0 ? 'bg-red-100/50 text-red-600' : 'bg-emerald-100/50 text-emerald-600'}`}>
                  {alerts.length > 0 ? <BellRing size={22} className="animate-pulse" /> : <CircleCheck size={22} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Painel de Cobranças</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">
                    Monitoramento Diário de Locação c/ Intenção de Venda
                  </p>
                </div>
              </div>
              <a href="/contratos" className="btn-secondary text-sm font-semibold gap-2">
                <FileText size={16} /> Ver Todos
              </a>
            </div>

            {alerts.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-white border border-slate-100/50 rounded-2xl shadow-sm">
                <div className="w-16 h-16 rounded-full bg-emerald-100/60 flex items-center justify-center mb-4 shadow-inner">
                  <CircleCheck size={32} className="text-emerald-500" />
                </div>
                <h4 className="text-lg font-extrabold text-slate-900">Cobranças em Dia!</h4>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Sua carteira de recebíveis deste segmento está positiva. Não há parcelas vencendo na data de hoje nem saldos em atraso.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alerts.slice(0, 6).map(alert => {
                    const isToday = alert.due_date === format(new Date(), 'yyyy-MM-dd');
                    const statusColor = isToday ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';
                    
                    return (
                      <div key={alert.id} className={`p-4 rounded-2xl border ${statusColor} flex flex-col justify-between gap-3`}>
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${isToday ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {isToday ? 'Vence Hoje' : 'Em Atraso'}
                            </span>
                            <span className="text-[10px] font-black opacity-60">
                              {format(new Date(alert.due_date), 'dd/MM/yyyy')}
                            </span>
                          </div>
                          <p className="font-bold text-sm truncate" title={alert.client_name}>{alert.client_name}</p>
                          <p className="text-xs font-semibold opacity-70 truncate">{alert.vehicle_model} {alert.vehicle_plate}</p>
                        </div>
                        
                        <div className="flex items-end justify-between mt-1">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Parcela {alert.installment_number}</p>
                            <p className="text-lg font-black">{alert.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          </div>
                          <button
                            onClick={() => {
                              const phone = alert.client_phone?.replace(/\D/g, '');
                              const msg = `Olá ${alert.client_name}! 👋\n\nEste é um lembrete de que sua parcela ${alert.installment_number} de ${alert.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} referente ao veículo ${alert.vehicle_model} está ${isToday ? 'vencendo hoje' : 'em atraso'}.\n\nPara pagamentos via Pix ou dúvidas, estamos à disposição!\n\nNexusLoc`;
                              window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            className="p-2 bg-white/50 hover:bg-white rounded-xl shadow-sm transition-colors text-emerald-600"
                            title="Enviar Lembrete WhatsApp"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {alerts.length > 6 && (
                  <p className="text-center text-xs text-slate-400 font-bold mt-2 uppercase">E mais {alerts.length - 6} parcelas pendentes (veja no painel de Vendas)</p>
                )}
              </div>
            )}
          </div>

          {/* Unified Activity Feed */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Movimentações Recentes</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-semibold">Locações + contratos c/ intenção de venda</p>
            </div>
            <a href="/contratos" className="text-primary-600 font-bold text-sm hover:underline flex items-center gap-1">
              Ver todos <ChevronRight size={16} />
            </a>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="py-12 text-center">
              <FileText size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhuma movimentação ainda.</p>
              <p className="text-slate-400 text-sm mt-1">Crie contratos na página de Contratos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs border-b border-slate-100">
                    <th className="pb-4 px-2 font-semibold uppercase tracking-wider">Cliente</th>
                    <th className="pb-4 px-2 font-semibold uppercase tracking-wider hidden sm:table-cell">Veículo</th>
                    <th className="pb-4 px-2 font-semibold uppercase tracking-wider hidden md:table-cell">Data</th>
                    <th className="pb-4 px-2 font-semibold uppercase tracking-wider">Tipo / Status</th>
                    <th className="pb-4 px-2 font-semibold uppercase tracking-wider text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentActivity.map(row => {
                    const badge = row.type === 'rental' ? rentalBadge(row.status) : saleBadge(row.status);
                    return (
                      <tr key={`${row.type}-${row.id}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-2">
                          <p className="font-semibold text-slate-900 text-sm">{row.client_name}</p>
                          <p className="text-xs text-slate-400">#{row.id.slice(0, 8)}</p>
                        </td>
                        <td className="py-4 px-2 font-medium text-slate-700 text-sm hidden sm:table-cell">
                          {row.vehicle_model}
                          <span className="ml-1 text-xs text-slate-400 font-normal">{row.vehicle_plate}</span>
                        </td>
                        <td className="py-4 px-2 text-slate-500 text-sm hidden md:table-cell">
                          {format(new Date(row.created_at), 'dd/MM/yyyy')}
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex flex-col gap-1">
                            {/* Type pill */}
                            <div className="flex items-center gap-1">
                              {row.type === 'rental'
                                ? <FileText size={10} className="text-blue-400" />
                                : <ShoppingCart size={10} className="text-violet-400" />}
                              <span className={`text-[9px] font-black uppercase tracking-widest ${row.type === 'rental' ? 'text-blue-400' : 'text-violet-400'}`}>
                                {row.type === 'rental' ? 'Locação' : 'C/ Venda'}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase w-fit ${badge.cls}`}>{badge.text}</span>
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right font-bold text-slate-900 text-sm">
                          R$ {row.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* End of Left Column */}
        </div>

        {/* Top Clients - Right Column */}
        <div className="card h-fit sticky top-8">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Top Clientes</h3>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : topClients.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-400 font-medium text-sm">Nenhum dado ainda.</p>
              <p className="text-slate-300 text-xs mt-1">Os dados aparecem após os primeiros contratos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topClients.map((client, idx) => (
                <div
                  key={client.id}
                  className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100"
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-extrabold shrink-0 text-sm ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-100 text-slate-500' : 'bg-primary-50 text-primary-600'}`}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate text-sm">{client.name}</p>
                    <p className="text-xs text-slate-500">
                      {client.contractCount} contrato{client.contractCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-primary-600 font-extrabold text-sm">
                      R$ {client.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
