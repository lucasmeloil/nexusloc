import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
  Car, 
  ArrowLeft, 
  Users, 
  Zap, 
  ArrowRight, 
  Search,
  MessageCircle,
  Share2,
  Bike
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Vehicle } from '../types';

import Navbar from '../components/Navbar';

const Catalog: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'carro' | 'moto'>('all');

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('model', { ascending: true });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesFilter = filter === 'all' || (v.category && v.category.toLowerCase() === filter);
    return matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <Navbar />
      
      {/* Background Orbs */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-100 rounded-full blur-[120px] -z-10 -translate-x-1/2 -translate-y-1/2 opacity-60"></div>
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-blue-100 rounded-full blur-[150px] -z-10 translate-x-1/2 translate-y-1/2 opacity-60"></div>

      <main className="container mx-auto pt-40 md:pt-48 pb-24 px-4 md:px-6">
        {/* Intro Section */}
        <div className="mb-12 md:mb-20 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Link to="/" className="group flex items-center gap-3 text-slate-400 hover:text-indigo-600 transition-all font-black uppercase tracking-[0.2em] text-[10px]">
                <div className="h-10 w-10 rounded-full bg-white border border-slate-100 flex items-center justify-center group-hover:border-indigo-200 group-hover:bg-indigo-50 shadow-sm transition-all group-active:scale-90">
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                </div>
                Voltar ao Site
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <span className="text-indigo-600 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] bg-indigo-50/50 px-4 py-2 rounded-full border border-indigo-100/50 backdrop-blur-sm inline-block">
                Frota Exclusiva Itabaiana Loc
              </span>
            </motion.div>
          </div>
          
          <h1 className="text-4xl md:text-8xl font-display font-black text-slate-900 tracking-tighter leading-[1.1] md:leading-[0.85] mb-8">
            Nossa Frota<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-blue-600 to-indigo-900">Premium.</span>
          </h1>
          
          {/* Filters - Optimized for Mobile */}
          <div className="flex flex-row overflow-x-auto md:flex-wrap gap-3 pb-4 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {[
              { id: 'all', label: 'Todos', icon: Car },
              { id: 'moto', label: 'Motos', icon: Bike },
              { id: 'carro', label: 'Carros', icon: Car },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id as any)}
                className={`h-11 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest flex items-center gap-3 transition-all flex-shrink-0 cursor-pointer ${
                  filter === btn.id 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' 
                  : 'bg-white text-slate-400 border border-slate-100 shadow-sm hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                <btn.icon size={14} className="md:w-4 md:h-4" />
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Grid - Responsive Card Layout */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-[400px] md:h-[480px] rounded-[32px] md:rounded-[48px] bg-white/50 border border-white animate-pulse shadow-sm" />
            ))}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-20 md:py-32 bg-white/40 backdrop-blur-md rounded-[40px] md:rounded-[60px] border border-white shadow-xl shadow-slate-200/20">
             <div className="h-20 w-20 md:h-24 md:w-24 bg-indigo-50 text-indigo-400 rounded-[28px] md:rounded-[32px] flex items-center justify-center mx-auto mb-8">
               <Search className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
             </div>
             <h3 className="text-2xl md:text-3xl font-display font-black text-slate-900 mb-4 tracking-tight px-6">Nenhum veículo encontrado</h3>
             <p className="text-slate-500 font-medium text-base md:text-lg leading-relaxed max-w-sm md:max-w-lg mx-auto px-6">
               Não encontramos resultados para sua busca. Tente termos diferentes ou mude os filtros.
             </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {filteredVehicles.map((v) => (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -8 }}
                className="bg-white rounded-[40px] p-3 md:p-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.03)] border border-slate-50 group transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(79,70,229,0.12)] flex flex-col h-full"
              >
                {/* Photo Container */}
                <div className="relative h-56 md:h-64 bg-slate-50 rounded-[30px] md:rounded-[40px] overflow-hidden mb-6">
                  {v.photos_urls && v.photos_urls.length > 0 ? (
                    <img src={v.photos_urls[0]} alt={v.model} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                      <Car className="w-16 h-16 md:w-[72px] md:h-[72px]" strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                    <span className="px-4 py-1.5 bg-white/90 backdrop-blur-xl rounded-full text-[8px] font-black uppercase tracking-widest text-indigo-600 shadow-sm border border-white">
                      {v.category}
                    </span>
                    <button className="h-9 w-9 bg-white/90 backdrop-blur-xl rounded-full flex items-center justify-center text-slate-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-all active:scale-90">
                       <Share2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Info Container */}
                <div className="px-4 pb-4 flex flex-col flex-grow">
                  <div className="mb-4">
                    <h3 className="text-2xl md:text-3xl font-display font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight leading-tight">
                      {v.model}
                    </h3>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Disponibilidade Imediata</p>
                  </div>

                  <div className="flex gap-4 md:gap-6 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center text-indigo-500">
                        <Users size={12} />
                      </div>
                      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">{v.category === 'carro' ? '5 Lugares' : 'Assento Duplo'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center text-indigo-500">
                        <Zap size={12} />
                      </div>
                      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">Câmbio Auto</span>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-500/70 block mb-0.5">Aluguel Semanal</span>
                      <p className="text-2xl md:text-3xl font-display font-black text-slate-900 tracking-tighter flex items-baseline">
                        <span className="text-[10px] md:text-xs font-black mr-1 opacity-40">R$</span>
                        {Number(v.daily_rate).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        <span className="text-[10px] md:text-xs text-slate-400 ml-1 font-medium italic">/dia</span>
                      </p>
                    </div>
                    <a 
                      href={`https://wa.me/557999641398?text=${encodeURIComponent(`Olá! Vi o ${v.model} no catálogo do site e gostaria de saber mais informações.`)}`} 
                      target="_blank" 
                      className="h-12 w-12 md:h-14 md:w-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-slate-900 shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                    >
                      <MessageCircle size={20} />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer minimal for catalog */}
      <footer className="py-12 px-6 border-t border-slate-100">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-8 opacity-50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">© 2024 Itabaiana Loc - Premium Fleet</p>
          <div className="flex gap-8">
            <a href="#" className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Termos</a>
            <a href="#" className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Catalog;
