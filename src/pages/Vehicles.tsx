import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Vehicle } from '../types';
import { 
  Car, 
  Bike,
  Truck,
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Filter,
  Hash,
  Palette,
  Tag,
  CircleCheck,
  AlertCircle,
  Clock,
  Settings,
  X,
  Save,
  Loader2,
  CheckCircle2,
  DollarSign,
  Calendar,
  Activity,
  Shield,
  LayoutGrid
} from 'lucide-react';

// Stable helper function to prevent focus loss during state updates
const renderField = (label: string, icon: React.ReactNode, children: React.ReactNode) => (
  <div className="space-y-1.5 w-full">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5 text-slate-400">
      {icon}
      {label}
    </label>
    <div className="relative group">
      {children}
    </div>
  </div>
);

const Vehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  const [formData, setFormData] = useState({
    plate: '',
    renavam: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    category: 'Carro',
    status: 'available' as Vehicle['status'],
    daily_rate: 0,
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
    if (error) showToast('error', 'Erro ao carregar veículos.');
    if (data) setVehicles(data);
    setLoading(false);
  };

  const handleOpenModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        plate: vehicle.plate,
        renavam: vehicle.renavam || '',
        model: vehicle.model,
        year: vehicle.year || new Date().getFullYear(),
        color: vehicle.color || '',
        category: vehicle.category || '',
        status: vehicle.status,
        daily_rate: vehicle.daily_rate || 0,
      });
    } else {
      setEditingVehicle(null);
      setFormData({ 
        plate: '', 
        renavam: '', 
        model: '', 
        year: new Date().getFullYear(), 
        color: '', 
        category: 'Carro', 
        status: 'available', 
        daily_rate: 0 
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.daily_rate <= 0) {
      showToast('error', 'O valor da diária deve ser maior que zero.');
      return;
    }

    setSaving(true);
    const payload = {
      plate: formData.plate.trim().toUpperCase(),
      renavam: formData.renavam.trim() || null,
      model: formData.model.trim(),
      year: formData.year,
      color: formData.color.trim() || null,
      category: formData.category || null,
      status: formData.status,
      daily_rate: parseFloat(formData.daily_rate.toString()),
    };

    if (editingVehicle) {
      const { error } = await supabase.from('vehicles').update(payload).eq('id', editingVehicle.id);
      if (error) {
        showToast('error', `Erro ao atualizar: ${error.message}`);
      } else {
        showToast('success', 'Veículo atualizado com sucesso!');
        handleCloseModal();
        fetchVehicles();
      }
    } else {
      const { error } = await supabase.from('vehicles').insert([payload]);
      if (error) {
        showToast('error', `Erro ao cadastrar: ${error.message}`);
      } else {
        showToast('success', 'Veículo cadastrado com sucesso!');
        handleCloseModal();
        fetchVehicles();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (!window.confirm(`Excluir o veículo "${vehicle.model} - ${vehicle.plate}"? Esta ação é irreversível.`)) return;
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicle.id);
    if (error) {
      showToast('error', `Erro ao excluir: ${error.message}`);
    } else {
      showToast('success', 'Veículo excluído com sucesso.');
      fetchVehicles();
    }
  };

  const statusBadge = (status: Vehicle['status']) => {
    const config = {
      available: { text: 'Disponível', icon: CircleCheck, cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
      rented: { text: 'Alugado', icon: Clock, cls: 'bg-blue-50 text-blue-600 border-blue-100' },
      maintenance: { text: 'Manutenção', icon: Settings, cls: 'bg-amber-50 text-amber-600 border-amber-100' },
    };
    const { text, icon: Icon, cls } = config[status];
    return (
      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${cls}`}>
        <Icon size={12} />
        {text}
      </span>
    );
  };

  const filtered = vehicles.filter(v => 
    v.model.toLowerCase().includes(search.toLowerCase()) || 
    v.plate.toLowerCase().includes(search.toLowerCase())
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Frota</h2>
          <p className="text-slate-400 mt-2 font-medium">Controle de veículos e disponibilidade.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary w-full sm:w-auto shadow-xl shadow-primary-500/20 active:scale-95 transition-all">
          <Plus size={18} />
          Novo Veículo
        </button>
      </div>

      {/* Filters & Search */}
      <div className="card !p-0 overflow-hidden shadow-2xl shadow-slate-200/50 border-slate-100">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Search size={18} /></span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por modelo ou placa..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all placeholder:text-slate-300 text-sm font-medium shadow-sm"
            />
          </div>
          <button className="flex items-center justify-center gap-2 p-3 px-6 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm shadow-sm">
            <Filter size={18} />
            Categorias
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Veículo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Especificações</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Diária</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="py-24 text-center"><Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto" /><p className="mt-4 text-slate-400 font-bold text-sm tracking-tight">Carregando frota...</p></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-24 text-center text-slate-300 font-bold">Nenhum veículo encontrado.</td></tr>
              ) : filtered.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary-50 to-indigo-50 text-primary-600 flex items-center justify-center font-black shrink-0 shadow-sm group-hover:from-primary-600 group-hover:to-indigo-600 group-hover:text-white transition-all">
                        {
                          vehicle.category?.toLowerCase() === 'moto' ? <Bike size={22} /> :
                          ['caminhão', 'caminhonete', 'van/utilitário'].includes(vehicle.category?.toLowerCase() || '') ? <Truck size={22} /> :
                          ['máquina', 'equipamento'].includes(vehicle.category?.toLowerCase() || '') ? <Settings size={22} /> :
                          <Car size={22} />
                        }
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors tracking-tight">{vehicle.model}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{vehicle.plate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 hidden md:table-cell">
                    <div className="flex flex-wrap gap-2">
                       <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/80 text-slate-600 rounded-lg text-[10px] font-black uppercase"><Tag size={12} /> {vehicle.category}</span>
                       <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/80 text-slate-600 rounded-lg text-[10px] font-black uppercase"><Hash size={12} /> {vehicle.year}</span>
                       <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/80 text-slate-600 rounded-lg text-[10px] font-black uppercase"><Palette size={12} /> {vehicle.color}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 hidden lg:table-cell">
                    {statusBadge(vehicle.status)}
                  </td>
                  <td className="px-6 py-5 text-right font-black text-slate-900 text-sm">
                    R$ {Number(vehicle.daily_rate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2 shrink-0">
                      <button onClick={() => handleOpenModal(vehicle)} className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-white hover:shadow-md hover:scale-110 rounded-xl transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(vehicle)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white hover:shadow-md hover:scale-110 rounded-xl transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Improved Responsiveness & Categories */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 transition-all duration-300">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-20 duration-500">
            {/* Header */}
            <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[40px] shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
                  {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
                </h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Dados técnicos da unidade</p>
              </div>
              <button onClick={handleCloseModal} className="p-3 bg-white hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 shadow-sm active:scale-90">
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 sm:p-10 space-y-10">
                {/* Dados principais */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="h-2 w-2 rounded-full bg-primary-500 shadow-lg shadow-primary-500/50" />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Identificação</h4>
                  </div>
                  <div className="space-y-5">
                    {renderField("Modelo e Versão *", <Car size={14} />, 
                      <input type="text" required value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className="input-field" placeholder="Ex: VW Gol 1.0 MPI" />
                    )}
                    <div className="grid grid-cols-2 gap-5">
                      {renderField("Placa *", <Hash size={14} />, 
                        <input type="text" required value={formData.plate} onChange={e => setFormData({ ...formData, plate: e.target.value.toUpperCase() })} className="input-field font-mono font-bold" placeholder="ABC-1234" maxLength={8} />
                      )}
                      {renderField("RENAVAM", <Shield size={14} />, 
                        <input type="text" value={formData.renavam} onChange={e => setFormData({ ...formData, renavam: e.target.value })} className="input-field font-mono" placeholder="00000000000" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Especificações */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50" />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Especificações & Categoria</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {renderField("Categoria do Veículo", <LayoutGrid size={14} />, 
                      <select 
                        value={formData.category} 
                        onChange={e => setFormData({ ...formData, category: e.target.value })} 
                        className="input-field font-bold cursor-pointer"
                      >
                        <option value="Carro">🚗 Carro</option>
                        <option value="Moto">🏍️ Moto</option>
                        <option value="Caminhão"> Caminhão</option>
                        <option value="Caminhonete">🛻 Caminhonete</option>
                        <option value="Máquina">🚜 Máquina</option>
                        <option value="Equipamento">⚙️ Equipamento</option>
                        <option value="Van/Utilitário">🚐 Van/Utilitário</option>
                        <option value="Outros">🔘 Outros</option>
                      </select>
                    )}
                    {renderField("Cor Predominante", <Palette size={14} />, 
                      <input 
                        type="text" 
                        value={formData.color} 
                        onChange={e => setFormData({ ...formData, color: e.target.value })} 
                        className="input-field" 
                        placeholder="Ex: Branco, Preto, Prata" 
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {renderField("Ano de Fabricação", <Calendar size={14} />, 
                      <input 
                        type="number" 
                        required 
                        value={formData.year} 
                        onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })} 
                        className="input-field" 
                        min="1950" 
                        max={new Date().getFullYear() + 1} 
                      />
                    )}
                    {renderField("Valor da Diária (R$) *", <DollarSign size={14} />, 
                      <input 
                        type="number" 
                        step="0.01" 
                        required 
                        value={formData.daily_rate} 
                        onChange={e => setFormData({ ...formData, daily_rate: parseFloat(e.target.value) || 0 })} 
                        className="input-field font-black text-primary-600 focus:bg-primary-50 px-4" 
                        min="0" 
                      />
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-6">
                   <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Condição Atual</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {['available', 'rented', 'maintenance'].map((s) => (
                       <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: s as Vehicle['status'] })}
                        className={`p-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all group ${
                          formData.status === s 
                          ? 'bg-primary-50 border-primary-500' 
                          : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        {s === 'available' && <CircleCheck size={20} className={formData.status === s ? 'text-primary-600' : 'text-slate-400'} />}
                        {s === 'rented' && <Clock size={20} className={formData.status === s ? 'text-primary-600' : 'text-slate-400'} />}
                        {s === 'maintenance' && <Settings size={20} className={formData.status === s ? 'text-primary-600' : 'text-slate-400'} />}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${formData.status === s ? 'text-primary-600' : 'text-slate-500'}`}>
                          {s === 'available' ? 'Disponível' : s === 'rented' ? 'Alugado' : 'Manutenção'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 sm:p-10 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-4 bg-slate-50/30 shrink-0">
                <button type="button" onClick={handleCloseModal} className="btn-secondary w-full sm:w-auto h-14 sm:px-8 font-black uppercase text-xs tracking-widest border-none hover:bg-slate-200 transition-all">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto h-14 sm:px-10 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/30 active:scale-95 transition-all">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Salvar Veículo</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicles;
