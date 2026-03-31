import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
const logo = '/logo.png';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Se o usuário já estiver logado, envia para o dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Credenciais inválidas. Verifique seu e-mail e senha.');
      setLoading(false);
    } else {
      // Login bem-sucedido — redireciona para o dashboard
      navigate('/dashboard', { replace: true });
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Informe seu e-mail para recuperar a senha.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) setError(error.message);
    else alert('E-mail de recuperação enviado!');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 relative">
      
      {/* Botão de Voltar ao site */}
      <div className="absolute top-6 left-6 md:top-12 md:left-12">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 bg-white/50 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all active:scale-95"
        >
          <ArrowLeft size={16} />
          <span>Voltar ao site</span>
        </Link>
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="NexusLoc Logo" className="h-20 object-contain" />
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">NexusLoc</h1>
            <p className="text-slate-500 mt-2">Gestão Inteligente de Locações</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">E-mail</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nexusloc.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-semibold text-slate-700">Senha</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline transition-all"
                >
                  Esqueceu sua senha?
                </button>
              </div>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-2 border border-red-100 font-medium animate-shake">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-primary-700 transform transition-all active:scale-[0.98] shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-6 h-6 border-b-2 border-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 mt-10 text-sm">
          NexusLoc v1.0.0 &bull; &copy; 2026
        </p>
      </div>
    </div>
  );
};

export default Login;
