"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function NewLeadModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess?: (lead: any) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("NOVO");
  const [notes, setNotes] = useState("");
  const [whatsappInstanceId, setWhatsappInstanceId] = useState("");
  const [instances, setInstances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/evolution/instances")
        .then(res => res.json())
        .then(data => {
          if (data.success && data.instances) {
            setInstances(data.instances);
            if (data.instances.length > 0) {
              setWhatsappInstanceId(data.instances[0].id);
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      let finalPhone = phone.replace(/\D/g, '');
      if (finalPhone.length === 10 || finalPhone.length === 11) {
        finalPhone = '55' + finalPhone;
      }
      
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: finalPhone, status, notes, whatsappInstanceId: whatsappInstanceId || undefined })
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Erro ao criar lead");
        setIsLoading(false);
        return;
      }

      onSuccess?.(data.lead);
      setName("");
      setPhone("");
      setStatus("NOVO");
      setNotes("");
      setWhatsappInstanceId("");
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-surface-container w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-outline-variant flex items-center justify-between bg-gray-50 dark:bg-surface-container-highest">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Adicionar Novo Lead</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-container-highest rounded-full transition-colors flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nome do Lead *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 text-sm rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent p-2.5 outline-none transition-all"
              placeholder="Ex: João da Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Telefone / WhatsApp *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 text-sm rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent p-2.5 outline-none transition-all"
              placeholder="Ex: 551199999999"
            />
            <p className="text-xs text-orange-500 mt-1.5 flex items-center gap-1.5 font-medium">
              Aviso: Em algumas regiões (ex: DDD 62), adicione o número sem o nono dígito.
            </p>
            <p className="text-xs text-gray-500 mt-1">Apenas números, com DDD.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Status Inicial</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-white dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 text-sm rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent p-2.5 outline-none transition-all"
            >
              <option value="NOVO">Novo</option>
              <option value="ATENDIMENTO">Em Atendimento</option>
              <option value="VISITA">Visita Agendada</option>
              <option value="PROPOSTA">Proposta</option>
            </select>
          </div>

          {instances.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Canal de WhatsApp</label>
              <select
                value={whatsappInstanceId}
                onChange={(e) => setWhatsappInstanceId(e.target.value)}
                className="w-full bg-white dark:bg-[#030712] border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 text-sm rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent p-2.5 outline-none transition-all"
              >
                {instances.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Anotações Iniciais (Opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-gray-800 dark:text-gray-100 outline-none transition-all resize-none h-24"
              placeholder="Informações adicionais..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-container-highest rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-container)] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Salvando..." : "Salvar Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
