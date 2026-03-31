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
  Shield,
  LayoutGrid,
  Upload,
  Image as ImageIcon,
  Camera,
  Loader2,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  CircleCheck,
  Clock,
  Settings,
  Tag,
  Palette,
  Calendar,
  DollarSign
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
    photos_urls: [] as string[],
  });
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

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
        photos_urls: vehicle.photos_urls || [],
      });
      setNewPhotos([]);
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
        daily_rate: 0,
        photos_urls: [],
      });
      setNewPhotos([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
    setNewPhotos([]);
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (newPhotos.length === 0) return formData.photos_urls || [];
    
    const uploadedUrls = [...(formData.photos_urls || [])];
    
    for (const file of newPhotos) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `vehicles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicles')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading photo:', uploadError.message);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('vehicles')
        .getPublicUrl(filePath);
        
      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.daily_rate <= 0) {
      showToast('error', 'O valor da diária deve ser maior que zero.');
      return;
    }

    setSaving(true);
    setUploading(true);
    
    try {
      const photos_urls = await uploadPhotos();
      
      const payload = {
        plate: formData.plate.trim().toUpperCase(),
        renavam: formData.renavam.trim() || null,
        model: formData.model.trim(),
        year: formData.year,
        color: formData.color.trim() || null,
        category: formData.category || null,
        status: formData.status,
        daily_rate: parseFloat(formData.daily_rate.toString()),
        photos_urls,
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
    } catch (err: any) {
      showToast('error', `Erro durante o envio: ${err.message}`);
    } finally {
      setSaving(false);
      setUploading(false);
    }
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
    const config: Record<string, { text: string; icon: React.FC<{ size?: number }>; cls: string }> = {
      available:   { text: 'Disponível',    icon: CircleCheck, cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
      rented:      { text: 'Alugado',       icon: Clock,       cls: 'bg-blue-50 text-blue-600 border-blue-100' },
      maintenance: { text: 'Manutenção',    icon: Settings,    cls: 'bg-amber-50 text-amber-600 border-amber-100' },
      in_sale:     { text: 'Em Venda',      icon: Tag,         cls: 'bg-violet-50 text-violet-600 border-violet-100' },
    };
    const entry = config[status] ?? { text: status, icon: CircleCheck, cls: 'bg-slate-50 text-slate-500 border-slate-100' };
    const { text, icon: Icon, cls } = entry;
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
        {/* Grid Layout Cards */}
        <div className="p-4 bg-slate-50/30">
          {loading ? (
            <div className="py-24 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto" />
              <p className="mt-4 text-slate-400 font-bold text-sm tracking-tight">Carregando frota...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center text-slate-300 font-bold">Nenhum veículo encontrado.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((vehicle) => (
                <div key={vehicle.id} className="group bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 flex flex-col overflow-hidden">
                  {/* Image/Icon Header */}
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    {vehicle.photos_urls && vehicle.photos_urls.length > 0 ? (
                      <img 
                        src={vehicle.photos_urls[0]} 
                        alt={vehicle.model}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300">
                        {
                          vehicle.category?.toLowerCase() === 'moto' ? <Bike size={64} strokeWidth={1} /> :
                          ['caminhão', 'caminhonete', 'van/utilitário'].includes(vehicle.category?.toLowerCase() || '') ? <Truck size={64} strokeWidth={1} /> :
                          <Car size={64} strokeWidth={1} />
                        }
                        <p className="text-[10px] font-black uppercase mt-2 tracking-widest opacity-50">Sem Imagem</p>
                      </div>
                    )}
                    
                    {/* Status Floating */}
                    <div className="absolute top-4 right-4">
                      {statusBadge(vehicle.status)}
                    </div>
                    
                    {/* Category Label */}
                    <div className="absolute bottom-4 left-4">
                      <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm flex items-center gap-2">
                        <Tag size={12} />
                        {vehicle.category}
                      </span>
                    </div>
                  </div>

                  {/* Info Body */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="mb-4">
                      <h4 className="text-lg font-black text-slate-900 group-hover:text-primary-600 transition-colors truncate leading-tight">
                        {vehicle.model}
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1 flex items-center gap-1.5 focus-within:">
                        <Hash size={12} className="text-primary-400" />
                        {vehicle.plate}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-slate-50 p-2.5 rounded-2xl flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Ano</span>
                        <span className="text-xs font-bold text-slate-700">{vehicle.year}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-2xl flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Cor</span>
                        <span className="text-xs font-bold text-slate-700 truncate">{vehicle.color}</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Diária</p>
                        <p className="text-lg font-black text-primary-600">
                          <span className="text-xs mr-0.5">R$</span>
                          {Number(vehicle.daily_rate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleOpenModal(vehicle)}
                          className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all active:scale-90"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(vehicle)}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Mídia & Fotos</h4>
                  </div>
                  
                  {/* Photo Upload Section */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {/* Current Photos */}
                      {formData.photos_urls?.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-[24px] overflow-hidden group border border-slate-100">
                          <img src={url} className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => setFormData({ ...formData, photos_urls: formData.photos_urls?.filter((_, i) => i !== idx) || [] })}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      
                      {/* New Files to Upload */}
                      {newPhotos.map((file, idx) => (
                        <div key={idx} className="relative aspect-square rounded-[24px] border-2 border-dashed border-primary-200 bg-primary-50/30 overflow-hidden group">
                          <img src={URL.createObjectURL(file)} className="w-full h-full object-cover opacity-60" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Upload size={20} className="text-primary-500 animate-bounce" />
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setNewPhotos(newPhotos.filter((_, i) => i !== idx))}
                            className="absolute top-2 right-2 p-1.5 bg-slate-800 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}

                      {/* Add Button */}
                      {(formData.photos_urls?.length || 0) + newPhotos.length < 4 && (
                        <label className="aspect-square rounded-[24px] border-2 border-dashed border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group">
                          <input 
                            type="file" 
                            className="hidden" 
                            multiple 
                            accept="image/*"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setNewPhotos([...newPhotos, ...files]);
                            }}
                          />
                          <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary-100 group-hover:text-primary-600 transition-all">
                             <Camera size={20} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary-600">Adicionar</span>
                        </label>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-1">Máximo 4 fotos. Formatos suportados: JPG, PNG, WEBP.</p>
                  </div>

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
                <button type="submit" disabled={saving || uploading} className="btn-primary w-full sm:w-auto h-14 sm:px-10 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/30 active:scale-95 transition-all">
                  {saving || uploading ? (
                    <div className="flex items-center gap-2">
                       <Loader2 size={18} className="animate-spin" />
                       {uploading ? 'Enviando Fotos...' : 'Salvando...'}
                    </div>
                  ) : <><Save size={18} /> Salvar Veículo</>}
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
