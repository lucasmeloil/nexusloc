import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation, NavLink } from 'react-router-dom';
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
  const [logo, setLogo] = useState('/logo.png');

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
            <button className="text-slate-500 hover:text-primary-600 transition-colors relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </button>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            
            {/* Clickable User Profile */}
            <a href="/settings" className="flex items-center gap-3 hover:bg-slate-50 p-2 -mr-2 rounded-xl transition-all cursor-pointer group" title="Editar Perfil da Locadora">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">{user.email?.split('@')[0]}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Administrador</p>
              </div>
              <div className="h-10 w-10 sm:h-10 sm:w-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold border-2 border-primary-100 group-hover:border-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-all shadow-sm">
                <User size={18} />
              </div>
            </a>
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
