import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Users, 
  Car, 
  FileText, 
  DollarSign, 
  BarChart3, 
  Settings, 
  LogOut,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

interface SidebarProps {
  isCollapsed: boolean;
  logoUrl?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, logoUrl = logo }) => {
  const { signOut } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Clientes', path: '/clientes' },
    { icon: Car, label: 'Veículos', path: '/veiculos' },
    { icon: FileText, label: 'Contratos', path: '/contratos' },
    { icon: DollarSign, label: 'Faturamento', path: '/faturamento' },
    { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
    { icon: Settings, label: 'Configurações', path: '/configuracoes' },
  ];

  return (
    <aside className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 flex-col h-screen sticky top-0 overflow-y-auto transition-all duration-300 ease-in-out shrink-0`}>
      <div className={`flex justify-center items-center border-b border-slate-100 transition-all ${isCollapsed ? 'p-3 h-20' : 'px-6 py-5 h-[100px]'}`}>
        <div className={`flex items-center justify-center overflow-hidden transition-all ${isCollapsed ? 'w-12 h-12' : 'w-full h-full'}`}>
          <img src={logoUrl} alt="Itabaiana Loc" className="w-full h-full object-contain drop-shadow-sm" />
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={isCollapsed ? item.label : undefined}
            className={({ isActive }) => 
              `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all font-medium ${
                isActive 
                  ? 'bg-primary-50 text-primary-600 shadow-sm border border-primary-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={signOut}
          title={isCollapsed ? "Sair" : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all font-medium border border-transparent`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
