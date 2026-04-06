import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Outlet, Navigate, useLocation, NavLink, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import logoAsset from '../assets/logo.png';
import {
  Settings,
  Bell,
  User,
  Menu,
  X,
  Users,
  Car,
  FileText,
  DollarSign,
  BarChart3,
  LayoutDashboard,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  ShoppingCart,
  CreditCard,
  UserPlus,
  Clock,
  LogOut,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type NotifType = 'contract_ending' | 'contract_new' | 'maintenance' | 'client_new' | 'payment' | 'sale_new' | 'installment_overdue' | 'installment_paid';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Car, label: 'Veículos', path: '/veiculos' },
  { icon: FileText, label: 'Contratos', path: '/contratos' },
  { icon: DollarSign, label: 'Faturamento', path: '/faturamento' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const notifIcon = (type: NotifType): React.ElementType => {
  const map: Record<NotifType, React.ElementType> = {
    contract_ending:    AlertTriangle,
    contract_new:       FileText,
    maintenance:        Wrench,
    client_new:         UserPlus,
    payment:            CheckCircle2,
    sale_new:           ShoppingCart,
    installment_overdue: CreditCard,
    installment_paid:   CheckCircle2,
  };
  return map[type] ?? Bell;
};

const notifColor = (type: NotifType): string => {
  const map: Record<NotifType, string> = {
    contract_ending:    'bg-amber-100 text-amber-600',
    contract_new:       'bg-blue-100 text-blue-600',
    maintenance:        'bg-orange-100 text-orange-600',
    client_new:         'bg-emerald-100 text-emerald-600',
    payment:            'bg-emerald-100 text-emerald-600',
    sale_new:           'bg-violet-100 text-violet-600',
    installment_overdue:'bg-red-100 text-red-600',
    installment_paid:   'bg-emerald-100 text-emerald-600',
  };
  return map[type] ?? 'bg-slate-100 text-slate-400';
};

const relativeTime = (date: Date): string => {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m atrás`;
  if (h < 24) return `${h}h atrás`;
  if (d < 7) return `${d}d atrás`;
  return date.toLocaleDateString('pt-BR');
};

// IDs lidos persistidos no localStorage
const READ_KEY = 'itabaianaloc_read_notif_ids';
const getStoredRead = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')); }
  catch { return new Set(); }
};
const saveRead = (ids: Set<string>) => {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
};

// ── Component ─────────────────────────────────────────────────────────────────
const Layout: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [logo, setLogo] = useState(logoAsset);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const readIds = useRef<Set<string>>(getStoredRead());

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ── Fetch real notifications from Supabase ──────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoadingNotifs(true);
    const notifs: Notification[] = [];
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const isoSevenAgo = sevenDaysAgo.toISOString();

    try {
      // 1. Contratos de locação vencendo em até 3 dias (ativos)
      const { data: endingContracts } = await supabase
        .from('contracts')
        .select('id, end_date, client:clients(name), vehicle:vehicles(model, plate)')
        .eq('status', 'active')
        .lte('end_date', threeDaysFromNow.toISOString().split('T')[0])
        .gte('end_date', now.toISOString().split('T')[0])
        .order('end_date', { ascending: true })
        .limit(5);

      (endingContracts ?? []).forEach((c: any) => {
        const diffDays = Math.ceil((new Date(c.end_date).getTime() - now.getTime()) / 86400000);
        notifs.push({
          id: `end_${c.id}`,
          type: 'contract_ending',
          title: 'Contrato Vencendo',
          message: `Locação de ${c.client?.name ?? 'cliente'} (${c.vehicle?.model ?? 'veículo'} · ${c.vehicle?.plate ?? ''}) vence ${diffDays <= 0 ? 'hoje' : `em ${diffDays} dia${diffDays > 1 ? 's' : ''}`}.`,
          timestamp: new Date(c.end_date),
          read: readIds.current.has(`end_${c.id}`),
        });
      });

      // 2. Novos contratos de locação (últimos 7 dias)
      const { data: newContracts } = await supabase
        .from('contracts')
        .select('id, created_at, client:clients(name), vehicle:vehicles(model, plate)')
        .gte('created_at', isoSevenAgo)
        .order('created_at', { ascending: false })
        .limit(5);

      (newContracts ?? []).forEach((c: any) => {
        notifs.push({
          id: `new_${c.id}`,
          type: 'contract_new',
          title: 'Nova Locação',
          message: `${c.client?.name ?? 'Cliente'} locou ${c.vehicle?.model ?? 'veículo'} (${c.vehicle?.plate ?? ''}).`,
          timestamp: new Date(c.created_at),
          read: readIds.current.has(`new_${c.id}`),
        });
      });

      // 3. Novos clientes (últimos 7 dias)
      const { data: newClients } = await supabase
        .from('clients')
        .select('id, created_at, name')
        .gte('created_at', isoSevenAgo)
        .order('created_at', { ascending: false })
        .limit(5);

      (newClients ?? []).forEach((c: any) => {
        notifs.push({
          id: `cli_${c.id}`,
          type: 'client_new',
          title: 'Novo Cliente',
          message: `${c.name} foi cadastrado no sistema.`,
          timestamp: new Date(c.created_at),
          read: readIds.current.has(`cli_${c.id}`),
        });
      });

      // 4. Veículos em manutenção
      const { data: inMaint } = await supabase
        .from('vehicles')
        .select('id, updated_at, model, plate')
        .eq('status', 'maintenance')
        .limit(5);

      (inMaint ?? []).forEach((v: any) => {
        notifs.push({
          id: `maint_${v.id}`,
          type: 'maintenance',
          title: 'Veículo em Manutenção',
          message: `${v.model} (${v.plate}) está em manutenção.`,
          timestamp: new Date(v.updated_at ?? now),
          read: readIds.current.has(`maint_${v.id}`),
        });
      });

      // 5. Novos contratos de venda (últimos 7 dias)
      const { data: newSales } = await supabase
        .from('sale_contracts')
        .select('id, created_at, client:clients(name), vehicle:vehicles(model, plate), sale_price, installments, installment_value')
        .gte('created_at', isoSevenAgo)
        .order('created_at', { ascending: false })
        .limit(5);

      (newSales ?? []).forEach((s: any) => {
        const fmtPrice = Number(s.sale_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        notifs.push({
          id: `sale_${s.id}`,
          type: 'sale_new',
          title: 'Contrato de Venda Gerado',
          message: `${s.client?.name ?? 'Cliente'} — ${s.vehicle?.model ?? 'veículo'} por ${fmtPrice} em ${s.installments}x.`,
          timestamp: new Date(s.created_at),
          read: readIds.current.has(`sale_${s.id}`),
        });
      });

      // 6. Parcelas de venda pagas (últimos 7 dias)
      const { data: paidInsts } = await supabase
        .from('sale_installments')
        .select('id, paid_at, paid_amount, installment_number, sale_contract:sale_contracts(client:clients(name), vehicle:vehicles(model))')
        .eq('status', 'paid')
        .gte('paid_at', isoSevenAgo)
        .order('paid_at', { ascending: false })
        .limit(5);

      (paidInsts ?? []).forEach((i: any) => {
        const amt = Number(i.paid_amount ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const client = i.sale_contract?.client?.name ?? 'Cliente';
        const vehicle = i.sale_contract?.vehicle?.model ?? 'veículo';
        notifs.push({
          id: `ipaid_${i.id}`,
          type: 'installment_paid',
          title: 'Parcela Recebida',
          message: `Parcela ${i.installment_number} de ${client} (${vehicle}): ${amt} pago.`,
          timestamp: new Date(i.paid_at),
          read: readIds.current.has(`ipaid_${i.id}`),
        });
      });

      // 7. Parcelas de venda em atraso
      const { data: overdueInsts } = await supabase
        .from('sale_installments')
        .select('id, due_date, amount, installment_number, sale_contract:sale_contracts(client:clients(name), vehicle:vehicles(model))')
        .eq('status', 'overdue')
        .order('due_date', { ascending: true })
        .limit(5);

      (overdueInsts ?? []).forEach((i: any) => {
        const amt = Number(i.amount ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const client = i.sale_contract?.client?.name ?? 'Cliente';
        const dueDate = new Date(i.due_date + 'T12:00:00').toLocaleDateString('pt-BR');
        notifs.push({
          id: `iover_${i.id}`,
          type: 'installment_overdue',
          title: 'Parcela em Atraso',
          message: `Parcela ${i.installment_number} de ${client} (${amt}) venceu em ${dueDate}.`,
          timestamp: new Date(i.due_date + 'T12:00:00'),
          read: readIds.current.has(`iover_${i.id}`),
        });
      });

    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    }

    // Sort: unread first, then by recency desc
    notifs.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    setNotifications(notifs);
    setLoadingNotifs(false);
  }, [user]);

  // ── Read management ─────────────────────────────────────────────────────
  const markAsRead = (id: string) => {
    if (readIds.current.has(id)) return;
    readIds.current.add(id);
    saveRead(readIds.current);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    notifications.forEach(n => readIds.current.add(n.id));
    saveRead(readIds.current);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Realtime subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Subscribe to all relevant tables for real-time updates
    const tables = ['contracts', 'clients', 'vehicles', 'sale_contracts', 'sale_installments'];
    const channels = tables.map(table =>
      supabase
        .channel(`notif_${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          // Debounce: wait 800ms before refetching to batch rapid changes
          setTimeout(() => fetchNotifications(), 800);
        })
        .subscribe()
    );

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [user, fetchNotifications]);

  // ── Logo & misc ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase.from('settings').select('logo_url').single().then(({ data }) => {
      if (data?.logo_url) setLogo(data.logo_url);
    });
  }, [user]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Refresh notifications when dropdown opens
  useEffect(() => {
    if (isNotificationsOpen) fetchNotifications();
  }, [isNotificationsOpen, fetchNotifications]);

  // ── Auth guards ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  if (!user && location.pathname !== '/login') return <Navigate to="/login" replace />;
  if (!user) return <Outlet />;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar isCollapsed={isSidebarCollapsed} logoUrl={logo} />

      <div className="flex-1 flex flex-col min-h-screen relative w-full">
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            {/* Desktop Sidebar Toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all"
              title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            >
              <Menu size={20} />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Mobile Logo */}
            <div className="md:hidden flex-1 flex justify-center items-center overflow-hidden h-10">
              <img src={logo} alt="Itabaiana Loc" className="h-full w-auto object-contain drop-shadow-sm" />
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {/* ── Notification Bell ────────────────────────────────────── */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`p-2 rounded-xl transition-all relative ${isNotificationsOpen ? 'bg-primary-50 text-primary-600' : 'text-slate-500 hover:text-primary-600 hover:bg-slate-50'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[8px] font-black text-white items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </span>
                )}
              </button>

              {/* ── Notifications Dropdown ──────────────────────────────── */}
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-3 w-80 sm:w-[400px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">

                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 tracking-tight">Notificações</h4>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 transition-colors"
                      >
                        Marcar todas como lidas
                      </button>
                    </div>

                    {/* List */}
                    <div className="max-h-[440px] overflow-y-auto custom-scrollbar">
                      {loadingNotifs ? (
                        <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
                          <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
                          <span className="text-sm font-semibold">Carregando...</span>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="py-14 flex flex-col items-center gap-3 text-slate-400">
                          <Bell size={32} className="opacity-30" />
                          <p className="font-bold text-sm">Nenhuma movimentação recente</p>
                          <p className="text-xs text-slate-300 text-center px-6">As notificações aparecerão aqui quando houver atividade no sistema.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {notifications.map(n => {
                            const Icon = notifIcon(n.type);
                            const colorCls = notifColor(n.type);
                            return (
                              <div
                                key={n.id}
                                onClick={() => markAsRead(n.id)}
                                className={`p-4 hover:bg-slate-50 transition-all cursor-pointer flex gap-3.5 ${!n.read ? 'bg-primary-50/30' : ''}`}
                              >
                                {/* Icon */}
                                <div className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${!n.read ? colorCls : 'bg-slate-100 text-slate-400'}`}>
                                  <Icon size={16} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start gap-2 mb-0.5">
                                    <p className={`text-sm font-bold truncate ${!n.read ? 'text-slate-900' : 'text-slate-500'}`}>{n.title}</p>
                                    <span className="text-[10px] font-medium text-slate-400 shrink-0 flex items-center gap-1">
                                      <Clock size={9} />
                                      {relativeTime(n.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 leading-relaxed">{n.message}</p>
                                  {!n.read && (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      <div className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                                      <span className="text-[10px] font-black uppercase tracking-widest text-primary-500">Nova</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-slate-100 bg-slate-50/30 text-center">
                      <button
                        onClick={() => { fetchNotifications(); }}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary-600 transition-all"
                      >
                        Atualizar Notificações
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

            {/* User Profile */}
            <Link
              to="/configuracoes"
              className="flex items-center gap-3 hover:bg-slate-50 p-2 -mr-2 rounded-xl transition-all cursor-pointer group"
              title="Configurações"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">{user.email?.split('@')[0]}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Administrador</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold border-2 border-primary-100 group-hover:border-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-all shadow-sm">
                <User size={18} />
              </div>
            </Link>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        <div className={`md:hidden fixed top-16 left-0 w-full bg-white border-b border-slate-200 shadow-2xl overflow-hidden transition-all duration-300 z-20 ${isMobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <nav className="flex flex-col p-4 space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${isActive
                    ? 'bg-primary-50 text-primary-600 border border-primary-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLogout();
              }}
              className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-red-500 hover:bg-red-50 border border-transparent"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span>Sair do Sistema</span>
            </button>
          </nav>
        </div>

        <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">
          <Outlet />
        </main>

        <footer className="p-4 sm:p-8 bg-white border-t border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 opacity-70 hover:opacity-100 transition-all duration-300">
              <img src={logo} alt="Itabaiana Loc" className="h-10 w-auto object-contain" />
              <div className="h-4 w-px bg-slate-300"></div>
              <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">Itabaiana Loc v1.0.0</p>
            </div>
            <a 
              href="#" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-primary-600 transition-colors group"
            >
              Desenvolvimento <span className="font-bold underline decoration-primary-200 underline-offset-4">Soft Tech</span>
            </a>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center sm:text-left">
              &copy; 2026 Todos os direitos reservados
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
