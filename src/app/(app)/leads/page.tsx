"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, List, KanbanSquare, Phone, MapPin, Calendar, Check, MoreVertical, X, MessageSquare, ExternalLink, Sparkles, FileText, Calendar as CalendarIcon, UserPlus, Trash2, Pencil } from "lucide-react";
import CreateTaskModal from "@/components/CreateTaskModal";
import { NewLeadModal } from "@/components/NewLeadModal";

type Lead = {
  id: string;
  name: string;
  phone: string;
  status: string;
  profilePictureUrl?: string;
  notes?: string | null;
  aiSummary?: string | null;
  propertyId?: string | null;
  property?: { title: string; id: string; price?: number; commission?: number | null };
  createdAt: string;
};

const COLUMNS = [
  { id: "NOVO", title: "Novo", color: "border-blue-400", bg: "bg-blue-50/50 dark:bg-blue-500/10" },
  { id: "ATENDIMENTO", title: "Atendimento", color: "border-indigo-400", bg: "bg-indigo-50/50 dark:bg-indigo-500/10" },
  { id: "VISITA", title: "Visita", color: "border-amber-400", bg: "bg-amber-50/50 dark:bg-amber-500/10" },
  { id: "PROPOSTA", title: "Proposta", color: "border-orange-400", bg: "bg-orange-50/50 dark:bg-orange-500/10" },
  { id: "GANHO", title: "Ganho", color: "border-emerald-500", bg: "bg-emerald-50/50 dark:bg-emerald-500/10" },
  { id: "PERDIDO", title: "Perdido", color: "border-rose-400", bg: "bg-rose-50/50 dark:bg-rose-500/10" },
];

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"LISTA" | "KANBAN">("LISTA");
  
  useEffect(() => {
    if (searchParams.get('tab') === 'kanban') setActiveTab('KANBAN');
    else if (searchParams.get('tab') === 'lista') setActiveTab('LISTA');
  }, [searchParams]);

  // Para Modal de Perfil
  const [selectedLeadProfile, setSelectedLeadProfile] = useState<Lead | null>(null);
  const [isEditingPhoneProfile, setIsEditingPhoneProfile] = useState(false);
  const [editPhoneProfileValue, setEditPhoneProfileValue] = useState("");
  
  // Para Drag and Drop Nativo
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  
  // Automations State
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [commissionData, setCommissionData] = useState({ leadId: '', amount: '' });
  const [savingCommission, setSavingCommission] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    setIsConfirmingDelete(false);
  }, [selectedLeadProfile?.id]);

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (e) {
      console.error("Erro ao buscar leads", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetch("/api/properties/list").then(r => r.json()).then(d => { if (d.success) setProperties(d.properties); });
  }, []);

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    // Otimisticamente atualiza a UI
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    if (selectedLeadProfile?.id === leadId) {
      setSelectedLeadProfile(prev => prev ? { ...prev, status: newStatus } : null);
    }
    
    try {
      const res = await fetch("/api/leads/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, data: { status: newStatus } })
      });
      const data = await res.json();
      if (!data.success) {
        alert("Erro ao atualizar status do lead.");
        fetchLeads(); // Reverte em caso de erro
      }
    } catch (e) {
      alert("Erro ao conectar com o servidor.");
      fetchLeads(); // Reverte
    }
  };

  const handleUpdatePhoneProfile = async () => {
    if (!selectedLeadProfile || !editPhoneProfileValue.trim()) {
      setIsEditingPhoneProfile(false);
      return;
    }
    let cleanPhone = editPhoneProfileValue.replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone;
    }
    const oldPhone = selectedLeadProfile.phone;
    
    // Optimistic update
    setSelectedLeadProfile({ ...selectedLeadProfile, phone: cleanPhone });
    setLeads(prev => prev.map(l => l.id === selectedLeadProfile.id ? { ...l, phone: cleanPhone } : l));
    
    try {
      const res = await fetch("/api/leads/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selectedLeadProfile.id, data: { phone: cleanPhone } })
      });
      const data = await res.json();
      if (!data.success) {
        setSelectedLeadProfile({ ...selectedLeadProfile, phone: oldPhone });
        setLeads(prev => prev.map(l => l.id === selectedLeadProfile.id ? { ...l, phone: oldPhone } : l));
        alert("Erro ao atualizar o telefone.");
      }
    } catch (e) {
      setSelectedLeadProfile({ ...selectedLeadProfile, phone: oldPhone });
      setLeads(prev => prev.map(l => l.id === selectedLeadProfile.id ? { ...l, phone: oldPhone } : l));
      alert("Erro de conexão.");
    } finally {
      setIsEditingPhoneProfile(false);
    }
  };

  // Funções de Drag and Drop
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessário para permitir o drop
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedLeadId) {
      const lead = leads.find(l => l.id === draggedLeadId);
      if (lead && lead.status !== columnId) {
        // Automation 1: Smart Funnel - VISITA
        if (columnId === 'VISITA') {
          setSelectedLeadProfile(lead);
          setIsTaskModalOpen(true);
        }
        
        // Automation 2: Money Machine - GANHO
        if (columnId === 'GANHO') {
          // Calculate an estimated commission if there's a property (e.g. 5% of property price)
          let estimated = '';
          if (lead.property) {
            if (lead.property.commission) {
              estimated = lead.property.commission.toString();
            } else if (lead.property.price) {
              estimated = (lead.property.price * 0.05).toString();
            }
          }
          setCommissionData({ leadId: lead.id, amount: estimated });
          setIsCommissionModalOpen(true);
        }

        updateLeadStatus(draggedLeadId, columnId);
      }
      setDraggedLeadId(null);
    }
  };

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commissionData.amount) return;
    
    setSavingCommission(true);
    try {
      const lead = leads.find(l => l.id === commissionData.leadId);
      
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'INCOME',
          category: 'COMISSAO',
          amount: parseFloat(commissionData.amount),
          description: `Comissão Venda - ${lead?.name || 'Cliente'}`,
          date: new Date().toISOString().split('T')[0],
          propertyId: lead?.propertyId || null,
          status: 'PENDING'
        })
      });
      
      if (res.ok) {
        setIsCommissionModalOpen(false);
        // Toast or success message could go here
      } else {
        alert("Erro ao salvar comissão no financeiro.");
      }
    } catch (e) {
      alert("Erro de conexão ao salvar comissão.");
    } finally {
      setSavingCommission(false);
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.status !== 'CONTACT' && (
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      lead.phone.includes(searchQuery)
    )
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-80px)] bg-[var(--color-surface)] font-sans relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-primary)] opacity-[0.03] rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
      
      {/* HEADER */}
      <div className="px-8 py-6 z-10 shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-display-lg text-[var(--color-on-surface)] text-3xl tracking-tight mb-1">Gestão de Leads</h1>
              <p className="font-body-md text-[var(--color-on-surface-variant)]">Acompanhe seus contatos e acelere suas vendas.</p>
            </div>
            
            {/* Search replaced Tabs */}
            <div className="flex items-center gap-4">
              <div className="relative w-64 md:w-80">
                <Search className="w-5 h-5 absolute left-3 top-2.5 text-[var(--color-outline)]" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar contatos..." 
                  className="w-full bg-[var(--color-surface-container-lowest)]/80 text-[var(--color-on-surface)] border border-white/60 dark:border-white/10 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all shadow-sm"
                />
              </div>
              <button 
                onClick={() => setIsNewLeadModalOpen(true)}
                className="flex items-center gap-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] px-5 py-2.5 rounded-full hover:shadow-md transition-all text-sm font-medium whitespace-nowrap"
              >
                <UserPlus size={18} />
                Novo Lead
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden flex flex-col z-10 px-8 pb-8">
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
          </div>
        ) : (
          <>
            {/* ABA: LISTA (TABELA) */}
            {activeTab === "LISTA" && (
              <div className="flex-1 bg-white dark:bg-surface-container border border-gray-200 dark:border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-surface-container-high border-b border-gray-200 dark:border-outline-variant">
                        <th className="py-4 px-6 font-semibold text-[var(--color-on-surface-variant)] text-sm">Lead</th>
                        <th className="py-4 px-6 font-semibold text-[var(--color-on-surface-variant)] text-sm">Telefone</th>
                        <th className="py-4 px-6 font-semibold text-[var(--color-on-surface-variant)] text-sm">Status</th>
                        <th className="py-4 px-6 font-semibold text-[var(--color-on-surface-variant)] text-sm">Data</th>
                        <th className="py-4 px-6 font-semibold text-[var(--color-on-surface-variant)] text-sm">Anotações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-500 dark:text-gray-400">Nenhum lead encontrado.</td>
                        </tr>
                      ) : (
                        filteredLeads.map(lead => (
                          <tr key={lead.id} onClick={() => setSelectedLeadProfile(lead)} className="border-b border-gray-100 dark:border-outline-variant hover:bg-gray-50 dark:hover:bg-surface-container-high transition-colors cursor-pointer">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                {lead.profilePictureUrl ? (
                                  <img src={lead.profilePictureUrl} alt={lead.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--color-primary-container)] to-[var(--color-primary)] flex items-center justify-center text-white font-bold shadow-sm">
                                    {lead.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-semibold text-[var(--color-on-surface)]">{lead.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-sm text-[var(--color-on-surface-variant)]">{lead.phone}</td>
                            <td className="py-4 px-6">
                              <span className="inline-block px-3 py-1 bg-[var(--color-primary-container)]/10 text-[var(--color-primary-container)] font-semibold text-xs rounded-full uppercase tracking-wider">
                                {COLUMNS.find(c => c.id === lead.status)?.title || lead.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-sm text-[var(--color-on-surface-variant)]">
                              {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-4 px-6 text-sm text-[var(--color-on-surface-variant)] max-w-xs truncate">
                              {lead.notes || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA: KANBAN */}
            {activeTab === "KANBAN" && (
              <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                {COLUMNS.map(col => {
                  const columnLeads = filteredLeads.filter(l => l.status === col.id);
                  
                  return (
                      <div 
                        key={col.id} 
                        className="flex-1 min-w-[220px] max-w-[320px] bg-white dark:bg-surface-container border border-gray-200 dark:border-outline-variant rounded-xl flex flex-col overflow-hidden"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.id)}
                    >
                      {/* Column Header */}
                      <div className={`px-5 py-4 border-b-2 ${col.color} bg-gray-50 dark:bg-surface-container-highest flex items-center justify-between shrink-0`}>
                        <h3 className="font-headline-md text-[var(--color-on-surface)]">{col.title}</h3>
                        <span className="bg-black/5 text-[var(--color-on-surface-variant)] text-xs font-bold px-2 py-1 rounded-full">
                          {columnLeads.length}
                        </span>
                      </div>
                      
                      {/* Column Cards Area */}
                      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-[150px]">
                        {columnLeads.map(lead => (
                          <div 
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onClick={() => setSelectedLeadProfile(lead)}
                            className={`bg-white dark:bg-surface-container-highest rounded-xl p-4 shadow-sm border border-gray-100 dark:border-outline-variant cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative ${draggedLeadId === lead.id ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {lead.profilePictureUrl ? (
                                  <img src={lead.profilePictureUrl} alt={lead.name} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-primary-container)] to-[var(--color-primary)] flex items-center justify-center text-white font-bold text-xs">
                                    {lead.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 break-words line-clamp-1">{lead.name}</h4>
                              </div>
                              <MoreVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-3">
                              <Phone className="w-3.5 h-3.5" />
                              {lead.phone}
                            </div>
                            
                            {lead.property && (
                              <div className="mt-3 text-xs bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 p-2 rounded-lg border border-amber-100 dark:border-amber-500/30 font-semibold flex items-center gap-1.5 line-clamp-1">
                                <MapPin className="w-3.5 h-3.5" /> {lead.property.title}
                              </div>
                            )}

                            {lead.notes && (
                              <div className="mt-3 text-xs bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 p-2 rounded-lg border border-purple-100 dark:border-purple-500/30 line-clamp-2 leading-relaxed">
                                {lead.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL DE PERFIL */}
      {selectedLeadProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-container rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-outline-variant flex justify-between items-center bg-gray-50/50 dark:bg-surface-container-highest/50">
              <h2 className="font-headline-md text-xl text-gray-800 dark:text-gray-100">Perfil do Lead</h2>
              <button onClick={() => setSelectedLeadProfile(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-surface-container-highest rounded-full text-gray-500 dark:text-gray-400 transition-colors flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center gap-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {selectedLeadProfile.profilePictureUrl ? (
                <img src={selectedLeadProfile.profilePictureUrl} alt={selectedLeadProfile.name} className="w-24 h-24 rounded-full object-cover shadow-sm border-4 border-white shrink-0" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[var(--color-primary-container)] to-[var(--color-primary)] flex items-center justify-center text-white font-bold text-3xl shadow-sm border-4 border-white shrink-0">
                  {selectedLeadProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className="text-center">
                <h3 className="font-headline-md text-2xl text-gray-800 dark:text-gray-100 mb-1">{selectedLeadProfile.name}</h3>
                <div className="flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  {isEditingPhoneProfile ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={editPhoneProfileValue}
                        onChange={(e) => setEditPhoneProfileValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdatePhoneProfile();
                          if (e.key === 'Escape') setIsEditingPhoneProfile(false);
                        }}
                        className="w-32 bg-white dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 text-sm rounded focus:ring-1 focus:ring-[var(--color-primary)] outline-none px-2 py-1 text-center"
                        placeholder="Ex: 5511999999999"
                      />
                      <button 
                        onClick={() => setIsEditingPhoneProfile(false)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleUpdatePhoneProfile}
                        className="p-1 text-[var(--color-primary)] hover:text-blue-600 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setEditPhoneProfileValue(selectedLeadProfile.phone); setIsEditingPhoneProfile(true); }}>
                      <p className="text-gray-500 dark:text-gray-400">{selectedLeadProfile.phone}</p>
                      <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-all hover:text-[var(--color-primary)]" />
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full bg-gray-50 dark:bg-[#030712] rounded-xl p-4 mt-2 shrink-0 border border-gray-100 dark:border-outline-variant">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase font-semibold tracking-wider">Status no Funil</p>
                <select 
                  value={selectedLeadProfile.status}
                  onChange={(e) => updateLeadStatus(selectedLeadProfile.id, e.target.value)}
                  className="w-full bg-white dark:bg-surface-container-high border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 text-sm font-semibold rounded-lg focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block p-2.5 outline-none transition-colors hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
                >
                  <option value="NOVO">Novo</option>
                  <option value="ATENDIMENTO">Atendimento</option>
                  <option value="VISITA">Visita</option>
                  <option value="PROPOSTA">Proposta</option>
                  <option value="GANHO">Ganho</option>
                  <option value="PERDIDO">Perdido</option>
                </select>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-outline-variant">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase font-semibold tracking-wider">Imóvel de Interesse</p>
                  <select 
                    value={selectedLeadProfile.propertyId || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selectedProp = properties.find(p => p.id === val);
                      const propObj = selectedProp ? { title: selectedProp.title, id: selectedProp.id } : undefined;
                      
                      setSelectedLeadProfile({ ...selectedLeadProfile, propertyId: val, property: propObj });
                      setLeads(prev => prev.map(l => l.id === selectedLeadProfile.id ? { ...l, propertyId: val, property: propObj } : l));
                      
                      fetch('/api/leads/update', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leadId: selectedLeadProfile.id, data: { propertyId: val } })
                      });
                    }}
                    className="w-full bg-white dark:bg-surface-container-high border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 text-sm font-semibold rounded-lg focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block p-2.5 outline-none transition-colors hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
                  >
                    <option value="">-- Não definido --</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.title}</option>
                    ))}
                  </select>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-outline-variant">
                  <button 
                    onClick={() => setIsTaskModalOpen(true)}
                    className="w-full py-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <CalendarIcon className="w-4 h-4" /> Agendar Tarefa
                  </button>
                </div>
              </div>

              {selectedLeadProfile.aiSummary && (
                <div className="w-full bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-500/30 shrink-0">
                  <p className="text-xs text-purple-700 dark:text-purple-400 mb-2 uppercase font-semibold tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Resumo da IA
                  </p>
                  <p className="text-sm text-purple-900/80 dark:text-purple-200 whitespace-pre-wrap leading-relaxed font-body-md bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-white/60 dark:border-white/10">
                    {selectedLeadProfile.aiSummary}
                  </p>
                </div>
              )}

              {selectedLeadProfile.notes && (
                <div className="w-full bg-gray-50 dark:bg-[#030712] rounded-xl p-4 shrink-0 border border-gray-100 dark:border-outline-variant">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase font-semibold tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Anotações do Corretor
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-body-md">
                    {selectedLeadProfile.notes}
                  </p>
                </div>
              )}

              <div className="w-full flex gap-3 mt-4 shrink-0">
                <button 
                  onClick={() => router.push(`/chat?leadId=${selectedLeadProfile.id}`)}
                  className="flex-1 py-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[var(--color-primary-container)] transition-colors shadow-sm"
                >
                  <MessageSquare className="w-5 h-5" /> Chat Interno
                </button>
                <button 
                  onClick={() => window.open(`https://wa.me/55${selectedLeadProfile.phone.replace(/\D/g, '')}`, '_blank')}
                  className="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-5 h-5" /> Zap Externo
                </button>
              </div>

              <div className="w-full mt-2 pt-4 border-t border-gray-100 dark:border-outline-variant shrink-0">
                {isConfirmingDelete ? (
                  <div className="w-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium text-center">
                      Tem certeza? O histórico será apagado permanentemente.
                    </p>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsConfirmingDelete(false);
                        }}
                        className="flex-1 py-2 bg-white dark:bg-surface-container text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-surface-container-highest transition-colors border border-gray-200 dark:border-outline-variant"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            const res = await fetch(`/api/leads/delete?leadId=${selectedLeadProfile.id}`, { method: 'DELETE' });
                            const data = await res.json();
                            if (data.success) {
                              setLeads(prev => prev.filter(l => l.id !== selectedLeadProfile.id));
                              setSelectedLeadProfile(null);
                            } else {
                              alert("Erro ao excluir lead: " + (data.error || "Tente novamente."));
                            }
                          } catch (err) {
                            alert("Erro ao conectar com o servidor.");
                          }
                        }}
                        className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                      >
                        Sim, Apagar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsConfirmingDelete(true);
                    }}
                    className="w-full py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-all font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Excluir Lead
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <NewLeadModal 
        isOpen={isNewLeadModalOpen} 
        onClose={() => setIsNewLeadModalOpen(false)}
        onSuccess={(newLead) => {
          setLeads(prev => [newLead, ...prev]);
        }}
      />

      <CreateTaskModal 
          isOpen={isTaskModalOpen} 
          onClose={() => setIsTaskModalOpen(false)} 
          onSuccess={() => {
            alert("Tarefa agendada com sucesso!");
          }}
          defaultLeadId={selectedLeadProfile?.id}
        />

      {/* Commission Modal for "GANHO" Column */}
      {isCommissionModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-container w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-outline-variant flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/30">
              <div>
                <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-400">Parabéns pela Venda! 🎉</h2>
                <p className="text-sm text-emerald-600 dark:text-emerald-500 font-medium">Lead convertido com sucesso.</p>
              </div>
              <button onClick={() => setIsCommissionModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white bg-white/50 dark:bg-surface-container-highest p-2 flex items-center justify-center rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveCommission} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Comissão Recebida (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={commissionData.amount}
                  onChange={(e) => setCommissionData({...commissionData, amount: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant rounded-xl px-4 py-3 font-black text-emerald-700 dark:text-emerald-400 text-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-4 mt-2">
                <button type="button" onClick={() => setIsCommissionModalOpen(false)} className="flex-1 py-3.5 bg-gray-100 dark:bg-surface-container-highest dark:hover:bg-surface-container-highest/80 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                  Pular
                </button>
                <button type="submit" disabled={savingCommission} className="flex-1 py-3.5 rounded-xl font-bold text-white transition-colors shadow-lg bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 disabled:opacity-50">
                  {savingCommission ? 'Salvando...' : 'Registrar Dinheiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
