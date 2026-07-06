"use client";

import { useState, useEffect } from "react";

type CreateTaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultLeadId?: string | null;
  taskToEdit?: any | null;
};

export default function CreateTaskModal({ isOpen, onClose, onSuccess, defaultLeadId, taskToEdit }: CreateTaskModalProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [newTask, setNewTask] = useState({
    title: "",
    type: "CALL",
    date: new Date().toISOString().split('T')[0],
    time: "09:00",
    description: "",
    leadId: defaultLeadId || "",
    propertyId: ""
  });

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        const d = new Date(taskToEdit.dueDate);
        setNewTask({
          title: taskToEdit.title,
          type: taskToEdit.type,
          date: d.toISOString().split('T')[0],
          time: d.toISOString().substring(11, 16),
          description: taskToEdit.description || "",
          leadId: taskToEdit.leadId || "",
          propertyId: taskToEdit.propertyId || ""
        });
      } else {
        setNewTask({
          title: "",
          type: "CALL",
          date: new Date().toISOString().split('T')[0],
          time: "09:00",
          description: "",
          leadId: defaultLeadId || "",
          propertyId: ""
        });
      }
      fetch("/api/leads").then(r => r.json()).then(d => { if (d.success) setLeads(d.leads); });
      fetch("/api/properties/list").then(r => r.json()).then(d => { if (d.success) setProperties(d.properties); });
    }
  }, [isOpen, defaultLeadId, taskToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dueDate = new Date(`${newTask.date}T${newTask.time}:00`).toISOString();
      const payload = {
        title: newTask.title,
        type: newTask.type,
        dueDate,
        description: newTask.description,
        leadId: newTask.leadId || null,
        propertyId: newTask.propertyId || null
      };

      const url = taskToEdit ? `/api/tasks/${taskToEdit.id}` : "/api/tasks";
      const method = taskToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        alert("Erro ao salvar tarefa");
      }
    } catch (e) {
      alert("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-surface-container rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 dark:border-outline-variant bg-gray-50/50 dark:bg-surface-container-highest/50">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{taskToEdit ? "Editar Tarefa" : "Nova Tarefa"}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Título</label>
            <input 
              required
              type="text" 
              value={newTask.title}
              onChange={e => setNewTask({...newTask, title: e.target.value})}
              className="w-full border border-gray-200 dark:border-outline-variant bg-white dark:bg-[#030712] text-gray-800 dark:text-gray-100 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              placeholder="Ex: Ligar para confirmar proposta"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Data</label>
              <input 
                required
                type="date" 
                value={newTask.date}
                onChange={e => setNewTask({...newTask, date: e.target.value})}
                className="w-full border border-gray-200 dark:border-outline-variant bg-white dark:bg-[#030712] text-gray-800 dark:text-gray-100 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Hora</label>
              <input 
                required
                type="time" 
                value={newTask.time}
                onChange={e => setNewTask({...newTask, time: e.target.value})}
                className="w-full border border-gray-200 dark:border-outline-variant bg-white dark:bg-[#030712] text-gray-800 dark:text-gray-100 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Tipo de Tarefa</label>
            <select 
              value={newTask.type}
              onChange={e => setNewTask({...newTask, type: e.target.value})}
              className="w-full border border-gray-200 dark:border-outline-variant bg-white dark:bg-[#030712] text-gray-800 dark:text-gray-100 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
            >
              <option value="CALL">Ligação</option>
              <option value="VISIT">Visita ao Imóvel</option>
              <option value="MESSAGE">Mensagem / WhatsApp</option>
              <option value="MEETING">Reunião</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Vincular a um Lead (Opcional)</label>
            <select 
              value={newTask.leadId}
              onChange={e => setNewTask({...newTask, leadId: e.target.value})}
              className="w-full border border-gray-200 dark:border-outline-variant bg-white dark:bg-[#030712] text-gray-800 dark:text-gray-100 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[var(--color-primary)] outline-none disabled:bg-gray-100 dark:disabled:bg-surface-container-high disabled:text-gray-500"
              disabled={!!defaultLeadId}
            >
              <option value="">-- Nenhum Lead --</option>
              {leads.map(lead => (
                <option key={lead.id} value={lead.id}>{lead.name} ({lead.phone})</option>
              ))}
            </select>
            {!!defaultLeadId && (
              <p className="text-xs text-gray-400 mt-1">Lead pré-selecionado pelo contexto atual.</p>
            )}
          </div>

          {newTask.type === "VISIT" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Vincular a um Imóvel (Opcional)</label>
              <select 
                value={newTask.propertyId}
                onChange={e => setNewTask({...newTask, propertyId: e.target.value})}
                className="w-full border border-gray-200 dark:border-outline-variant bg-white dark:bg-[#030712] text-gray-800 dark:text-gray-100 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              >
                <option value="">-- Nenhum Imóvel --</option>
                {properties.map(prop => (
                  <option key={prop.id} value={prop.id}>{prop.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Anotações / Endereço</label>
            <textarea 
              value={newTask.description}
              onChange={e => setNewTask({...newTask, description: e.target.value})}
              rows={3}
              className="w-full border border-gray-200 dark:border-outline-variant bg-white dark:bg-[#030712] text-gray-800 dark:text-gray-100 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[var(--color-primary)] outline-none resize-none"
              placeholder="Detalhes adicionais..."
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-container-highest rounded-lg font-semibold transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Salvando..." : (taskToEdit ? "Salvar Alterações" : "Criar Tarefa")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
