"use client";

import { useEffect, useState, useRef } from "react";
import { Search, Plus, Home, MapPin, BedDouble, Scaling, Pencil, Trash2, X, UploadCloud, Loader2, Image as ImageIcon } from "lucide-react";

type Property = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  location: string | null;
  bedrooms: number;
  area: number;
  commission: number | null;
  imageUrl: string | null;
  galleryUrls?: string | null;
  videoUrl?: string | null;
  status: string;
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Property>>({});
  const [commissionPct, setCommissionPct] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const fetchProperties = async () => {
    try {
      const res = await fetch("/api/properties/list");
      const data = await res.json();
      if (data.success) {
        setProperties(data.properties);
      }
    } catch (error) {
      console.error("Erro ao buscar imóveis:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleOpenModal = (property?: Property) => {
    if (property) {
      setIsEditing(true);
      setFormData(property);
      setImagePreview(property.imageUrl || null);
      if (property.price && property.commission) {
        setCommissionPct(((property.commission / property.price) * 100).toFixed(2));
      } else {
        setCommissionPct("");
      }
      if (property.galleryUrls) {
        try { setGalleryPreviews(JSON.parse(property.galleryUrls)); } catch(e){}
      } else {
        setGalleryPreviews([]);
      }
    } else {
      setIsEditing(false);
      setFormData({ status: "AVAILABLE", bedrooms: 1, area: 50, price: 0 });
      setImagePreview(null);
      setGalleryPreviews([]);
      setCommissionPct("");
    }
    setImageFile(null);
    setGalleryFiles([]);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({});
    setImageFile(null);
    setImagePreview(null);
    setGalleryFiles([]);
    setGalleryPreviews([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setGalleryFiles(prev => [...prev, ...files]);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setGalleryPreviews(prev => [...prev, event.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };
  
  const removeGalleryPreview = (index: number) => {
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    if (formData.galleryUrls) {
      try {
        let existing = JSON.parse(formData.galleryUrls);
        if (index < existing.length) {
           existing.splice(index, 1);
           setFormData({...formData, galleryUrls: JSON.stringify(existing)});
        } else {
           const fileIdx = index - existing.length;
           setGalleryFiles(prev => prev.filter((_, i) => i !== fileIdx));
        }
      } catch(e) {}
    } else {
      setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = (event.target?.result as string).split(',')[1];
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data,
              fileName: file.name,
              mimeType: file.type,
              folder: `properties/${formData.id || 'new'}`,
            })
          });
          const data = await res.json();
          if (data.success) {
            resolve(data.url);
          } else {
            reject(new Error(data.error || 'Erro desconhecido ao enviar imagem.'));
          }
        } catch (e) {
          reject(new Error('Erro de conexão ao enviar imagem.'));
        }
      };
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.price) {
      alert("Preencha pelo menos o título e o preço.");
      return;
    }
    setSaving(true);
    try {
      let finalImageUrl = formData.imageUrl;

      if (imageFile) {
        try {
          const uploadedUrl = await uploadImage(imageFile);
          if (uploadedUrl) {
            finalImageUrl = uploadedUrl;
          }
        } catch (uploadErr: any) {
          alert(`Erro ao enviar imagem principal: ${uploadErr.message}`);
          setSaving(false);
          return;
        }
      }

      setIsUploadingGallery(true);
      let finalGalleryUrls: string[] = [];
      if (formData.galleryUrls) {
        try {
          finalGalleryUrls = JSON.parse(formData.galleryUrls);
        } catch (e) {
          console.error("Invalid galleryUrls format:", formData.galleryUrls);
        }
      }

      if (galleryFiles.length > 0) {
        for (const file of galleryFiles) {
          try {
            const uploadedUrl = await uploadImage(file);
            if (uploadedUrl) {
              finalGalleryUrls.push(uploadedUrl);
            }
          } catch (uploadErr: any) {
            alert(`Erro ao enviar imagem da galeria (${file.name}): ${uploadErr.message}`);
            // We continue with other images even if one fails, but we alerted the user
          }
        }
      }
      setIsUploadingGallery(false);

      const payload = {
        ...formData,
        imageUrl: finalImageUrl,
        galleryUrls: finalGalleryUrls.length > 0 ? JSON.stringify(finalGalleryUrls) : null
      };

      if (isEditing) {
        const res = await fetch("/api/properties/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: formData.id, data: payload })
        });
        const data = await res.json();
        if (data.success) {
          setProperties(prev => prev.map(p => p.id === formData.id ? data.property : p));
          handleCloseModal();
        } else {
          alert("Erro ao atualizar imóvel");
        }
      } else {
        const res = await fetch("/api/properties/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          setProperties(prev => [data.property, ...prev]);
          handleCloseModal();
        } else {
          alert("Erro ao criar imóvel");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este imóvel?")) return;
    try {
      const res = await fetch(`/api/properties/delete?propertyId=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setProperties(prev => prev.filter(p => p.id !== id));
      }
    } catch (e) {
      alert("Erro ao excluir.");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const filteredProperties = properties.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-80px)] bg-[var(--color-surface)] font-sans relative overflow-hidden overflow-y-auto custom-scrollbar">
      {/* Background Decorativo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-primary)] opacity-[0.03] rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
      
      {/* HEADER */}
      <div className="px-8 py-8 z-10 shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-display-lg text-[var(--color-on-surface)] text-3xl tracking-tight mb-1">Gestão de Imóveis</h1>
            <p className="font-body-md text-[var(--color-on-surface-variant)]">Cadastre e gerencie seu portfólio de imóveis.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-1">
            <div className="relative w-full sm:w-80">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-[var(--color-outline)]" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título ou localização..." 
                className="w-full bg-[var(--color-surface-container-lowest)]/80 text-[var(--color-on-surface)] border border-white/60 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all shadow-sm"
              />
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="w-full sm:w-auto px-6 py-2.5 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full font-semibold hover:bg-[var(--color-primary-container)] hover:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Novo Imóvel
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT (GRID) */}
      <div className="flex-1 px-8 pb-8 z-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="bg-white dark:bg-surface-container border border-gray-200 dark:border-outline-variant rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-surface-container-high rounded-full flex items-center justify-center mb-4">
              <Home className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-100 mb-2">Nenhum imóvel encontrado</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Você ainda não tem imóveis cadastrados ou a busca não retornou resultados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProperties.map(property => (
              <div key={property.id} className="bg-white dark:bg-surface-container overflow-hidden group hover:shadow-md transition-all duration-300 border border-gray-200 dark:border-outline-variant rounded-xl flex flex-col h-full">
                <div className="relative h-48 w-full bg-gray-200 dark:bg-surface-container-high overflow-hidden shrink-0">
                  {property.imageUrl ? (
                    <img src={property.imageUrl} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-12 h-12 opacity-50" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${property.status === 'AVAILABLE' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : property.status === 'SOLD' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                      {property.status === 'AVAILABLE' ? 'Disponível' : property.status === 'SOLD' ? 'Vendido' : 'Destaque'}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(property)} className="p-2 bg-white/90 dark:bg-surface-container-highest/90 rounded-full text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-surface-container-highest shadow-sm transition-colors flex items-center justify-center">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(property.id)} className="p-2 bg-white/90 dark:bg-surface-container-highest/90 rounded-full text-red-600 dark:text-red-400 hover:bg-white dark:hover:bg-surface-container-highest shadow-sm transition-colors flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-headline-md text-lg text-gray-900 dark:text-gray-100 mb-1 line-clamp-1" title={property.title}>{property.title}</h3>
                  <p className="text-2xl font-bold text-[var(--color-primary)] mb-3">{formatCurrency(property.price)}</p>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="line-clamp-1">{property.location || "Localização não informada"}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-outline-variant mt-auto">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <BedDouble className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{property.bedrooms}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <Scaling className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{property.area} m²</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-container rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-outline-variant flex justify-between items-center bg-gray-50/50 dark:bg-surface-container-highest/50 shrink-0">
              <h2 className="font-headline-md text-xl text-gray-800 dark:text-gray-100">
                {isEditing ? "Editar Imóvel" : "Novo Imóvel"}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-800 dark:hover:text-white p-1 rounded-full hover:bg-gray-100 dark:hover:bg-surface-container-highest transition-colors flex items-center justify-center">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Imagem (Coluna Inteira) */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Foto de Capa</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[var(--color-primary)] hover:bg-gray-50 transition-colors relative overflow-hidden group"
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                          <UploadCloud className="w-8 h-8 mb-2" />
                          <span className="font-medium">Trocar imagem</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm font-medium text-gray-600">Clique para selecionar uma foto</span>
                        <span className="text-xs text-gray-400 mt-1">JPG, PNG ou WEBP</span>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                </div>

                {/* Campos */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Título do Anúncio *</label>
                  <input 
                    type="text" 
                    value={formData.title || ""} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Ex: Apartamento 3 suítes no Jardins"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                  />
                </div>

                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Preço (R$) *</label>
                    <input 
                      type="number" 
                      value={formData.price || ""} 
                      onChange={e => {
                         const newPrice = Number(e.target.value);
                         const newCommission = commissionPct ? (newPrice * Number(commissionPct)) / 100 : formData.commission;
                         setFormData({...formData, price: newPrice, commission: newCommission})
                      }}
                      placeholder="Ex: 1500000"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Comissão (%)</label>
                      <input 
                        type="number" 
                        value={commissionPct} 
                        onChange={e => {
                          const pct = e.target.value;
                          setCommissionPct(pct);
                          if (pct && formData.price) {
                            setFormData({...formData, commission: (formData.price * Number(pct)) / 100});
                          } else if (!pct) {
                            setFormData({...formData, commission: null});
                          }
                        }}
                        placeholder="Ex: 5"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Comissão (R$)</label>
                      <input 
                        type="number" 
                        value={formData.commission || ""} 
                        onChange={e => {
                          const val = Number(e.target.value);
                          setFormData({...formData, commission: val});
                          if (val && formData.price) {
                            setCommissionPct(((val / formData.price) * 100).toFixed(2));
                          } else if (!val) {
                            setCommissionPct("");
                          }
                        }}
                        placeholder="Ex: 75000"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Endereço Completo</label>
                  <input 
                    type="text" 
                    value={formData.location || ""} 
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    placeholder="Ex: Avenida Paulista, 1000 - Bela Vista, São Paulo, SP"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Quartos</label>
                  <input 
                    type="number" 
                    value={formData.bedrooms || ""} 
                    onChange={e => setFormData({...formData, bedrooms: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Área Útil (m²)</label>
                  <input 
                    type="number" 
                    value={formData.area || ""} 
                    onChange={e => setFormData({...formData, area: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Status</label>
                  <select 
                    value={formData.status || "AVAILABLE"} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                  >
                    <option value="AVAILABLE">Disponível</option>
                    <option value="HIGHLIGHT">Destaque</option>
                    <option value="SOLD">Vendido</option>
                  </select>
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Descrição</label>
                  <textarea 
                    value={formData.description || ""} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Descreva os diferenciais do imóvel..."
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all resize-y min-h-[100px]"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Vídeo (Link do YouTube, Drive, etc)</label>
                  <input 
                    type="text" 
                    value={formData.videoUrl || ""} 
                    onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                    placeholder="Ex: https://youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                  />
                </div>

                <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Galeria de Fotos (Extras)</label>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {galleryPreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-outline-variant group">
                        <img src={preview} alt="Galeria" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeGalleryPreview(index)}
                          className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    {galleryPreviews.length < 5 && (
                      <div 
                        onClick={() => galleryInputRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-outline-variant flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-container)]/10 cursor-pointer transition-colors"
                      >
                        <Plus className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-medium text-center leading-tight">Adicionar</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    multiple
                    accept="image/*"
                    ref={galleryInputRef} 
                    onChange={handleGalleryFileChange} 
                    className="hidden" 
                  />
                  <p className="text-xs text-gray-500 mt-2">Você pode adicionar até 5 fotos extras para gerar a apresentação.</p>
                </div>

              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 dark:bg-surface-container-highest border-t border-gray-100 dark:border-outline-variant flex justify-end gap-3 shrink-0">
              <button 
                onClick={handleCloseModal}
                disabled={saving}
                className="px-5 py-2.5 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-surface-container-high transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || isUploadingGallery}
                className="px-6 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-lg hover:bg-[var(--color-primary-container)] shadow-sm transition-all flex items-center justify-center gap-2 min-w-[140px]"
              >
                {saving || isUploadingGallery ? <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</> : "Salvar Imóvel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
