import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Store, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Inicio', href: '#inicio' },
    { name: 'Frota', href: '#frota' },
    { name: 'Planos', href: '#planos' },
    { name: 'Quem Somos', href: '#quem-somos' },
    { name: 'Contato', href: '#contato' }
  ];

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    if (!isHome) {
      window.location.href = '/' + href;
    }
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 py-4 px-6 md:px-12 flex justify-between items-center ${isScrolled ? 'bg-white/80 backdrop-blur-2xl border-b border-slate-200/50 shadow-sm' : 'bg-transparent border-b-transparent'}`}>
        <Link to="/" className="flex items-center gap-4 group cursor-pointer">
           <img src="/logo.png" alt="Itabaiana Loc" className="h-10 md:h-12 w-auto object-contain transition-transform duration-500 group-hover:scale-105" />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-10">
          {navItems.map(item => (
            <a 
              key={item.name} 
              href={isHome ? item.href : `/${item.href}`} 
              className={`text-[12px] font-bold font-display uppercase tracking-[0.25em] transition-all hover:text-indigo-600 relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-indigo-600 after:transition-all hover:after:w-full ${isScrolled || !isHome ? 'text-slate-600' : 'text-white'}`}
            >
              {item.name}
            </a>
          ))}
          <Link to="/login" className="px-8 py-3 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all ml-4 border border-white/10">
            Acesso Restrito
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden flex items-center">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`p-3 rounded-2xl transition-all flex items-center justify-center ${isScrolled || !isHome ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'bg-white/10 backdrop-blur-md text-white border border-white/20'}`}>
             {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="md:hidden fixed top-24 left-4 right-4 bg-white/98 backdrop-blur-3xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] rounded-[32px] p-8 z-50 border border-slate-100 flex flex-col gap-6"
          >
            {navItems.map(item => (
              <a 
                onClick={() => handleNavClick(item.href)}
                key={item.name} 
                href={isHome ? item.href : `/${item.href}`} 
                className="text-lg font-black uppercase tracking-widest text-slate-800 hover:text-indigo-600 py-3 border-b border-slate-50 last:border-0"
              >
                {item.name}
              </a>
            ))}
            <Link onClick={() => setMobileMenuOpen(false)} to="/login" className="mt-4 py-5 bg-indigo-600 text-white flex items-center justify-center gap-2 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/30">
              <Store size={18} />
              Acesso Restrito
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
