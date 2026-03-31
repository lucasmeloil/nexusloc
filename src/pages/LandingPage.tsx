import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
  Car, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Zap, 
  Users, 
  ArrowRight, 
  ArrowUp,
  Send,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Store,
  Clock,
  CheckCircle,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Vehicle } from '../types';

// ── Hero Slides Data ──────────────────────────────────────────────────────────
const HERO_SLIDES = [
  {
    image: '/moto1.jpg', // <-- Imagem 1 (A moto preta de fundo branco que você enviou)
    title: 'Mude agora, Vá de CG 160!',
    subtitle: 'Descubra a liberdade de ir muito além! O plano perfeito de assinatura de motos de Itabaiana e região.',
    cta: 'Ver Planos',
    href: '#planos',
  },
  {
    image: '/moto2.jpg', // <-- Imagem 2 (A moto azul na rua que você enviou)
    title: 'Honda Novinha Por R$ 330,00 Semanais.',
    subtitle: 'Com tudo pago: Seguro Total, IPVA, Manutenção Básica, Troca de Óleo e Guincho 24h inclusos!',
    cta: 'Quero Assinar',
    href: '#planos',
  },
  {
    image: '/moto1.jpg', // <-- Você pode colocar uma /moto3.png aqui futuramente se quiser
    title: 'Após 30 meses, A MOTO É SUA!',
    subtitle: 'O Aluguel com Intenção de Compra da CG 160 feito do seu jeito e sem burocracia.',
    cta: 'Reservar Minha Moto',
    href: 'https://wa.me/5579999641398?text=Ol%C3%A1%21%20Eu%20quero%20Assinar%20a%20CG%20160%21',
  },
];

