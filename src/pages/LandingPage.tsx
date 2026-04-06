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
  Star,
  Sparkles,
  Bike,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Vehicle } from '../types';
import Navbar from '../components/Navbar';

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

  // WhatsApp & Scroll state
  const [waFormOpen, setWaFormOpen] = useState(false);
  const [waData, setWaData] = useState({ name: '', interest: 'Locação Diária', message: '' });

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleWaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `Olá, me chamo *${waData.name}*.\nTenho interesse em: *${waData.interest}*.\n\n${waData.message}`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/5579999641398?text=${encoded}`, '_blank');
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

    // Scroll listener for buttons
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
    <div className="bg-[#f8fafc] min-h-screen font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar />

      {/* ── Hero Slider ─────────────────────────────────────────────────────── */}
      <section id="inicio" className="relative h-screen min-h-[700px] w-full overflow-hidden bg-[#020617]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* Background Image with Zoom Effect */}
            <motion.div 
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 10, ease: "linear" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${HERO_SLIDES[activeSlide].image})` }}
            />
            
            {/* Elegant Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-80" />
            
            {/* Content Container */}
            <div className="relative h-full container mx-auto px-6 md:px-12 flex flex-col justify-center items-start pt-20 pb-28 md:pb-0">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-4xl w-full"
              >
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <div className="h-[2px] w-12 bg-indigo-500" />
                  <span className="text-white font-black uppercase tracking-[0.4em] text-[10px] sm:text-[10px] drop-shadow-sm leading-tight">
                    Premium Experience · Itabaiana Loc
                  </span>
                </div>

                <h1 className="text-[3.5rem] leading-[1] sm:text-7xl md:text-9xl lg:text-[8rem] font-display font-black text-white sm:leading-[0.9] tracking-tight mb-4 sm:mb-8 drop-shadow-2xl">
                  {HERO_SLIDES[activeSlide].title}
                </h1>

                <p className="text-lg sm:text-xl md:text-2xl text-slate-300/90 font-medium mb-8 sm:mb-12 max-w-[90%] sm:max-w-2xl leading-relaxed drop-shadow-md">
                  {HERO_SLIDES[activeSlide].subtitle}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-[90%] sm:w-auto relative z-20">
                  <a href={HERO_SLIDES[activeSlide].href || '#planos'} className="h-14 sm:h-16 px-6 sm:px-12 bg-white text-slate-900 rounded-xl sm:rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] hover:bg-slate-100 hover:-translate-y-1 active:scale-95 transition-all text-center flex items-center justify-center gap-3 group w-full sm:w-auto">
                    {HERO_SLIDES[activeSlide].cta}
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 sm:w-[18px] sm:h-[18px]" />
                  </a>
                  <a href={`https://wa.me/5579999641398?text=${encodeURIComponent("Olá! Estou no site e gostaria de falar sobre a assinatura da CG 160.")}`} target="_blank" className="h-14 sm:h-16 px-6 sm:px-12 bg-white/5 backdrop-blur-xl border border-white/20 text-white rounded-xl sm:rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 group w-full sm:w-auto">
                    <Phone size={16} className="transition-transform group-hover:rotate-12 sm:w-[18px] sm:h-[18px]" />
                    Atendimento VIP
                  </a>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Slider Navigation Bar */}
        <div className="absolute bottom-16 left-6 md:left-12 flex items-center gap-6 z-10 w-[calc(100%-3rem)] md:w-auto">
          <div className="flex gap-4">
             {HERO_SLIDES.map((_, i) => (
               <button 
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`h-1.5 transition-all duration-500 rounded-full ${activeSlide === i ? 'w-12 bg-indigo-500' : 'w-6 bg-white/20 hover:bg-white/40'}`}
               />
             ))}
          </div>
        </div>

        {/* Floating Scroll Badge */}
        <motion.div 
           animate={{ y: [0, 10, 0] }}
           transition={{ duration: 2, repeat: Infinity }}
           className="absolute bottom-12 right-12 hidden lg:flex flex-col items-center gap-2"
        >
          <div className="w-[1px] h-16 bg-gradient-to-b from-white to-transparent opacity-20" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 [writing-mode:vertical-lr]">Scroll Down</span>
        </motion.div>
      </section>

      <section className="relative -mt-20 z-20 px-6 md:px-12">
        <div className="container mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { icon: Zap, label: 'Performance', text: 'Frota atualizada' },
            { icon: ShieldCheck, label: 'Segurança', text: 'Proteção total 24h' },
            { icon: Users, label: 'Exclusivo', text: 'Assinatura Sob Medida' },
            { icon: CheckCircle, label: 'Garantia', text: 'Qualidade Premium' },
          ].map((item, i) => (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5, backgroundColor: "rgba(255, 255, 255, 0.95)" }}
              key={i}
              className="p-8 bg-white/70 backdrop-blur-3xl border border-white/50 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.03)] rounded-[32px] flex flex-col items-center text-center group cursor-default"
            >
              <div className="h-14 w-14 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                <item.icon size={22} className="stroke-[2]" />
              </div>
              <p className="text-[9px] font-bold font-display uppercase tracking-[0.3em] text-indigo-600 mb-2">{item.label}</p>
              <p className="text-sm font-black font-display text-slate-900 leading-tight uppercase tracking-tight">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Fleet Section ────────────────────────────────────────────────────── */}
      <section id="frota" className="py-32 px-6 md:px-12">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full" />
                <span className="text-indigo-600 font-extrabold uppercase tracking-[0.2em] text-[10px]">Catálogo Premium</span>
              </div>
              <h2 className="text-6xl md:text-8xl font-display font-black text-slate-900 tracking-tighter leading-[0.85] mb-8">Veículos que<br/>Elevam o Nível.</h2>
              <p className="text-slate-500 font-medium text-xl leading-relaxed">Cada veículo em nossa frota passa por um rigoroso processo de revisão para garantir que sua única preocupação seja o seu destino.</p>
            </div>
            <Link to="/catalogo" className="h-16 px-10 bg-slate-50 text-slate-900 border border-slate-200 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-95 flex items-center gap-3 group">
              Explorar Catálogo
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[450px] rounded-[48px] bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-24 px-8 bg-white/50 backdrop-blur-sm rounded-[60px] border border-slate-100 max-w-3xl mx-auto shadow-sm">
               <div className="h-24 w-24 bg-indigo-50 text-indigo-200 rounded-full flex items-center justify-center mx-auto mb-8">
                 <Car size={48} strokeWidth={1} />
               </div>
               <h3 className="text-3xl font-display font-black text-slate-900 mb-4 tracking-tight">Frota em Renovação</h3>
               <p className="text-slate-500 font-medium text-lg leading-relaxed mb-10 max-w-lg mx-auto">
                 Estamos atualizando nosso estoque com modelos 2024/2025. Enquanto isso, consulte disponibilidade imediata via WhatsApp.
               </p>
               <a href="https://wa.me/5579999641398" target="_blank" className="h-16 px-12 bg-indigo-600 text-white rounded-full font-black uppercase tracking-widest text-[11px] hover:bg-indigo-700 shadow-2xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-3 mx-auto max-w-xs">
                 Consultar Agora <MessageCircle size={18} />
               </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
              {vehicles.map((v) => (
                <motion.div
                  key={v.id}
                  whileHover={{ y: -15 }}
                  className="bg-white rounded-[50px] p-4 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] border border-slate-50 group transition-all duration-700 hover:shadow-[0_50px_100px_-20px_rgba(79,70,229,0.1)]"
                >
                  {/* Photo Container */}
                  <div className="relative h-64 bg-slate-50 rounded-[40px] overflow-hidden mb-6">
                    {v.photos_urls && v.photos_urls.length > 0 ? (
                      <img src={v.photos_urls[0]} alt={v.model} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <Car size={72} strokeWidth={1} />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 right-4 flex justify-between">
                      <span className="px-5 py-2 bg-white/80 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-indigo-600 shadow-sm border border-white">
                        {v.category}
                      </span>
                      <div className="h-10 w-10 bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Share2 size={16} />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="px-6 pb-6">
                    <h3 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors tracking-tight truncate">
                      {v.model}
                    </h3>
                    <div className="flex gap-6 mb-8">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-slate-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">5 Lugares</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-slate-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Premium</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-1 leading-none">A partir de</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
                          <span className="text-sm mr-1">R$</span>
                          {Number(v.daily_rate).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                      <a href={`https://wa.me/5579999641398?text=${encodeURIComponent(`Olá! Vi o ${v.model} no site e gostaria de saber a disponibilidade.`)}`} target="_blank" className="h-14 w-14 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-slate-900 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
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
            <span className="text-red-600 font-bold font-display uppercase tracking-[0.2em] text-[10px] bg-white px-4 py-1.5 rounded-full shadow-sm mb-4 inline-block">Assinatura de Motos</span>
            <h2 className="text-5xl md:text-8xl font-display font-black text-slate-900 tracking-tighter leading-[0.85] mb-6">Planos que vão<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-red-600">muito além!</span></h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-2xl px-4">Condições exclusivas para você trabalhar ou se deslocar sem preocupações. E o melhor: no final do plano, a moto é sua.</p>
          </div>

          <div className="max-w-5xl mx-auto rounded-[32px] md:rounded-[48px] shadow-2xl shadow-blue-900/10 overflow-hidden flex flex-col md:flex-row group">
            {/* Left side: Pricing and features (Blue theme) */}
            <div className="w-full md:w-1/2 p-8 md:p-14 bg-gradient-to-br from-[#0c1e80] to-[#1224a1] text-white relative flex flex-col justify-center">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

               <div className="relative z-10 w-full max-w-sm mx-auto md:mx-0">
                  <h3 className="text-5xl md:text-[4rem] font-display font-black uppercase tracking-tighter leading-[0.8] mb-8 text-red-500 drop-shadow-md">
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
                 <h3 className="text-6xl md:text-[5.5rem] font-display font-black uppercase text-white tracking-tighter leading-[0.85] drop-shadow-2xl">
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

      {/* ── Brand Story Section ─────────────────────────────────────────────── */}
      <section id="quem-somos" className="py-28 px-6 md:px-12 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
            <div className="relative order-2 lg:order-1">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative z-10 rounded-[48px] overflow-hidden aspect-video md:aspect-[4/3] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-slate-100"
              >
                <img src="/honda-titan-grey.png" alt="Nosso DNA" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent" />
                <div className="absolute bottom-10 left-10 right-10">
                   <p className="text-4xl font-black text-white tracking-tighter mb-2">DNA<br/>Imbatível.</p>
                   <p className="text-slate-300 font-medium text-base max-w-xs">Excelência em cada detalhe da sua jornada por Sergipe.</p>
                </div>
              </motion.div>
              
              {/* Secondary Image for Editorial Look */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="absolute -bottom-10 -right-10 w-1/3 rounded-[24px] overflow-hidden aspect-square shadow-2xl border-4 border-white hidden lg:block"
              >
                <img src="https://images.unsplash.com/photo-1558981285-6f0c94958bb6?auto=format&fit=crop&q=80&w=600" alt="Moto Detail" className="w-full h-full object-cover" />
              </motion.div>
            </div>

            <div className="flex flex-col order-1 lg:order-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-1 w-12 bg-indigo-600 rounded-full" />
                  <span className="text-indigo-600 font-black uppercase tracking-[0.4em] text-[11px]">Nossa Identidade</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.85] mb-8">Referência em<br/><span className="text-indigo-600">Mobilidade.</span></h2>
                
                <p className="text-xl text-slate-500 font-medium leading-relaxed mb-10 max-w-xl">
                  A Itabaiana Loc nasceu da paixão por liberdade. Com mais de uma década de estrada em Sergipe, transformamos aluguéis em conquistas reais.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                   <div className="space-y-6 group">
                      <div className="h-16 w-16 bg-slate-50 text-indigo-600 rounded-3xl flex items-center justify-center border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                        <CheckCircle size={32} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest mb-3">Procedência</h4>
                        <p className="text-base text-slate-500 font-medium leading-relaxed">Frota 100% revisada com histórico transparente de manutenção.</p>
                      </div>
                   </div>
                   <div className="space-y-6 group">
                      <div className="h-16 w-16 bg-slate-50 text-indigo-600 rounded-3xl flex items-center justify-center border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                        <Users size={32} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest mb-3">Compromisso</h4>
                        <p className="text-base text-slate-500 font-medium leading-relaxed">Suporte humanizado 24h para que você nunca fique na mão.</p>
                      </div>
                   </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials Section (Horizontal Slider) ─────────────────────────── */}
      <section className="py-40 px-6 md:px-12 bg-white relative overflow-hidden">
        {/* Abstract Background Design Elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50 skew-x-12 translate-x-1/2 pointer-events-none opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-50 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-24 max-w-3xl mx-auto">
            <span className="text-red-600 font-bold font-display uppercase tracking-[0.3em] text-[10px] bg-red-50 px-4 py-1.5 rounded-full border border-red-100 mb-6 inline-block">Feedback dos Clientes</span>
            <h2 className="text-6xl md:text-8xl font-display font-black text-slate-900 tracking-tighter leading-[0.85] mb-8">Vozes de Quem<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-red-600">Acredita.</span></h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed px-4">Milhares de km rodados com segurança e a confiança de quem conhece o melhor de Itabaiana e Sergipe.</p>
          </div>
        </div>

        {/* Carousel Container */}
        <div className="relative overflow-hidden w-full py-10">
          <motion.div 
            animate={{ x: ["0%", "-100%"] }}
            transition={{ 
              duration: 80, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="flex gap-8 w-max px-4"
          >
            {/* Doubling the items for an infinite seamless scroll effect */}
            {[...Array(2)].map((_, loopIdx) => (
              <div key={loopIdx} className="flex gap-8">
                {[
                  { name: "Marcos Oliveira", role: "Entregador", text: "A Itabaiana Loc facilitou minha vida. Com o aluguel semanal de 30 meses, hoje sinto que tenho uma oportunidade real de crescer. É o suporte que o trabalhador honesto precisa." },
                  { name: "Juliana Santos", role: "Autônoma", text: "O plano de 30 meses para motos com pagamento semanal é perfeito. Cabe no bolso e me deu a liberdade que eu precisava para trabalhar por conta própria." },
                  { name: "Ricardo Porto", role: "Empreendedor", text: "Excelente oportunidade para quem quer começar. O sistema de pagamento semanal facilita muito a organização e no fim dos 30 meses a moto é sua." },
                  { name: "Ana Paula", role: "Vendedora", text: "Trabalho como entregadora e a Itabaiana Loc foi a única que realmente facilitou meu acesso a uma moto nova com pagamento semanal justo." },
                  { name: "Tiago Mendes", role: "Motorista App", text: "Migrei para cá pelo plano de 30 meses. É a melhor forma de um trabalhador honesto conquistar seu veículo pagando semanalmente." },
                  { name: "Fernanda Lima", role: "Entregas", text: "A Itabaiana Loc entende o trabalhador. Os planos semanais são acessíveis e dão a oportunidade que as pessoas precisam para mudar de vida." },
                  { name: "Lucas Silva", role: "Logística", text: "Com a facilidade do pagamento semanal e o plano de 30 meses, consegui minha moto para trabalhar e sustentar minha família com tranquilidade." }
                ].map((t, i) => (
                  <div 
                    key={i}
                    className="w-[380px] p-12 bg-white border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] rounded-[60px] flex flex-col group hover:border-indigo-100 transition-all duration-500"
                  >
                    <div className="flex gap-1 mb-8 text-amber-400">
                      {[...Array(5)].map((_, j) => <Star key={j} size={16} fill="currentColor" className="stroke-amber-400" />)}
                    </div>
                    <p className="text-xl text-slate-800 font-bold leading-relaxed mb-10 tracking-tight group-hover:text-indigo-900 transition-colors">"{t.text}"</p>
                    <div className="flex items-center gap-5 mt-auto">
                      <div className="h-16 w-16 bg-slate-900 text-white rounded-[24px] flex items-center justify-center font-display font-black text-xl shadow-xl shadow-slate-900/20">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-slate-900 font-display font-black uppercase tracking-widest text-[11px] mb-1">{t.name}</p>
                        <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-24 px-6 md:px-12">
        <div className="container mx-auto rounded-[60px] bg-slate-900 overflow-hidden relative shadow-2xl group">
          <div className="absolute inset-0 grayscale opacity-10 group-hover:opacity-20 transition-opacity duration-1000 scale-110 group-hover:scale-100 transition-transform">
            <img src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=100&w=1920" alt="Action" className="w-full h-full object-cover" />
          </div>
          <div className="relative z-10 py-24 px-8 text-center flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] max-w-4xl mb-10">
                Sua próxima<br/>conquista começa<br/><span className="text-indigo-500">agora mesmo.</span>
              </h2>
              <p className="text-slate-400 text-xl font-medium mb-16 max-w-xl mx-auto">
                Fale agora com nosso time VIP e garanta as melhores condições de Sergipe.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                 <a href="https://wa.me/5579999641398" className="px-14 py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-600/50 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3">
                   Mandar WhatsApp <MessageCircle size={18} />
                 </a>
                 <a href="#frota" className="px-14 py-6 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-100 active:scale-95 transition-all">
                   Explorar Modelos
                 </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ─────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 md:px-12 bg-slate-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-20">
            <span className="text-indigo-600 font-bold font-display uppercase tracking-[0.3em] text-[10px]">Dúvidas Frequentes</span>
            <h2 className="text-5xl md:text-7xl font-display font-black text-slate-900 tracking-tighter mt-4">Papo Reto e<br/>Sincero.</h2>
          </div>

          <div className="space-y-6">
            {[
              { q: "Quais documentos preciso para alugar?", a: "Para locação diária, basta CNH definitiva (categoria A ou B) e comprovante de residência atualizado no seu nome." },
              { q: "Como funciona o aluguel com intenção de compra?", a: "Você escolhe sua Honda 0km, paga uma parcela semanal de R$330 e após 30 meses de contrato adimplente, a moto é transferida para o seu nome sem custos adicionais de compra." },
              { q: "O seguro cobre qualquer situação?", a: "Sim, nossos veículos possuem seguro total contra roubo, furto, colisão e danos a terceiros. Além de guincho 24h em todo estado de Sergipe." },
              { q: "Posso trabalhar em aplicativos como iFood ou Uber?", a: "Com certeza! Nossos planos de assinatura são desenhados especialmente para quem deseja empreender e ter seu próprio veículo de trabalho." }
            ].map((faq, i) => (
              <motion.details 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <summary className="flex items-center justify-between p-8 list-none">
                  <h4 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{faq.q}</h4>
                  <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center transition-transform group-open:rotate-180">
                    <ChevronRight size={20} className="text-slate-400" />
                  </div>
                </summary>
                <div className="px-8 pb-8 text-slate-500 font-medium leading-relaxed">
                  {faq.a}
                </div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      <footer id="contato" className="bg-white/80 backdrop-blur-xl border-t border-slate-200 py-32 text-slate-800 px-6 md:px-12 relative z-20">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-1 md:col-span-1">
             <div className="text-3xl font-black tracking-tighter mb-8 text-indigo-900">
                <img src="/logo.png" alt="Itabaiana Loc" className="h-14 w-auto object-contain drop-shadow-sm mb-4" />
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
             <h4 className="font-bold font-display uppercase tracking-widest text-xs mb-8 text-slate-900">Navegação</h4>
             <ul className="space-y-4 font-bold text-slate-500">
                <li><a href="#inicio" className="hover:text-indigo-600 transition-colors">Início</a></li>
                <li><a href="#frota" className="hover:text-indigo-600 transition-colors">Frota</a></li>
                <li><a href="#planos" className="hover:text-indigo-600 transition-colors">Planos</a></li>
                <li><a href="#quem-somos" className="hover:text-indigo-600 transition-colors">Quem Somos</a></li>
             </ul>
          </div>

          <div>
             <h4 className="font-bold font-display uppercase tracking-widest text-xs mb-8 text-slate-900">Legal</h4>
             <ul className="space-y-4 font-bold text-slate-500">
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Contratos</a></li>
             </ul>
          </div>

          <div>
             <h4 className="font-bold font-display uppercase tracking-widest text-xs mb-8 text-slate-900">Localização</h4>
             <p className="text-slate-500 font-medium mb-6 flex gap-3 leading-relaxed">
                <MapPin size={24} className="text-indigo-500 shrink-0" />
                <div>
                   Rua Itabaiana, 456 - Centro<br />Itabaiana, SE - CEP: 49500-000
                </div>
             </p>
             <p className="text-slate-500 font-medium flex gap-3 items-center">
                <Phone size={18} className="text-indigo-500" />
                (79) 99964-1398
             </p>
          </div>
        </div>
        
        <div className="container mx-auto pt-20 mt-20 border-t border-slate-200 text-center flex flex-col items-center gap-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">&copy; {new Date().getFullYear()} Itabaiana Loc. Todos os direitos reservados.</p>
          <a 
            href="#" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-indigo-600 transition-all group"
          >
            Desenvolvido por <span className="underline decoration-indigo-200 underline-offset-4">Soft Tech</span>
          </a>
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
