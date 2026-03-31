import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Client } from '../types';
import {
  Search,
  Edit2,
  Trash2,
  FileCheck,
  UserPlus,
  Mail,
  Phone,
  FileCode,
  MapPin,
  X,
  Save,
  Loader2,
  Upload,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5 flex-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    {children}
  </div>
);

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    cpf_cnpj: '',
    rg: '',
    birth_date: '',
    address: '',
    phone: '',
    email: '',
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (error) showToast('error', 'Erro ao carregar clientes.');
    if (data) setClients(data);
    setLoading(false);
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        cpf_cnpj: client.cpf_cnpj,
        rg: client.rg || '',
        birth_date: client.birth_date || '',
        address: client.address || '',
        phone: client.phone || '',
        email: client.email || '',
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', cpf_cnpj: '', rg: '', birth_date: '', address: '', phone: '', email: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: formData.name.trim(),
      cpf_cnpj: formData.cpf_cnpj.trim(),
      rg: formData.rg.trim() || null,
      birth_date: formData.birth_date || null,
      address: formData.address.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      created_at: new Date().toISOString(),
    };

    if (editingClient) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id);
      if (error) {
        showToast('error', `Erro ao atualizar: ${error.message}`);
      } else {
        showToast('success', 'Cliente atualizado com sucesso!');
        handleCloseModal();
        fetchClients();
      }
    } else {
      const { error } = await supabase.from('clients').insert([payload]);
      if (error) {
        showToast('error', `Erro ao cadastrar: ${error.message}`);
      } else {
        showToast('success', 'Cliente cadastrado com sucesso!');
        handleCloseModal();
        fetchClients();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      showToast('error', `Erro ao excluir: ${error.message}`);
    } else {
      showToast('success', 'Cliente excluído.');
      fetchClients();
    }
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf_cnpj.includes(search) ||
    (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-8 fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-semibold text-sm animate-in slide-in-from-top-2 duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Clientes</h2>
          <p className="text-slate-400 mt-2 font-medium">Gestão completa da base de locatários.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary w-full sm:w-auto shadow-xl shadow-primary-500/20 active:scale-95 transition-all">
          <UserPlus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="card !p-0 overflow-hidden shadow-2xl shadow-slate-200/50 border-slate-100">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Search size={18} /></span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por nome, CPF, CNPJ ou e-mail..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all placeholder:text-slate-300 text-sm font-medium shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Contato</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">Endereço</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="py-24 text-center"><Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto" /><p className="mt-4 text-slate-400 font-bold text-sm tracking-tight">Carregando seus clientes...</p></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="py-24 text-center text-slate-300 font-bold">Nenhum cliente encontrado.</td></tr>
              ) : filtered.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary-50 to-indigo-50 text-primary-600 flex items-center justify-center font-black shrink-0 shadow-sm group-hover:from-primary-600 group-hover:to-indigo-600 group-hover:text-white transition-all">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors tracking-tight">{client.name}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{client.cpf_cnpj}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 hidden md:table-cell">
                    <div className="space-y-1.5">
                      {client.phone && <p className="text-xs font-bold text-slate-600 flex items-center gap-2 bg-slate-100/50 w-fit px-2 py-1 rounded-lg"><Phone size={12} className="text-primary-500" />{client.phone}</p>}
                      {client.email && <p className="text-xs font-medium text-slate-400 flex items-center gap-2"><Mail size={12} className="text-slate-300" />{client.email}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-5 hidden lg:table-cell">
                    <p className="text-xs text-slate-500 max-w-[200px] truncate flex items-center gap-2 font-medium"><MapPin size={12} className="text-slate-300 shrink-0" />{client.address || '—'}</p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2 shrink-0">
                      <button onClick={() => handleOpenModal(client)} className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-white hover:shadow-md hover:scale-110 rounded-xl transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(client.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white hover:shadow-md hover:scale-110 rounded-xl transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Improved Responsiveness */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 transition-all duration-300">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-20 duration-500">
            {/* Header */}
            <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[40px] shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
                  {editingClient ? 'Editar Cliente' : 'Cadastrar Cliente'}
                </h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Preencha os dados abaixo</p>
              </div>
              <button onClick={handleCloseModal} className="p-3 bg-white hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 shadow-sm active:scale-90">
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 sm:p-10 space-y-10">
                {/* Dados pessoais */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary-500 shadow-lg shadow-primary-500/50" />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Informações Pessoais</h4>
                  </div>
                  <div className="space-y-5">
                    <Field label="Nome Completo (ou Razão Social) *">
                      <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder="Ex: João da Silva" />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="CPF ou CNPJ *">
                        <input type="text" required value={formData.cpf_cnpj} onChange={e => setFormData({ ...formData, cpf_cnpj: e.target.value })} className="input-field" placeholder="000.000.000-00" />
                      </Field>
                      <Field label="Identidade (RG)">
                        <input type="text" value={formData.rg} onChange={e => setFormData({ ...formData, rg: e.target.value })} className="input-field" placeholder="12.345.678-x" />
                      </Field>
                    </div>
                    <Field label="Data de Nascimento">
                      <input type="date" value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} className="input-field" />
                    </Field>
                  </div>
                </div>

                {/* Contato */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50" />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Canais de Contato</h4>
                  </div>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="WhatsApp / Telefone">
                        <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field" placeholder="(11) 99999-9999" />
                      </Field>
                      <Field label="E-mail Pessoal">
                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field" placeholder="exemplo@gmail.com" />
                      </Field>
                    </div>
                    <Field label="Endereço Residencial Completo">
                      <textarea rows={3} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="input-field resize-none p-4" placeholder="Rua, Número, Bairro, Cidade, Estado..." />
                    </Field>
                  </div>
                </div>

                {/* Documentos */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Documentação Digitalizada</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                    <div className="group border-2 border-dashed border-slate-200 p-6 rounded-[24px] text-center hover:border-primary-500 hover:bg-primary-50/30 transition-all cursor-pointer bg-slate-50/50">
                      <div className="h-12 w-12 rounded-2xl bg-white shadow-sm mx-auto mb-3 flex items-center justify-center text-primary-600"><Upload size={20} /></div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Upload CNH</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">PDF ou JPG/PNG até 5MB</p>
                    </div>
                    <div className="group border-2 border-dashed border-slate-200 p-6 rounded-[24px] text-center hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer bg-slate-50/50">
                      <div className="h-12 w-12 rounded-2xl bg-white shadow-sm mx-auto mb-3 flex items-center justify-center text-indigo-600"><FileCode size={20} /></div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Comprovante</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">Residência (Luz/Água)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 sm:p-10 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-4 bg-slate-50/30 shrink-0">
                <button type="button" onClick={handleCloseModal} className="btn-secondary w-full sm:w-auto h-14 sm:px-8 font-black uppercase text-xs tracking-widest border-none hover:bg-slate-200 transition-all">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto h-14 sm:px-10 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/30 active:scale-95 transition-all">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Cadastrar Cliente</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