// ── LandingPage Component ─────────────────────────────────────────────────────
const LandingPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // WhatsApp & Scroll state
  const [waFormOpen, setWaFormOpen] = useState(false);
  const [waData, setWaData] = useState({ name: '', interest: 'Locação Diária', message: '' });

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleWaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `Olá, me chamo *${waData.name}*.\nTenho interesse em: *${waData.interest}*.\n\n${waData.message}`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/5579999990000?text=${encoded}`, '_blank');
    setWaFormOpen(false);
  };

  // Fetch logo and vehicles
  useEffect(() => {
    // SEO tags
    document.title = "Itabaiana Loc - Aluguel e Venda de Veículos Premium em Sergipe";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', "As melhores opções em locação e venda de veículos em Itabaiana e região. Conheça nossa frota premium, revisada e pronta para sua viagem ou negócio.");
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "As melhores opções em locação e venda de veículos em Itabaiana e região. Conheça nossa frota premium, revisada e pronta para sua viagem ou negócio.";
      document.head.appendChild(meta);
    }

    // Scroll listener for navbar
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);

    // Fetch available vehicles
    const fetchVehicles = async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'available')
        .limit(8);
      if (!error && data) setVehicles(data);
      setLoading(false);
    };
    fetchVehicles();

    // Auto-advance hero slides
    const sliderInterval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 6000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(sliderInterval);
    };
  }, []);

  const nextSlide = () => setActiveSlide((activeSlide + 1) % HERO_SLIDES.length);
  const prevSlide = () => setActiveSlide((activeSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      
      {/* ── Desktop/Mobile Navbar ─────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 py-4 px-6 md:px-12 flex justify-between items-center ${isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 scale-100 mt-0' : 'bg-transparent mt-2'}`}>
        <div className="flex items-center gap-4">
           <img src="https://i.ibb.co/xtSXxqK8/itabaianaloc-Photoroom.png" alt="Itabaiana Loc" className="h-10 md:h-14 w-auto object-contain drop-shadow-sm" />
        </div>

        <div className="hidden md:flex items-center gap-10">
          {['Inicio', 'Frota', 'Quem Somos', 'Planos', 'Contato'].map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className={`text-sm font-black uppercase tracking-widest transition-colors hover:text-indigo-600 ${isScrolled ? 'text-slate-600' : 'text-white'}`}>
              {item}
            </a>
          ))}
          <Link to="/login" className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 transition-all">
            Painel Admin
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden flex items-center">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`p-3 rounded-2xl shadow-sm transition-all flex items-center justify-center ${isScrolled ? 'bg-indigo-50 text-indigo-600' : 'bg-white/20 backdrop-blur-md text-white'}`}>
             {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed top-24 left-4 right-4 bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl p-6 z-40 border border-slate-100 flex flex-col gap-4"
          >
            {['Inicio', 'Frota', 'Quem Somos', 'Planos', 'Contato'].map(item => (
              <a 
                onClick={() => setMobileMenuOpen(false)}
                key={item} 
                href={`#${item.toLowerCase().replace(' ', '-')}`} 
                className="text-lg font-black uppercase tracking-widest text-slate-700 hover:text-indigo-600 py-2 border-b border-slate-50 last:border-0"
              >
                {item}
              </a>
            ))}
            <Link onClick={() => setMobileMenuOpen(false)} to="/login" className="mt-4 py-4 bg-indigo-600 text-white flex items-center justify-center gap-2 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30">
              <Store size={20} />
              Painel Admin
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Slider ─────────────────────────────────────────────────────── */}
      <section id="inicio" className="relative h-screen min-h-[600px] w-full overflow-hidden bg-slate-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1] }}
            className="absolute inset-0"
          >
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-linear scale-110"
              style={{ backgroundImage: `url(${HERO_SLIDES[activeSlide].image})` }}
            />
            {/* Overlay Gradient for contrast */}
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90" />
            
            {/* Content */}
            <div className="relative h-full container mx-auto px-6 md:px-12 flex flex-col justify-center items-start pt-16">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="max-w-3xl w-full"
              >
                <span className="inline-block px-3 md:px-4 py-1.5 md:py-2 bg-white/10 backdrop-blur-md border border-white/20 text-indigo-300 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] mb-4 md:mb-6 shadow-2xl">
                  Itabaiana Loc · Aluguel & Vendas
                </span>
                <h1 className="text-4xl md:text-6xl lg:text-[4.5rem] font-black text-white leading-[1.1] md:leading-[1.05] tracking-tight mb-5 md:mb-6 max-w-2xl drop-shadow-2xl">
                  {HERO_SLIDES[activeSlide].title}
                </h1>
                <p className="text-base md:text-xl text-slate-200/90 font-medium mb-8 md:mb-10 max-w-xl leading-relaxed drop-shadow-lg">
                  {HERO_SLIDES[activeSlide].subtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-5 w-full sm:w-auto">
                  <a href={HERO_SLIDES[activeSlide].href || '#planos'} className="px-6 py-4 md:px-10 md:py-5 bg-white text-indigo-900 rounded-[30px] font-black uppercase text-[11px] md:text-xs tracking-widest shadow-2xl shadow-indigo-900/50 hover:bg-slate-100 active:scale-95 transition-all text-center flex items-center justify-center gap-2">
                    {HERO_SLIDES[activeSlide].cta}
                    <ArrowRight size={16} />
                  </a>
                  <a href="https://wa.me/5579999641398?text=Olá, estava no site e me interessei muito pela Assinatura da CG 160!" target="_blank" className="px-6 py-4 md:px-10 md:py-5 bg-indigo-600/90 backdrop-blur-md text-white rounded-[30px] font-black uppercase text-[11px] md:text-xs tracking-widest shadow-2xl shadow-indigo-900/50 hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Phone size={16} />
                    WhatsApp
                  </a>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Slider Controls */}
        <div className="hidden md:flex absolute right-6 md:right-12 bottom-24 md:bottom-32 gap-4 z-10">
          <button onClick={prevSlide} className="p-4 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full hover:bg-white hover:text-indigo-900 transition-all active:scale-90">
            <ChevronLeft size={24} />
          </button>
          <button onClick={nextSlide} className="p-4 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full hover:bg-white hover:text-indigo-900 transition-all active:scale-90">
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-10">
          <motion.div 
            key={activeSlide}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 6, ease: 'linear' }}
            className="h-full bg-indigo-500"
          />
        </div>
      </section>

      {/* ── Stats / Trust Section ────────────────────────────────────────────── */}
      <section className="relative -mt-20 z-20 px-6 md:px-12">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Zap, label: 'Rápido', text: 'Locação em minutos' },
            { icon: ShieldCheck, label: 'Seguro', text: 'Seguro total incluso' },
            { icon: Clock, label: 'Suporte', text: 'Atendimento 24/7' },
            { icon: CheckCircle, label: 'Qualidade', text: 'Frota higienizada' },
          ].map((item, i) => (
            <motion.div
              whileHover={{ y: -5 }}
              key={i}
              className="p-6 bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[32px] shadow-2xl shadow-slate-200/50 flex flex-col items-center text-center"
            >
              <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100 shadow-inner">
                <item.icon size={20} className="stroke-[2.5]" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
              <p className="text-sm font-bold text-slate-900 leading-tight">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Fleet Section ────────────────────────────────────────────────────── */}
      <section id="frota" className="py-24 px-6 md:px-12 overflow-hidden">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <span className="text-indigo-600 font-black uppercase tracking-[0.2em] text-[10px] bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 mb-4 inline-block">Nossa Frota</span>
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none mb-6">Disponíveis hoje</h2>
              <p className="text-slate-500 font-medium text-lg leading-relaxed">Selecione o veículo ideal para sua necessidade. Desde compactos para o dia a dia até utilitários para seu negócio.</p>
            </div>
            <a href="https://wa.me/557900000000" className="btn-secondary h-14 px-8 rounded-full flex items-center gap-3 active:scale-95 transition-all">
              Ver Catálogo Completo
              <ArrowRight size={18} />
            </a>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[420px] rounded-[40px] bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-20 px-6 bg-slate-50 rounded-[40px] border border-slate-100 max-w-2xl mx-auto shadow-sm">
               <Car size={64} className="mx-auto text-indigo-300 mb-6" />
               <p className="text-xl font-black text-slate-800 tracking-tight mb-2">Renovação de Frota</p>
               <p className="text-slate-500 font-medium">
                 No momento, todos os nossos veículos deste catálogo estão locados ou em preparação. Fale com um especialista para reservas futuras.
               </p>
               <a href="https://wa.me/557900000000" target="_blank" className="inline-flex mt-8 px-8 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase tracking-widest text-xs hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-600/30 focus:outline-none">
                 Falar com Especialista
               </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {vehicles.map((v) => (
                <motion.div
                  key={v.id}
                  whileHover={{ y: -10 }}
                  className="group bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden flex flex-col"
                >
                  {/* Photo */}
                  <div className="relative h-56 bg-slate-100 overflow-hidden">
                    {v.photos_urls && v.photos_urls.length > 0 ? (
                      <img src={v.photos_urls[0]} alt={v.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <Car size={64} strokeWidth={1} />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm">
                        {v.category}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="mb-6">
                       <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight mb-2 truncate">
                        {v.model}
                      </h3>
                      <div className="flex gap-4">
                        <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                          <Users size={12} /> 5 Lugares
                        </span>
                        <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> Automático
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">Diária</p>
                        <p className="text-2xl font-black text-indigo-600 tracking-tight leading-none">
                          <span className="text-xs mr-1">R$</span>
                          {Number(v.daily_rate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <a href={`https://wa.me/557900000000?text=Olá! Gostaria de reservar o ${v.model} (${v.plate})`} target="_blank" className="h-14 w-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-600 shadow-lg shadow-slate-900/10 active:scale-95 transition-all">
                        <ArrowRight size={20} />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Plans Section ────────────────────────────────────────────────────── */}
      <section id="planos" className="py-24 px-6 md:px-12 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-100 rounded-full blur-[100px] opacity-60 -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-60 -z-10 -translate-x-1/2 translate-y-1/2"></div>

        <div className="container mx-auto">
          {/* Header */}
          <div className="flex flex-col items-center text-center mx-auto max-w-3xl mb-16 md:mb-20">
            <span className="text-red-600 font-black uppercase tracking-[0.2em] text-[10px] bg-white px-4 py-1.5 rounded-full shadow-sm mb-4 inline-block">Assinatura de Motos</span>
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-6">Planos que vão<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-red-600">muito além!</span></h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-2xl px-4">Condições exclusivas para você trabalhar ou se deslocar sem preocupações. E o melhor: no final do plano, a moto é sua.</p>
          </div>

          <div className="max-w-5xl mx-auto rounded-[32px] md:rounded-[48px] shadow-2xl shadow-blue-900/10 overflow-hidden flex flex-col md:flex-row group">
            {/* Left side: Pricing and features (Blue theme) */}
            <div className="w-full md:w-1/2 p-8 md:p-14 bg-gradient-to-br from-[#0c1e80] to-[#1224a1] text-white relative flex flex-col justify-center">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

               <div className="relative z-10 w-full max-w-sm mx-auto md:mx-0">
                 <h3 className="text-4xl md:text-[3.25rem] font-black uppercase tracking-tighter leading-[0.8] mb-6 text-red-500 drop-shadow-md">
                   Aluguel<br />de Motos
                 </h3>
                 <div className="bg-white text-[#0c1e80] rounded-full py-4 px-6 md:px-8 inline-flex items-end gap-1 mb-8 shadow-2xl shadow-black/20 border-2 border-white/20 transform -rotate-2 hover:rotate-0 transition-all cursor-default relative z-20">
                    <p className="text-5xl md:text-[3.5rem] leading-none font-black tracking-tighter">
                      <span className="text-xl md:text-2xl font-bold align-top mt-1 inline-block">R$</span>330
                      <span className="text-xl md:text-2xl font-black">,00</span>
                    </p>
                    <span className="text-sm md:text-base font-black tracking-widest text-[#0c1e80]/80 uppercase ml-1 pb-1">Semanais</span>
                 </div>

                 <div className="mb-6 inline-flex bg-white/10 backdrop-blur-md rounded-full border border-white/20 py-1.5 px-4 shadow-inner">
                   <span className="font-black uppercase tracking-widest text-xs text-white/90">Incluso no plano:</span>
                 </div>

                 <ul className="space-y-3.5 mb-10 ml-2">
                   {[
                     'Seguro Total',
                     'IPVA Pago',
                     'Manutenção Básica',
                     'Troca de Óleo',
                     'Guinchos 24 Hrs'
                   ].map((item, index) => (
                     <li key={index} className="flex items-center gap-3 text-lg md:text-xl font-black uppercase tracking-tight text-white/95">
                       <CheckCircle size={22} className="text-white shrink-0 fill-red-500" />
                       <span className="drop-shadow-sm">{item}</span>
                     </li>
                   ))}
                 </ul>
               </div>
            </div>

            {/* Right side: Image and CTA (Red theme) */}
            <div className="w-full md:w-1/2 bg-red-600 p-8 md:p-14 flex flex-col items-center justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-red-700 to-red-600 pointer-events-none"></div>
              
              {/* Giant abstract shapes */}
              <div className="absolute bottom-0 right-0 w-full h-[60%] bg-white/5 skew-y-12 translate-y-20 origin-bottom-right pointer-events-none"></div>

              <div className="text-center z-10 relative mt-4 md:mt-0">
                 <h3 className="text-5xl md:text-[4.5rem] font-black uppercase text-white tracking-tighter leading-[0.85] drop-shadow-xl">
                   Você pode<br />ir muito<br />além!
                 </h3>
              </div>
              
              <div className="relative w-full h-[320px] md:h-[400px] mt-8 mb-8 z-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-red-500 rounded-full blur-[80px] opacity-50"></div>
                {/* Imagem de moto premium substituta, se a original não estiver hospedada */}
                <img 
                  src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800"
                  alt="Moto Honda"
                  className="w-full h-full object-contain filter drop-shadow-2xl relative z-10 group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              </div>

              <div className="w-full z-10 relative">
                <div className="bg-[#0c1e80] text-red-500 uppercase font-black text-center py-5 px-6 rounded-2xl tracking-tighter shadow-2xl text-[1.2rem] md:text-2xl mb-8 border-b-4 border-black/20 group-hover:-translate-y-1 transition-transform">
                  Após <span className="text-white text-3xl">30 meses</span><br className="sm:hidden"/> a moto é <span className="text-white">sua!</span>
                </div>

                <a href={`https://wa.me/5579999641398?text=${encodeURIComponent("Olá! Vim pelo site e gostaria de saber mais sobre a Assinatura de Motos (R$330 semanais) com a moto sendo minha após 30 meses!")}`} target="_blank" rel="noreferrer" className="w-full h-16 bg-white text-red-700 rounded-full font-black uppercase tracking-widest text-sm shadow-xl hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3">
                  <Phone size={18} className="fill-red-700" />
                  Alugar Minha Moto
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who We Are / Purpose Section ──────────────────────────────────────── */}

      <section id="quem-somos" className="py-24 px-6 md:px-12 bg-white rounded-[80px] my-12 mx-4 shadow-inner">
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <div className="aspect-[4/5] rounded-[60px] overflow-hidden shadow-2xl relative z-10 shadow-slate-300/50">
               <img src="https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=1200" alt="Nosso Time" className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/60 to-transparent flex items-end p-12">
                 <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-[40px] p-8 text-white">
                   <p className="text-3xl font-black mb-2 tracking-tighter">+10 Anos</p>
                   <p className="text-xs font-black uppercase tracking-widest opacity-80">De história em Itabaiana</p>
                 </div>
               </div>
            </div>
            {/* Background Blob Decor */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-100 rounded-full blur-[80px]" />
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-amber-100 rounded-full blur-[100px]" />
          </div>

          <div className="flex flex-col">
            <span className="text-indigo-600 font-black uppercase tracking-[0.2em] text-[10px] mb-4">Quem Somos</span>
            <h2 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none mb-8">Tradição em Locação e Venda.</h2>
            <p className="text-lg text-slate-500 font-medium leading-relaxed mb-10">
              A Itabaiana Loc nasceu para transformar o mercado de mobilidade no Sergipe. 
              Somos mais que uma locadora, somos seus parceiros em viagens de lazer, negócios e até na realização do sonho do carro próprio através do nosso modelo exclusivo de aluguel por intenção de venda.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
              <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 transition-all hover:bg-indigo-50 hover:border-indigo-100">
                <div className="h-12 w-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <Store size={24} />
                </div>
                <h4 className="font-black text-slate-900 mb-3 uppercase tracking-widest text-sm">Nosso Propósito</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">Descomplicar a vida das pessoas através de soluções de mobilidade flexíveis.</p>
              </div>
              <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 transition-all hover:bg-amber-50 hover:border-amber-100">
                <div className="h-12 w-12 bg-white text-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <h4 className="font-black text-slate-900 mb-3 uppercase tracking-widest text-sm">Nossos Valores</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">Transparência, segurança e foco absoluto no sucesso do cliente.</p>
              </div>
            </div>

            <a href="#contato" className="btn-primary h-16 rounded-[30px] flex items-center justify-center gap-3 active:scale-95 transition-all text-sm font-black w-full sm:w-auto px-12">
              Conhecer Nossa História
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* ── Call to Action ─────────────────────────────────────────────────── */}
      <section className="py-32 px-6 md:px-12">
        <div className="container mx-auto rounded-[60px] bg-slate-900 overflow-hidden relative shadow-2xl">
          <div className="absolute inset-0 grayscale opacity-20 hover:opacity-30 transition-opacity">
            <img src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=100&w=1920" alt="Action" className="w-full h-full object-cover" />
          </div>
          <div className="relative z-10 py-20 px-8 text-center flex flex-col items-center">
            <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-tight max-w-3xl mb-8">
              Pronto para colocar as mãos no volante?
            </h2>
            <p className="text-slate-400 text-lg font-medium mb-12 max-w-xl">
              Fale agora com um de nossos especialistas e saiba como podemos ajudar você hoje.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
               <a href="https://wa.me/557900000000" className="px-12 py-5 bg-indigo-600 text-white rounded-[30px] font-black uppercase text-sm tracking-widest shadow-2xl shadow-indigo-600/50 hover:bg-indigo-700 active:scale-95 transition-all">
                 Iniciar Atendimento
               </a>
               <a href="#frota" className="px-12 py-5 bg-white text-slate-900 rounded-[30px] font-black uppercase text-sm tracking-widest hover:bg-slate-100 active:scale-95 transition-all">
                 Ver Frota
               </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer id="contato" className="bg-white/80 backdrop-blur-xl border-t border-slate-200 py-32 text-slate-800 px-6 md:px-12 relative z-20">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-1 md:col-span-1">
             <div className="text-3xl font-black tracking-tighter mb-8 text-indigo-900">
                <img src="https://i.ibb.co/xtSXxqK8/itabaianaloc-Photoroom.png" alt="Itabaiana Loc" className="h-14 w-auto object-contain drop-shadow-sm mb-4" />
             </div>
             <p className="text-slate-500 font-medium leading-relaxed mb-10">Líder em locação e venda de veículos na região. Inovação e confiança ao seu alcance.</p>
             <div className="flex gap-4">
                <a href="#" className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all border border-slate-100 shadow-sm">
                  <MessageCircle size={20} />
                </a>
                <a href="#" className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all border border-slate-100 shadow-sm">
                  <Share2 size={20} />
                </a>
             </div>
          </div>

          <div>
             <h4 className="font-black uppercase tracking-widest text-xs mb-8 text-slate-900">Navegação</h4>
             <ul className="space-y-4 font-bold text-slate-500">
                <li><a href="#inicio" className="hover:text-indigo-600 transition-colors">Início</a></li>
                <li><a href="#frota" className="hover:text-indigo-600 transition-colors">Frota</a></li>
                <li><a href="#quem-somos" className="hover:text-indigo-600 transition-colors">Quem Somos</a></li>
                <li><a href="#contato" className="hover:text-indigo-600 transition-colors">Contato</a></li>
             </ul>
          </div>

          <div>
             <h4 className="font-black uppercase tracking-widest text-xs mb-8 text-slate-900">Legal</h4>
             <ul className="space-y-4 font-bold text-slate-500">
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Contratos</a></li>
             </ul>
          </div>

          <div>
             <h4 className="font-black uppercase tracking-widest text-xs mb-8 text-slate-900">Localização</h4>
             <p className="text-slate-500 font-medium mb-6 flex gap-3">
                <MapPin size={24} className="text-indigo-500 shrink-0" />
                <div>
                   Av. Principal, 123 - Centro<br />Itabaiana, SE - CEP: 00000-000
                </div>
             </p>
             <p className="text-slate-500 font-medium flex gap-3 items-center">
                <Phone size={18} className="text-indigo-500" />
                (79) 99999-0000
             </p>
          </div>
        </div>
        
        <div className="container mx-auto pt-20 mt-20 border-t border-slate-200 text-center text-slate-400">
          <p className="text-xs font-black uppercase tracking-[0.2em]">&copy; {new Date().getFullYear()} Itabaiana Loc. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* ── Fixed Action Buttons ────────────────────────────────────────────── */}
      
      {/* Scroll to Top (Left) */}
      <div className="fixed bottom-6 left-6 z-50">
        <AnimatePresence>
          {isScrolled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
            >
              <button 
                onClick={scrollToTop} 
                className="h-12 w-12 bg-white text-slate-800 rounded-full flex items-center justify-center shadow-xl shadow-slate-200/50 border border-slate-100 hover:bg-slate-50 transition-all active:scale-95 animate-[pulse_3s_ease-in-out_infinite]"
                title="Voltar ao topo"
              >
                <ArrowUp size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* WhatsApp Button & Form (Right) */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-4 z-50">
        <div className="relative">
          <AnimatePresence>
            {waFormOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="absolute bottom-20 right-0 w-[calc(100vw-3rem)] max-w-[380px] bg-white rounded-3xl shadow-2xl shadow-emerald-900/20 border border-slate-100 p-5 sm:p-6 z-50 overflow-hidden origin-bottom-right"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
                <div className="flex justify-between items-center mb-5 sm:mb-6 mt-1">
                   <h3 className="font-black text-slate-900 flex items-center gap-2 text-base sm:text-lg leading-none">
                     <MessageCircle className="text-emerald-500 shrink-0" size={20} />
                     Atendimento Fácil
                   </h3>
                   <button onClick={() => setWaFormOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded-full outline-none shrink-0">
                     <X size={16} />
                   </button>
                </div>
                <form onSubmit={handleWaSubmit} className="space-y-3 sm:space-y-4">
                   <div>
                     <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Seu Nome</label>
                     <input 
                        type="text" 
                        required 
                        value={waData.name}
                        onChange={e => setWaData({...waData, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium" 
                        placeholder="Ex: Carlos Silva"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Interesse</label>
                     <select 
                        value={waData.interest}
                        onChange={e => setWaData({...waData, interest: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium appearance-none"
                     >
                        <option value="Locação Diária">Locação Diária</option>
                        <option value="Locação Mensal">Locação Mensal (App)</option>
                        <option value="Assinatura / Compra">Aluguel p/ Compra</option>
                        <option value="Dúvida Geral">Dúvida Geral</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Mensagem (Opcional)</label>
                     <textarea 
                        rows={2}
                        value={waData.message}
                        onChange={e => setWaData({...waData, message: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium resize-none" 
                        placeholder="Quero saber mais sobre..."
                     />
                   </div>
                   <button type="submit" className="w-full py-4 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all active:scale-95">
                     Enviar <Send size={16} />
                   </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setWaFormOpen(!waFormOpen)}
            className="h-16 w-16 bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all animate-[pulse_2s_ease-in-out_infinite]"
          >
            {waFormOpen ? <X size={28} /> : <MessageCircle size={28} className="animate-bounce" />}
          </button>
        </div>

      </div>

    </div>
  );
};

export default LandingPage;
