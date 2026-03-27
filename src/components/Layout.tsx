import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation, NavLink, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Settings, 
  Bell, 
  User, 
  Heart, 
  Menu, 
  X,
  Users, 
  Car, 
  FileText, 
  DollarSign, 
  BarChart3, 
  LayoutDashboard 
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Car, label: 'Veículos', path: '/veiculos' },
  { icon: FileText, label: 'Contratos', path: '/contratos' },
  { icon: DollarSign, label: 'Faturamento', path: '/faturamento' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

const Layout: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [logo, setLogo] = useState('/logo.png');
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Contrato Vencendo', message: 'O contrato de João Silva vence em 2 dias.', time: '5m atrás', read: false },
    { id: 2, title: 'Veículo em Manutenção', message: 'O VW Gol (ABC-1234) entrou em manutenção.', time: '2h atrás', read: false },
    { id: 3, title: 'Novo Cliente', message: 'Maria Oliveira completou o cadastro hoje.', time: '4h atrás', read: true },
    { id: 4, title: 'Pagamento Recebido', message: 'Recebido R$ 450,00 de Pedro Santos.', time: '1d atrás', read: true }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  useEffect(() => {
    if (user) {
      const fetchLogo = async () => {
        try {
          const { data, error } = await supabase
            .from('settings')
            .select('logo_url')
            .single();
          if (data && data.logo_url) {
            setLogo(data.logo_url);
          }
        } catch (error) {
          console.error("Erro ao puxar a logo:", error);
        }
      };
      fetchLogo();
    }
  }, [user]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (user && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  if (!user) {
    return <Outlet />;
  }

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
              title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
            >
              <Menu size={20} />
            </button>
            
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all"
              title="Menu Mobile"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            {/* Mobile Logo visibility logic */}
            <div className="md:hidden flex-1 flex justify-center items-center overflow-hidden h-8">
              <img src={logo} alt="Logo" className="h-full w-auto object-contain" />
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
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
                      {unreadCount}
                    </span>
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h4 className="font-black text-slate-900 tracking-tight">Notificações</h4>
                      <button 
                        onClick={markAllAsRead}
                        className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 transition-colors"
                      >
                        Marcar todas como lidas
                      </button>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                          {notifications.map((n) => (
                            <div 
                              key={n.id} 
                              onClick={() => markAsRead(n.id)}
                              className={`p-5 hover:bg-slate-50 transition-all cursor-pointer group flex gap-4 ${!n.read ? 'bg-primary-50/20' : ''}`}
                            >
                              <div className={`h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center ${!n.read ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Bell size={18} />
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between items-start gap-2">
                                  <p className={`text-sm font-bold ${!n.read ? 'text-slate-900' : 'text-slate-500'}`}>{n.title}</p>
                                  <span className="text-[10px] font-medium text-slate-400 shrink-0">{n.time}</span>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                                  {n.message}
                                </p>
                                {!n.read && (
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary-500">Nova</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 text-center text-slate-400 font-bold">
                          Nenhuma notificação por aqui.
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 border-t border-slate-50 bg-slate-50/30 text-center">
                      <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Ver Histórico Completo</button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            
            {/* Clickable User Profile */}
            <Link to="/configuracoes" className="flex items-center gap-3 hover:bg-slate-50 p-2 -mr-2 rounded-xl transition-all cursor-pointer group" title="Configurações">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">{user.email?.split('@')[0]}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Administrador</p>
              </div>
              <div className="h-10 w-10 sm:h-10 sm:w-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold border-2 border-primary-100 group-hover:border-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-all shadow-sm">
                <User size={18} />
              </div>
            </Link>
          </div>
        </header>

        {/* Mobile Dropdown Menu Drawer */}
        <div className={`md:hidden fixed top-16 left-0 w-full bg-white border-b border-slate-200 shadow-2xl overflow-hidden transition-all duration-300 z-20 ${isMobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <nav className="flex flex-col p-4 space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${
                    isActive 
                      ? 'bg-primary-50 text-primary-600 border border-primary-100' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">
          <Outlet />
        </main>

        <footer className="p-4 sm:p-8 bg-white border-t border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
              <img src={logo} alt="NexusLoc Logo" className="h-6 w-auto object-contain" />
              <div className="h-4 w-px bg-slate-300"></div>
              <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">NexusLoc v1.0.0</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              Desenvolvido <Heart size={14} className="text-red-400 fill-red-400" /> por Nexus Soft Tech
            </div>
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
