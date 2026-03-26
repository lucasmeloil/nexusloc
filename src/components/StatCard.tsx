import React from 'react';
import type { LucideIcon } from 'lucide-react';


interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  description?: string;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  description,
  loading 
}) => {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="h-4 w-24 bg-slate-100 rounded" />
          <div className="h-10 w-10 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-8 w-32 bg-slate-100 rounded mb-2" />
        <div className="h-3 w-40 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-primary-500/5 transition-all group hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">{title}</h3>
        <div className={`${color} p-2.5 rounded-xl text-white shadow-lg shadow-current/10 group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={22} />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-3xl font-extrabold text-slate-900 tracking-tighter">{value}</span>
        {description && <p className="text-slate-400 text-xs mt-1.5 font-medium">{description}</p>}
      </div>
    </div>
  );
};
