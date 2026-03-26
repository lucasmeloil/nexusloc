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
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StatCard } from '../components/StatCard';
import { format } from 'date-fns';
import type { Contract, Client, Vehicle } from '../types';

interface ContractWithRelations extends Omit<Contract, 'vehicle'> {
  client: Client;
  vehicle: Pick<Vehicle, 'model' | 'plate'>;
}

interface TopClient {
  id: string;
  name: string;
  contractCount: number;
  totalSpent: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    availableVehicles: 0,
    rentedVehicles: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
  });
  const [recentContracts, setRecentContracts] = useState<ContractWithRelations[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      const [vehiclesRes, contractsRes] = await Promise.all([
        supabase.from('vehicles').select('status'),
        supabase
          .from('contracts')
          .select('*, client:clients(*), vehicle:vehicles(model, plate)')
          .order('created_at', { ascending: false }),
      ]);

      // Stats - vehicles
      if (vehiclesRes.data) {
        setStats(prev => ({
          ...prev,
          availableVehicles: vehiclesRes.data.filter(v => v.status === 'available').length,
          rentedVehicles: vehiclesRes.data.filter(v => v.status === 'rented').length,
        }));
      }

      // Stats + recent + top clients from contracts
      if (contractsRes.data) {
        const allContracts = contractsRes.data as ContractWithRelations[];

        const revenue = allContracts
          .filter(c => c.status === 'active' || c.status === 'finished')
          .reduce((acc, c) => acc + (Number(c.deposit) || 0), 0);

        const pending = allContracts
          .filter(c => c.status === 'active')
          .reduce((acc, c) => acc + (Number(c.balance) || 0), 0);

        setStats(prev => ({ ...prev, monthlyRevenue: revenue, pendingPayments: pending }));

        // 5 most recent
        setRecentContracts(allContracts.slice(0, 5));

        // Top clients: aggregate by client_id
        const clientMap: Record<string, { name: string; count: number; total: number }> = {};
        for (const c of allContracts) {
          if (!c.client_id || !c.client) continue;
          if (!clientMap[c.client_id]) {
            clientMap[c.client_id] = { name: c.client.name, count: 0, total: 0 };
          }
          clientMap[c.client_id].count += 1;
          clientMap[c.client_id].total += Number(c.total_value) || 0;
        }

        const ranked: TopClient[] = Object.entries(clientMap)
          .map(([id, v]) => ({ id, name: v.name, contractCount: v.count, totalSpent: v.total }))
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5);

        setTopClients(ranked);
      }

      setLoading(false);
    };

    fetchAll();
  }, []);

  const statusLabel = (status: string) => {
    if (status === 'active') return { text: 'Ativo', cls: 'bg-emerald-100 text-emerald-700' };
    if (status === 'finished') return { text: 'Finalizado', cls: 'bg-slate-100 text-slate-500' };
    return { text: 'Cancelado', cls: 'bg-red-100 text-red-600' };
  };

  return (
    <div className="space-y-10 fade-in">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Veículos Disponíveis"
          value={stats.availableVehicles.toString()}
          icon={CircleCheck}
          color="bg-emerald-500"
          description="Frota pronta para locação"
          loading={loading}
        />
        <StatCard
          title="Veículos Alugados"
          value={stats.rentedVehicles.toString()}
          icon={Car}
          color="bg-blue-500"
          description="Contratos ativos no momento"
          loading={loading}
        />
        <StatCard
          title="Total Recebido"
          value={`R$ ${stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          color="bg-primary-500"
          description="Entradas já recebidas"
          loading={loading}
        />
        <StatCard
          title="Valores Pendentes"
          value={`R$ ${stats.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Clock}
          color="bg-amber-500"
          description="Saldos a receber"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Contracts */}
        <div className="lg:col-span-2 card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900">Locações Recentes</h3>
            <a href="/contratos" className="text-primary-600 font-bold text-sm hover:underline flex items-center gap-1">
              Ver todos <ChevronRight size={16} />
            </a>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : recentContracts.length === 0 ? (
            <div className="py-12 text-center">
              <FileText size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhum contrato registrado ainda.</p>
              <p className="text-slate-400 text-sm mt-1">Crie um contrato na página de Contratos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs border-b border-slate-100">
                    <th className="pb-4 px-2 font-semibold uppercase tracking-wider">Cliente</th>
                    <th className="pb-4 px-2 font-semibold uppercase tracking-wider hidden sm:table-cell">Veículo</th>
                    <th className="pb-4 px-2 font-semibold uppercase tracking-wider hidden md:table-cell">Data</th>
                    <th className="pb-4 px-2 font-semibold uppercase tracking-wider">Status</th>
                    <th className="pb-4 px-2 font-semibold uppercase tracking-wider text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentContracts.map(c => {
                    const s = statusLabel(c.status);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-2">
                          <p className="font-semibold text-slate-900 text-sm">{c.client?.name}</p>
                          <p className="text-xs text-slate-400">#{c.id.slice(0, 8)}</p>
                        </td>
                        <td className="py-4 px-2 font-medium text-slate-700 text-sm hidden sm:table-cell">
                          {c.vehicle?.model}
                          <span className="ml-1 text-xs text-slate-400 font-normal">{c.vehicle?.plate}</span>
                        </td>
                        <td className="py-4 px-2 text-slate-500 text-sm hidden md:table-cell">
                          {format(new Date(c.created_at), 'dd/MM/yyyy')}
                        </td>
                        <td className="py-4 px-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-tight ${s.cls}`}>{s.text}</span>
                        </td>
                        <td className="py-4 px-2 text-right font-bold text-slate-900 text-sm">
                          R$ {Number(c.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Clients */}
        <div className="card">
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
                      {client.contractCount} locaç{client.contractCount === 1 ? 'ão' : 'ões'}
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
