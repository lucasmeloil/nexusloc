import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import type { SystemSettings } from '../types';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Save,
  CheckCircle2,
  RotateCcw,
  PlusCircle,
  Loader2,
  Clock,
  Coins,
  Image,
  UserPlus,
  ShieldCheck,
  Lock,
  UserCircle
} from 'lucide-react';

const DEFAULT_SETTINGS: SystemSettings = {
  company_name: 'Itabaiana Loc',
  company_cnpj: '',
  company_address: '',
  company_phone: '',
  company_email: '',
  logo_url: '/logo.png',
  currency: 'BRL',
  daily_rental_start_time: '08:00',
  daily_rental_end_time: '18:00',
  contract_clauses: [
    'O locatário deve devolver o veículo com o mesmo nível de combustível.',
    'Multas de trânsito ocorridas durante o período de locação são de responsabilidade do locatário.',
    'Atraso na devolução acarretará cobrança de hora extra proporcional.'
  ],
};

const Field = ({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
      {icon && <span className="text-primary-500">{icon}</span>}
      {label}
    </label>
    {children}
  </div>
);

const Section = ({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) => (
  <div className="card">
    <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
      <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl">{icon}</div>
      <div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{desc}</p>
      </div>
    </div>
    <div className="space-y-5">{children}</div>
  </div>
);

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Estados para Gestão de Usuários
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          ...settings, 
          id: settings.id || '00000000-0000-0000-0000-000000000001',
          updated_at: new Date().toISOString() 
        });

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword) return;
    
    setCreatingAdmin(true);
    setAuthMessage(null);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newAdminEmail,
        password: newAdminPassword,
      });

      if (error) throw error;
      
      // Criar registro na tabela pública profiles para garantir persistência do admin
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email || newAdminEmail,
          role: 'admin'
        });
      }
      
      // Registrar ação no log de auditoria
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert({
        user_email: currentUser?.email || 'system',
        action: 'admin_creation',
        details: { new_admin_email: newAdminEmail }
      });

      setAuthMessage({ type: 'success', text: 'Admin criado com sucesso! O novo admin já pode acessar.' });
      setNewAdminEmail('');
      setNewAdminPassword('');
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: error.message || 'Erro ao criar usuário.' });
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setAuthMessage({ type: 'error', text: 'Preencha todos os campos de senha.' });
      return;
    }
    if (newPassword.length < 6) {
      setAuthMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setAuthMessage({ type: 'error', text: 'As novas senhas não coincidem.' });
      return;
    }

    setUpdatingPassword(true);
    setAuthMessage(null);
    
    try {
      // 1. Identificar usuário atual com o cliente principal
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Sessão expirada. Faça login novamente.');

      // 2. CRIAR UM CLIENTE TEMPORÁRIO PARA VERIFICAR A SENHA ATUAL
      // Isso é CRUCIAL para não resetar a sessão do usuário principal nem causar re-renders do AuthContext
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

      const { error: verifyError } = await tempSupabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (verifyError) throw new Error('A senha atual fornecida está incorreta.');

      // 3. ATUALIZAR SENHA NO BANCO DE AUTENTICAÇÃO DO SUPABASE (USER_ID ORIGINAL)
      // Usamos o cliente principal agora que sabemos que a senha atual é válida
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;
      
      // 4. Salvar histórico no banco de dados (Tabela Pública para auditoria)
      await supabase.from('audit_logs').insert({
        user_email: user.email,
        action: 'password_change',
        details: { 
          source: 'settings_panel',
          timestamp: new Date().toISOString(),
          status: 'success'
        }
      });

      // 5. Atualizar perfil se necessário (opcional, apenas para auditoria interna)
      await supabase.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', user.id);

      setAuthMessage({ type: 'success', text: 'Senha alterada com sucesso no Supabase Auth!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: error.message || 'Erro ao processar alteração de senha.' });
    } finally {
      setUpdatingPassword(false);
    }
  };



  const set = (key: keyof SystemSettings, value: any) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const udpateClause = (index: number, value: string) => {
    const newClauses = [...settings.contract_clauses];
    newClauses[index] = value;
    set('contract_clauses', newClauses);
  };

  const addClause = () => {
    set('contract_clauses', [...settings.contract_clauses, '']);
  };

  const removeClause = (index: number) => {
    set('contract_clauses', settings.contract_clauses.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
        <p className="text-slate-500 font-medium">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in max-w-4xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Configurações do Sistema</h2>
          <p className="text-slate-500 mt-1">Dados da empresa e padrões para novos contratos.</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-bold text-sm animate-in fade-in zoom-in duration-300">
            <CheckCircle2 size={18} />
            Alterações salvas com sucesso!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Dados da Empresa */}
        <Section
          icon={<Building2 size={22} />}
          title="Dados da Locadora"
          desc="Essas informações serão exibidas no cabeçalho e rodapé dos contratos PDF."
        >
          <Field label="Nome Empresarial / Fantasia" icon={<Building2 size={16} />}>
            <input
              type="text"
              value={settings.company_name}
              onChange={e => set('company_name', e.target.value)}
              placeholder="Ex: Itabaiana Loc Locações LTDA"
              className="input-field"
              required
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="CNPJ" icon={<FileText size={16} />}>
              <input
                type="text"
                value={settings.company_cnpj}
                onChange={e => set('company_cnpj', e.target.value)}
                placeholder="00.000.000/0001-00"
                className="input-field"
              />
            </Field>
            <Field label="Telefone de Contato" icon={<Phone size={16} />}>
              <input
                type="tel"
                value={settings.company_phone}
                onChange={e => set('company_phone', e.target.value)}
                placeholder="(11) 99999-9999"
                className="input-field"
              />
            </Field>
          </div>

          <Field label="Endereço da Sede" icon={<MapPin size={16} />}>
            <input
              type="text"
              value={settings.company_address}
              onChange={e => set('company_address', e.target.value)}
              placeholder="Logradouro, Nº, Bairro, Cidade-UF"
              className="input-field"
            />
          </Field>

          <Field label="E-mail Corporativo" icon={<Mail size={16} />}>
            <input
              type="email"
              value={settings.company_email}
              onChange={e => set('company_email', e.target.value)}
              placeholder="contato@itabaianaloc.com"
              className="input-field"
            />
          </Field>

          {/* Logo info banner */}
          <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
              <Image size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-800">Logotipo definido globalmente</p>
              <p className="text-xs text-indigo-500 mt-0.5">A logo da <strong>Itabaiana Loc</strong> está aplicada em todo o sistema: navbar, sidebar, login e rodapé.</p>
            </div>
          </div>
        </Section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Horários */}
          <Section
            icon={<Clock size={22} />}
            title="Prazos de Diária"
            desc="Define o horário padrão para cobrança."
          >
            <div className="grid grid-cols-1 gap-5">
              <Field label="Início da Diária" icon={<Clock size={16} />}>
                <input
                  type="time"
                  value={settings.daily_rental_start_time}
                  onChange={e => set('daily_rental_start_time', e.target.value)}
                  className="input-field"
                />
              </Field>
              <Field label="Término da Diária (Check-out)" icon={<Clock size={16} />}>
                <input
                  type="time"
                  value={settings.daily_rental_end_time}
                  onChange={e => set('daily_rental_end_time', e.target.value)}
                  className="input-field"
                />
              </Field>
            </div>
          </Section>

          {/* Moeda */}
          <Section
            icon={<Coins size={22} />}
            title="Financeiro"
            desc="Símbolo monetário do sistema."
          >
            <Field label="Moeda Padrão" icon={<Coins size={16} />}>
              <select
                value={settings.currency}
                onChange={e => set('currency', e.target.value)}
                className="input-field font-bold"
              >
                <option value="BRL">Real Brasileiro (R$)</option>
                <option value="USD">Dólar Americano ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </Field>
          </Section>
        </div>

        {/* Gestão de Acesso */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Section
            icon={<UserPlus size={22} />}
            title="Novo Administrador"
            desc="Crie uma nova conta de acesso para o sistema."
          >
            <div className="space-y-4">
              <Field label="E-mail do Novo Admin" icon={<Mail size={16} />}>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  placeholder="exemplo@itabaianaloc.com"
                  className="input-field"
                />
              </Field>
              <Field label="Senha Temporária" icon={<Lock size={16} />}>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={e => setNewAdminPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="input-field"
                />
              </Field>
              <button
                type="button"
                onClick={handleCreateAdmin}
                disabled={creatingAdmin || !newAdminEmail || !newAdminPassword}
                className="w-full btn-primary bg-indigo-600 hover:bg-indigo-700 !py-2.5 text-sm"
              >
                {creatingAdmin ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
                Criar Novo Admin
              </button>
            </div>
          </Section>

          <Section
            icon={<ShieldCheck size={22} />}
            title="Minha Segurança"
            desc="Altere sua senha de acesso atual."
          >
            <div className="space-y-4">
              <Field label="Senha Atual" icon={<Lock size={16} />}>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Sua senha de login"
                  className="input-field"
                  required
                />
              </Field>
              <Field label="Nova Senha" icon={<Lock size={16} />}>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="input-field"
                  required
                />
              </Field>
              <Field label="Confirmar Nova Senha" icon={<ShieldCheck size={16} />}>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="input-field"
                  required
                />
              </Field>
              
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePasswordChange}
                  disabled={updatingPassword}
                  className="w-full btn-primary bg-indigo-600 hover:bg-indigo-700 !py-2.5 text-sm shadow-indigo-100 shadow-lg"
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Alterando senha...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Confirmar Troca de Senha
                    </>
                  )}
                </button>
              </div>
            </div>
          </Section>
        </div>

        {/* Mensagens de Feedback de Auth */}
        {authMessage && (
          <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            authMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {authMessage.type === 'success' ? <CheckCircle2 size={20} /> : <RotateCcw size={20} />}
            <p className="text-sm font-bold">{authMessage.text}</p>
            <button 
              onClick={() => setAuthMessage(null)}
              className="ml-auto text-xs font-black uppercase tracking-widest opacity-50 hover:opacity-100"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Cláusulas do Contrato */}
        <Section
          icon={<FileText size={22} />}
          title="Cláusulas Padrão do Contrato"
          desc="Estas cláusulas serão impressas automaticamente em cada novo contrato gerado."
        >
          <div className="space-y-3">
            {settings.contract_clauses.map((clause, idx) => (
              <div key={idx} className="flex gap-3 group animate-in slide-in-from-right-2 duration-300">
                <div className="mt-2 text-xs font-black text-slate-300 group-hover:text-primary-400 shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <input
                  type="text"
                  value={clause}
                  onChange={e => udpateClause(idx, e.target.value)}
                  className="input-field"
                  placeholder="Descreva a cláusula..."
                />
                <button
                  type="button"
                  onClick={() => removeClause(idx)}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addClause}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50/30 transition-all font-bold text-sm flex items-center justify-center gap-2 mt-4"
            >
              <PlusCircle size={18} />
              Adicionar Nova Cláusula
            </button>
          </div>
        </Section>

        {/* Action buttons */}
        <div className="sticky bottom-6 z-10">
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200 shadow-2xl flex flex-col sm:flex-row justify-between gap-3">
            <button
              type="button"
              onClick={fetchSettings}
              className="btn-secondary"
              disabled={loading || saving}
            >
              <RotateCcw size={18} />
              Descartar Alterações
            </button>
            <button 
              type="submit" 
              className="btn-primary sm:min-w-[240px] shadow-lg shadow-primary-500/30"
              disabled={loading || saving}
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salvar Todas as Configurações
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
