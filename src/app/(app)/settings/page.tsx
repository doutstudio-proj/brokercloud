"use client";

import { useState, useEffect } from "react";
import { User, Phone, DollarSign, Smartphone, QrCode, CheckCircle2, Loader2, AlertCircle, RefreshCcw, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";

type WhatsAppInstance = {
  id: string;
  name: string;
  instanceName: string;
  status: string;
  qrCode: string | null;
};

type Broker = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  monthlyGoal: number | null;
  planId: string;
  whatsappInstances: WhatsAppInstance[];
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"PERFIL" | "WHATSAPP">("PERFIL");
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'whatsapp') setActiveTab("WHATSAPP");
    else if (tab === 'perfil') setActiveTab("PERFIL");
  }, [searchParams]);

  const [broker, setBroker] = useState<Broker | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [monthlyGoal, setMonthlyGoal] = useState("");
  
  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // WhatsApp state
  const [loadingQrCodes, setLoadingQrCodes] = useState<Record<string, boolean>>({});
  const [deletingInstance, setDeletingInstance] = useState<string | null>(null);
  
  // New Instance Form
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [creatingInstanceLoading, setCreatingInstanceLoading] = useState(false);

  useEffect(() => {
    fetchBrokerData();
    const interval = setInterval(() => fetchBrokerData(true), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let evoInterval: NodeJS.Timeout;
    if (activeTab === 'WHATSAPP' && broker?.whatsappInstances?.length) {
      evoInterval = setInterval(fetchEvolutionStatuses, 4000);
    }
    return () => {
      if (evoInterval) clearInterval(evoInterval);
    };
  }, [activeTab, broker?.whatsappInstances?.length]);

  const fetchEvolutionStatuses = async () => {
    if (!broker?.whatsappInstances) return;
    
    // We poll status for each instance
    for (const instance of broker.whatsappInstances) {
      if (instance.status === 'CONNECTED') continue; // Optional: skip polling if already connected (though they could disconnect)
      
      try {
        const res = await fetch(`/api/evolution/status?instanceId=${instance.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.status) {
            setBroker(prev => {
              if (!prev) return prev;
              const updatedInstances = prev.whatsappInstances.map(inst => 
                inst.id === instance.id ? { ...inst, status: data.status, qrCode: data.status === 'CONNECTED' ? null : inst.qrCode } : inst
              );
              return { ...prev, whatsappInstances: updatedInstances };
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch evolution status for", instance.id, err);
      }
    }
  };

  const fetchBrokerData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/broker");
      const data = await res.json();
      if (data.success && data.broker) {
        setBroker(data.broker);
        setName(data.broker.name || "");
        setPhone(data.broker.phone || "");
        setMonthlyGoal(data.broker.monthlyGoal?.toString() || "");
      }
    } catch (e) {
      console.error("Erro ao carregar dados da conta:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/broker", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, monthlyGoal })
      });
      const data = await res.json();
      if (data.success) {
        setBroker(prev => prev ? { ...prev, ...data.broker } : data.broker);
        alert("Perfil salvo com sucesso!");
      } else {
        alert("Erro ao salvar: " + data.error);
      }
    } catch (e) {
      console.error("Erro ao salvar perfil:", e);
      alert("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setPasswordError("A nova senha deve ter no mínimo 8 caracteres (maiúscula, minúscula e número).");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("As novas senhas não coincidem.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      
      if (data.success) {
        setPasswordSuccess("Senha alterada com sucesso!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setTimeout(() => setIsPasswordModalOpen(false), 2000);
      } else {
        setPasswordError(data.error || "Erro ao alterar a senha.");
      }
    } catch (err) {
      setPasswordError("Erro de conexão.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const generateQrCode = async (instanceId: string) => {
    setLoadingQrCodes(prev => ({ ...prev, [instanceId]: true }));
    try {
      const res = await fetch(`/api/evolution/qrcode?instanceId=${instanceId}`);
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.base64) {
          setBroker(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              whatsappInstances: prev.whatsappInstances.map(inst => 
                inst.id === instanceId ? { ...inst, qrCode: data.data.base64, status: 'QR_READY' } : inst
              )
            };
          });
        } else if (data.data.connected) {
          alert("A instância já está conectada!");
          fetchBrokerData(true);
        }
      } else {
        alert("Erro ao gerar QR Code: " + (data.error || "Desconhecido"));
      }
    } catch (e) {
      console.error("Erro ao gerar QR Code:", e);
      alert("Erro de conexão.");
    } finally {
      setLoadingQrCodes(prev => ({ ...prev, [instanceId]: false }));
    }
  };

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingInstanceLoading(true);
    try {
      const res = await fetch("/api/evolution/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newInstanceName })
      });
      const data = await res.json();
      if (data.success) {
        setNewInstanceName("");
        setIsCreatingInstance(false);
        fetchBrokerData(true);
      } else {
        alert("Erro ao criar: " + data.error);
      }
    } catch (e) {
      console.error("Erro ao criar instância:", e);
      alert("Erro de conexão.");
    } finally {
      setCreatingInstanceLoading(false);
    }
  };

  const handleDeleteInstance = async (instanceId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conexão WhatsApp? Você perderá a sincronização atual.")) return;
    
    setDeletingInstance(instanceId);
    try {
      const res = await fetch(`/api/evolution/instances?id=${instanceId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchBrokerData(true);
      } else {
        alert("Erro ao excluir: " + data.error);
      }
    } catch (e) {
      console.error("Erro ao excluir instância:", e);
      alert("Erro de conexão.");
    } finally {
      setDeletingInstance(null);
    }
  };

  const handleDisconnectInstance = async (instanceId: string) => {
    if (!confirm("Tem certeza que deseja desconectar este WhatsApp? Você precisará ler o QR Code novamente para conectar.")) return;
    
    try {
      const res = await fetch('/api/evolution/logout', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId })
      });
      const data = await res.json();
      if (data.success) {
        fetchBrokerData(true);
      } else {
        alert("Erro ao desconectar: " + data.error);
      }
    } catch (e) {
      console.error("Erro ao desconectar instância:", e);
      alert("Erro de conexão.");
    }
  };

  const maxInstances = broker?.planId === "PREMIUM" ? 2 : 1;
  const currentInstancesCount = broker?.whatsappInstances?.length || 0;
  const canAddMoreInstances = currentInstancesCount < maxInstances;
  const hasAnyConnected = broker?.whatsappInstances?.some(inst => inst.status === "open" || inst.status === "CONNECTED");

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Minha Conta</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Gerencie suas informações pessoais e integrações de sistema.</p>
      </div>

      <div className="flex-1 bg-white dark:bg-surface-container border border-gray-100 dark:border-outline-variant shadow-sm rounded-2xl flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex px-8 border-b border-gray-100 dark:border-outline-variant bg-gray-50/50 dark:bg-surface-container-highest/50">
          <button
            onClick={() => setActiveTab("PERFIL")}
            className={`px-6 py-4 font-semibold text-sm transition-colors relative ${activeTab === "PERFIL" ? "text-[var(--color-primary)]" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
          >
            Perfil
            {activeTab === "PERFIL" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-primary)] rounded-t-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("WHATSAPP")}
            className={`px-6 py-4 font-semibold text-sm transition-colors relative flex items-center gap-2 ${activeTab === "WHATSAPP" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
          >
            WhatsApp
            {hasAnyConnected ? (
               <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ) : (
               <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            )}
            {activeTab === "WHATSAPP" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full"></div>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === "PERFIL" && (
                <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
                  {/* ... same profile form as before ... */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Nome Completo</label>
                      <div className="relative">
                        <User className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          value={name}
                          onChange={e => setName(e.target.value)}
                          required
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:bg-white dark:focus:bg-[#030712] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">E-mail</label>
                      <input 
                        type="email" 
                        value={broker?.email || ""}
                        disabled
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-surface-container-high border border-gray-200 dark:border-outline-variant text-gray-500 dark:text-gray-400 rounded-xl text-sm cursor-not-allowed"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Celular / WhatsApp</label>
                      <div className="relative">
                        <Phone className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="5511999999999"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:bg-white dark:focus:bg-[#030712] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Meta Mensal (R$)</label>
                      <div className="relative">
                        <DollarSign className="w-5 h-5 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input 
                          type="number" 
                          value={monthlyGoal}
                          onChange={e => setMonthlyGoal(e.target.value)}
                          placeholder="100000"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-400 focus:bg-white dark:focus:bg-[#030712] focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Sua meta de comissões para o dashboard de vendas.</p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-outline-variant flex items-center justify-between">
                    <button 
                      type="submit" 
                      disabled={saving}
                      className="px-8 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-lg shadow-[var(--color-primary)]/30 hover:bg-[var(--color-primary-container)] transition-all flex items-center gap-2 disabled:opacity-70"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {saving ? "Salvando..." : "Salvar Perfil"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPasswordModalOpen(true)}
                      className="px-6 py-3 bg-gray-100 dark:bg-surface-container-high text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-surface-container-highest transition-colors text-sm"
                    >
                      Alterar Senha
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "WHATSAPP" && (
                <div className="max-w-3xl mx-auto flex flex-col space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        Conexões WhatsApp
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Gerencie seus números de WhatsApp conectados ao Brokerfield. 
                        ({currentInstancesCount} de {maxInstances} permitidos)
                      </p>
                    </div>
                    
                    {canAddMoreInstances && !isCreatingInstance && (
                      <button 
                        onClick={() => setIsCreatingInstance(true)}
                        className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-bold rounded-xl hover:bg-[var(--color-primary-container)] transition-all flex items-center gap-2 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar WhatsApp
                      </button>
                    )}
                  </div>

                  {isCreatingInstance && (
                    <form onSubmit={handleCreateInstance} className="bg-gray-50 dark:bg-surface-container-highest border border-gray-200 dark:border-outline-variant rounded-2xl p-6">
                      <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Nova Conexão WhatsApp</h4>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <input 
                            type="text" 
                            value={newInstanceName}
                            onChange={e => setNewInstanceName(e.target.value)}
                            placeholder="Nome fantasia (ex: Pessoal, Atendimento 2)"
                            required
                            className="w-full px-4 py-2.5 bg-white dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => setIsCreatingInstance(false)}
                          className="px-4 py-2.5 bg-gray-200 dark:bg-surface-container text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-surface-container-high transition-colors"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit" 
                          disabled={creatingInstanceLoading}
                          className="px-6 py-2.5 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-container)] transition-all flex items-center gap-2 disabled:opacity-70 shadow-sm"
                        >
                          {creatingInstanceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Salvar
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {broker?.whatsappInstances?.map((instance) => {
                      const isConnected = instance.status === "open" || instance.status === "CONNECTED";
                      const isLoadingQr = loadingQrCodes[instance.id];
                      const isDeleting = deletingInstance === instance.id;

                      return (
                        <div key={instance.id} className="border border-gray-200 dark:border-outline-variant rounded-2xl bg-white dark:bg-surface-container-highest flex flex-col overflow-hidden shadow-sm">
                          {/* Header */}
                          <div className="p-4 border-b border-gray-100 dark:border-outline-variant flex items-center justify-between bg-gray-50/50 dark:bg-surface-container-highest">
                            <div>
                              <h4 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                {instance.name}
                              </h4>
                            </div>
                            <div>
                              {isConnected ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800/50">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                  </span>
                                  CONECTADO
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-[10px] font-bold border border-rose-200 dark:border-rose-800/50">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                  DESCONECTADO
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Body */}
                          <div className="p-4 flex-1 flex flex-col items-center justify-center min-h-[220px]">
                            {isConnected ? (
                              <div className="text-center w-full">
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-3">
                                  <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Instância pronta para uso.</p>
                                {(instance as any).connectedPhone && (
                                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-2 bg-gray-100 dark:bg-surface-container-high py-1 px-3 rounded-full inline-block">
                                    +{(instance as any).connectedPhone}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="w-full flex flex-col items-center">
                                {instance.qrCode ? (
                                  <div className="flex flex-col items-center w-full">
                                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 dark:border-white/20 mb-3">
                                      <img src={instance.qrCode} alt="WhatsApp QR Code" className="w-32 h-32" />
                                    </div>
                                    <button
                                      onClick={() => generateQrCode(instance.id)}
                                      disabled={isLoadingQr}
                                      className="px-3 py-1.5 w-full bg-gray-100 dark:bg-surface-container-high text-gray-700 dark:text-gray-200 text-xs font-bold rounded hover:bg-gray-200 dark:hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-1.5 shrink-0"
                                    >
                                      {isLoadingQr ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
                                      Atualizar QR Code
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-center w-full">
                                    <QrCode className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <button 
                                      onClick={() => generateQrCode(instance.id)}
                                      disabled={isLoadingQr}
                                      className="w-full py-2 bg-gray-900 dark:bg-gray-800 text-white font-bold text-xs rounded-lg hover:bg-gray-800 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
                                    >
                                      {isLoadingQr ? <Loader2 className="w-3 h-3 animate-spin" /> : <QrCode className="w-3 h-3" />}
                                      {isLoadingQr ? "Gerando..." : "Gerar QR Code"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Footer / Actions */}
                          <div className="p-3 bg-gray-50/50 dark:bg-surface-container-highest/30 border-t border-gray-100 dark:border-outline-variant flex justify-between">
                            {isConnected ? (
                              <button 
                                onClick={() => handleDisconnectInstance(instance.id)}
                                className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 font-bold flex items-center gap-1 transition-colors w-full justify-center"
                              >
                                Desconectar Instância
                              </button>
                            ) : <div></div>}
                          </div>

                        </div>
                      );
                    })}

                    {currentInstancesCount === 0 && !isCreatingInstance && (
                      <div className="col-span-1 md:col-span-2 py-10 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-outline-variant rounded-2xl bg-gray-50 dark:bg-surface-container-highest text-center">
                        <Smartphone className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                        <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-1">Nenhum WhatsApp conectado</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Adicione uma conexão para sincronizar suas mensagens.</p>
                        <button 
                          onClick={() => setIsCreatingInstance(true)}
                          className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-bold rounded-xl hover:bg-[var(--color-primary-container)] transition-all shadow-sm"
                        >
                          Adicionar WhatsApp
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-container-highest w-full max-w-md rounded-2xl p-6 shadow-xl relative">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Trocar Senha</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Senha Atual</label>
                <div className="relative">
                  <input 
                    type={showCurrentPassword ? "text" : "password"} 
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 pr-12 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-xl text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Nova Senha</label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    placeholder="Mín. 8 caracteres (A-z, 0-9)"
                    className="w-full px-4 py-2.5 pr-12 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-xl text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Confirmar Nova Senha</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 pr-12 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-xl text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {passwordError && <p className="text-red-500 text-sm font-medium bg-red-50 p-2 rounded-lg">{passwordError}</p>}
              {passwordSuccess && <p className="text-emerald-500 text-sm font-medium bg-emerald-50 p-2 rounded-lg">{passwordSuccess}</p>}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-outline-variant mt-6">
                <button 
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordError("");
                    setPasswordSuccess("");
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 dark:bg-surface-container dark:text-gray-200 rounded-xl font-bold text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={passwordLoading}
                  className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-xl font-bold text-sm flex items-center gap-2"
                >
                  {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
