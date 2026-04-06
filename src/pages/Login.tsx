import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Mail, Lock, LogIn, ArrowLeft, Eye, EyeOff, 
  ShieldAlert, AlertTriangle, RefreshCw, Shield,
  CheckCircle2, Car, ClipboardCheck, BarChart3, MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';

const LOGO_URL = logo;
const BG_IMAGE_URL = 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=2070&auto=format&fit=crop'; // High-end bright car image

// ── Security Constants ─────────────────────────────────────────────────────
const MAX_ATTEMPTS      = 5;
const LOCKOUT_DURATIONS = [30, 60, 300, 900];
const MIN_SUBMIT_MS     = 1000;
const STORAGE_KEY       = 'itabaiana_sec_v3';

// ── CAPTCHA Logic ──────────────────────────────────────────────────────────
const genCaptcha = () => {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const ops = ['+', '-'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const answer = op === '+' ? a + b : a - b;
  return { a, b, op, answer };
};

interface SecState {
  attempts: number;
  lockedUntil: number;
  lockCount: number;
  lastAttempt: number;
}

const loadSec = (): SecState => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: 0, lockCount: 0, lastAttempt: 0 };
  } catch { return { attempts: 0, lockedUntil: 0, lockCount: 0, lastAttempt: 0 }; }
};
const saveSec = (s: SecState) => sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState(false);
  const [sec,         setSec]         = useState<SecState>(loadSec);
  const [countdown,   setCountdown]   = useState(0);
  const [captcha,     setCaptcha]     = useState(genCaptcha);
  const [captchaIn,   setCaptchaIn]   = useState('');
  const [captchaErr,  setCaptchaErr]  = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [isFocused,   setIsFocused]   = useState<'email' | 'password' | null>(null);

  const honeypotRef  = useRef<HTMLInputElement>(null);
  const pageLoadTime = useRef(Date.now());

  // Countdown timer for lockout
  useEffect(() => {
    const iv = setInterval(() => {
      const r = Math.ceil((sec.lockedUntil - Date.now()) / 1000);
      setCountdown(r > 0 ? r : 0);
    }, 500);
    return () => clearInterval(iv);
  }, [sec.lockedUntil]);

  useEffect(() => {
    setShowCaptcha(sec.attempts >= 3);
  }, [sec.attempts]);

  const isLocked = () => Date.now() < sec.lockedUntil;

  const incrementFailure = useCallback(() => {
    const newAttempts = sec.attempts + 1;
    let newLockedUntil = sec.lockedUntil;
    let newLockCount   = sec.lockCount;

    if (newAttempts >= MAX_ATTEMPTS) {
      const dur      = LOCKOUT_DURATIONS[Math.min(sec.lockCount, LOCKOUT_DURATIONS.length - 1)];
      newLockedUntil = Date.now() + dur * 1000;
      newLockCount   = sec.lockCount + 1;
    }
    const next: SecState = {
      attempts:    newAttempts >= MAX_ATTEMPTS ? 0 : newAttempts,
      lockedUntil: newLockedUntil,
      lockCount:   newLockCount,
      lastAttempt: Date.now(),
    };
    saveSec(next); setSec(next);
    setCaptcha(genCaptcha()); setCaptchaIn('');
  }, [sec]);

  const resetOnSuccess = () => {
    const next: SecState = { attempts: 0, lockedUntil: 0, lockCount: 0, lastAttempt: Date.now() };
    saveSec(next); setSec(next);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Bot detection: honeypot
    if (honeypotRef.current?.value) {
      await new Promise(r => setTimeout(r, 2000));
      setError('System security anomaly detected. Potential bot activity.');
      return;
    }

    // Bot detection: time to submit
    const elapsed = Date.now() - pageLoadTime.current;
    if (elapsed < MIN_SUBMIT_MS) await new Promise(r => setTimeout(r, MIN_SUBMIT_MS - elapsed));

    if (isLocked()) {
      setError(`Access temporarily suspended. Try again in ${countdown}s.`);
      return;
    }

    if (showCaptcha && parseInt(captchaIn, 10) !== captcha.answer) {
      setCaptchaErr(true); 
      setCaptcha(genCaptcha()); 
      setCaptchaIn('');
      setError('Verification failed. Please complete the security check.'); 
      return;
    }
    setCaptchaErr(false);

    // Progressive delay for rate limiting
    const sinceLastAttempt = Date.now() - sec.lastAttempt;
    const minDelay = Math.min(sec.attempts * 500, 3000);
    if (sinceLastAttempt < minDelay) await new Promise(r => setTimeout(r, minDelay - sinceLastAttempt));

    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        incrementFailure();
        const remaining = MAX_ATTEMPTS - (sec.attempts + 1);
        
        // Obfuscated error message for security (don't reveal if it's password or email that's wrong)
        if (remaining > 0) {
          setError('Credenciais inválidas. Verifique seus dados.');
        } else {
          setError('Acesso bloqueado por excesso de tentativas.');
        }
        setLoading(false);
      } else {
        setSuccess(true); 
        resetOnSuccess();
        setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
      }
    } catch {
      setError('Network communication failure. Please check your connectivity.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim() || !email.includes('@')) { 
      setError('Informe um e-mail administrativo válido.'); 
      return; 
    }
    setLoading(true);
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setLoading(false);
    if (resetErr) {
      setError('Falha na recuperação. Contate o administrador.');
    } else {
      setError(null); 
      alert('Instruções enviada para o seu e-mail.'); 
    }
  };

  const isBlockedNow  = isLocked();

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      
      {/* ── LEFT: Immersive Info Panel ── */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex flex-col justify-between w-[40%] xl:w-[45%] p-16 relative overflow-hidden group border-r border-slate-200"
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={BG_IMAGE_URL} 
            alt="Luxury Automotive" 
            className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-[10s] opacity-20 contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/90 via-white/80 to-slate-50/50" />
          
          {/* Animated pattern */}
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 group/back text-slate-500 hover:text-indigo-600 transition-colors duration-300">
            <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center group-hover/back:-translate-x-1 transition-transform bg-white/50 backdrop-blur-sm">
              <ArrowLeft size={14} />
            </div>
            <span className="text-sm font-bold tracking-wide uppercase italic opacity-70 group-hover/back:opacity-100">Página Inicial</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <img src={LOGO_URL} alt="Itabaiana Loc" className="h-28 w-auto mb-8 drop-shadow-sm" />
            <h1 className="text-5xl xl:text-6xl font-black tracking-tighter leading-[0.9] text-slate-900">
              GESTÃO<br /><span className="text-indigo-600">DE FROTAS.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-sm font-medium leading-relaxed">
              Excelência em mobilidade inteligente. Transformando a gestão de frotas com agilidade, transparência e tecnologia.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: Car, label: 'Frota Premium', color: 'indigo' },
              { icon: ClipboardCheck, label: 'Contratos Digitais', color: 'blue' },
              { icon: BarChart3, label: 'Gestão Financeira', color: 'emerald' },
              { icon: MapPin, label: 'Sede em Itabaiana, SE', color: 'amber' }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + (i * 0.1) }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/80 border border-slate-100 shadow-sm backdrop-blur-md"
              >
                <feature.icon className={`text-${feature.color}-600`} size={18} />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-700">{feature.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-slate-200 pt-8 mt-12">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            ITABAIANA LOC <span className="text-indigo-600 opacity-60">SISTEMA INTERNO</span>
          </p>
          <p className="text-[10px] font-medium text-slate-400 italic">
            © 2026 ITABAIANA LOCAÇÕES
          </p>
        </div>
      </motion.div>

      {/* ── RIGHT: Login Interface ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 xl:p-24 bg-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[480px]"
        >
          {/* Mobile Brand */}
          <div className="lg:hidden flex flex-col items-center mb-10 text-center">
            <img src={LOGO_URL} alt="Logo" className="h-20 mb-4" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Acesso Restrito</h2>
          </div>

          <div className="relative">
            <div className="relative bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)]">
              {/* Top progress line */}
              <motion.div 
                className="h-1 bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-600"
                animate={loading ? { x: ["-100%", "100%"] } : { x: "0%" }}
                transition={loading ? { repeat: Infinity, duration: 1.5, ease: "linear" } : {}}
              />

              <div className="p-8 sm:p-12">
                <div className="mb-10">
                  <motion.h2 
                    className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3"
                    layout
                  >
                    Acesso Restrito
                    <Lock className="text-indigo-600" size={24} />
                  </motion.h2>
                  <p className="text-slate-500 font-medium mt-2">Identifique-se para acessar o painel administrativo.</p>
                </div>

                <AnimatePresence mode="wait">
                  {isBlockedNow && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-4"
                    >
                      <ShieldAlert className="text-red-500 shrink-0" size={20} />
                      <div>
                        <p className="text-sm font-bold text-red-600">Acesso Bloqueado</p>
                        <p className="text-xs text-red-500/80 mt-1">Nova tentativa disponível em <span className="font-mono font-bold text-red-600">{countdown}s</span></p>
                      </div>
                    </motion.div>
                  )}

                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="text-emerald-500" size={20} />
                      </div>
                      <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest italic">Bem-vindo. Redirecionando...</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
                  {/* Honeypot */}
                  <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
                    <input ref={honeypotRef} type="text" name="b_username" tabIndex={-1} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">E-mail de Acesso</label>
                    <div className={`relative transition-all duration-300 ${isFocused === 'email' ? 'scale-[1.02]' : ''}`}>
                      <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${isFocused === 'email' ? 'text-indigo-600' : 'text-slate-400'}`}>
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onFocus={() => setIsFocused('email')}
                        onBlur={() => setIsFocused(null)}
                        disabled={loading || isBlockedNow || success}
                        placeholder="seu.email@itabaianaloc.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600/30 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Senha</label>
                    </div>
                    <div className={`relative transition-all duration-300 ${isFocused === 'password' ? 'scale-[1.02]' : ''}`}>
                      <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${isFocused === 'password' ? 'text-indigo-600' : 'text-slate-400'}`}>
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onFocus={() => setIsFocused('password')}
                        onBlur={() => setIsFocused(null)}
                        disabled={loading || isBlockedNow || success}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600/30 transition-all disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* CAPTCHA Interaction */}
                  {showCaptcha && !isBlockedNow && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-5 rounded-3xl bg-indigo-50/50 border border-indigo-100 space-y-4 shadow-inner"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Verificação Humana</span>
                        <button type="button" onClick={() => setCaptcha(genCaptcha())} className="text-slate-400 hover:text-indigo-600 transition-colors">
                          <RefreshCw size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-white border border-slate-200 p-4 rounded-2xl text-center font-mono text-xl font-black text-indigo-600 shadow-sm">
                          {captcha.a} {captcha.op} {captcha.b} =
                        </div>
                        <input
                          type="number"
                          value={captchaIn}
                          onChange={e => { setCaptchaIn(e.target.value); setCaptchaErr(false); }}
                          className={`w-24 bg-white border ${captchaErr ? 'border-red-500/50' : 'border-slate-200'} p-4 rounded-2xl text-center text-xl font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-sm`}
                        />
                      </div>
                    </motion.div>
                  )}

                  {error && !success && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 shadow-sm"
                    >
                      <AlertTriangle className="text-red-500 shrink-0" size={16} />
                      <p className="text-xs font-bold text-red-600/90">{error}</p>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || isBlockedNow || success}
                    className={`group relative w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 overflow-hidden shadow-sm ${
                      isBlockedNow 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300 shadow-lg active:scale-[0.98]'
                    }`}
                  >
                    <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                    
                    {loading ? (
                      <RefreshCw className="animate-spin" size={16} />
                    ) : isBlockedNow ? (
                      <ShieldAlert size={16} />
                    ) : (
                      <>
                        <LogIn size={16} />
                        Entrar no Sistema
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-12 flex items-center justify-between opacity-30 group-hover:opacity-100 transition-opacity">
                  <div className="h-px flex-1 bg-slate-200" />
                  <div className="mx-4 flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-indigo-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Conexão Segura Ativa</span>
                  </div>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
            Acesso Restrito · IP Monitorado · {new Date().getFullYear()}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;

