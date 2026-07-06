"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

import { Search, Send, Paperclip, Home, UserCircle2, Loader2, Image as ImageIcon, FileText, Video, Mic, Square, Trash2, Wand2, Sparkles, Pencil, Check, Calendar as CalendarIcon, UserPlus, X } from "lucide-react";
import CreateTaskModal from "@/components/CreateTaskModal";
import { NewLeadModal } from "@/components/NewLeadModal";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

function getMessageDateGroup(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "d 'de' MMMM", { locale: ptBR });
}

type Lead = {
  id: string;
  name: string;
  phone: string;
  status: string;
  profilePictureUrl?: string;
  notes?: string | null;
  aiSummary?: string | null;
  messages: Message[];
  updatedAt: string;
  propertyId?: string;
  property?: { title: string; id: string; price: number; commission: number | null };
  unreadCount?: number;
  whatsappInstanceId?: string | null;
  whatsappInstance?: { id: string; name: string; status: string } | null;
};

type Message = {
  id: string;
  whatsappId: string;
  body: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  fromMe: boolean;
  timestamp: string;
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const initialLeadId = searchParams.get('leadId');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isMagicWriting, setIsMagicWriting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhoneValue, setEditPhoneValue] = useState("");
  const [isPromotingContact, setIsPromotingContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [propertiesList, setPropertiesList] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstanceFilter, setSelectedInstanceFilter] = useState("ALL");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px'; // Reseta para calcular a redução
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = scrollHeight + 'px';
    }
  }, [inputText]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cancelRecordingRef = useRef<boolean>(false);

  useEffect(() => {
    const fetchAllLeads = () => {
      fetch("/api/leads")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setLeads((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(data.leads)) {
                return data.leads;
              }
              return prev;
            });
            
            // Auto-select lead if in URL and not already selected
            if (initialLeadId && !selectedLead) {
              const leadToSelect = data.leads.find((l: Lead) => l.id === initialLeadId);
              if (leadToSelect) {
                setSelectedLead(leadToSelect);
                // Limpa a URL para não manter o ID (opcional)
                window.history.replaceState({}, '', '/chat');
              }
            }
          }
          setLoading(false);
        });
    };

    const markAsRead = async (id: string) => {
      fetch(`/api/leads/${id}/read`, { method: 'POST' });
      setLeads(prev => prev.map(l => l.id === id ? { ...l, unreadCount: 0 } : l));
    };
    
    fetchAllLeads();
    const interval = setInterval(fetchAllLeads, 4000); // Polling a cada 4s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch properties for the property selector
    fetch("/api/properties/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPropertiesList(data.properties);
        }
      });
      
    // Fetch whatsapp instances
    fetch("/api/evolution/instances")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.instances) {
          setInstances(data.instances);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Reset confirmation state when lead changes
    setIsConfirmingDelete(false);
    
    let interval: NodeJS.Timeout;
    if (selectedLead) {
      const fetchMsgs = () => {
        fetch(`/api/messages?leadId=${selectedLead.id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setMessages((prev) => {
                // Só atualiza se houver mensagens novas para evitar piscar a tela
                if (prev.length !== data.messages.length) {
                  setTimeout(scrollToBottom, 100);
                  return data.messages;
                }
                return prev;
              });
            }
          });
      };
      
      fetchMsgs(); // Fetch immediately
      interval = setInterval(fetchMsgs, 3000); // Poll every 3 seconds as fallback for Dev Mode SSE
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [selectedLead]);

  useEffect(() => {
    const eventSource = new EventSource("/api/stream");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "MESSAGES_UPSERT") {
          const newMsg = data.message;
          const lead = data.lead;

          setMessages((prev) => {
            if (prev.some((m) => m.whatsappId === newMsg.whatsappId)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();

          setLeads((prevLeads) => {
            const leadExists = prevLeads.some((l) => l.id === lead.id);
            if (!leadExists) {
              return [{ ...lead, messages: [newMsg] }, ...prevLeads];
            }
            const filtered = prevLeads.filter((l) => l.id !== lead.id);
            const updatedLead = prevLeads.find((l) => l.id === lead.id)!;
            updatedLead.messages = [newMsg];
            if (lead.profilePictureUrl) updatedLead.profilePictureUrl = lead.profilePictureUrl;
            return [updatedLead, ...filtered];
          });
        }
      } catch (err) {}
    };
    return () => eventSource.close();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const uploadMediaAndSend = async (base64Data: string, fileName: string, mimeType: string, type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT') => {
    try {
      // 1. Upload to S3
      const upRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          fileName,
          mimeType,
          folder: `chats/${selectedLead?.id || 'misc'}`,
        })
      });
      const upData = await upRes.json();
      if (!upData.success) throw new Error("Upload failed");

      // 2. Send via Evolution
      const sendRes = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead!.id,
          mediaUrl: upData.url,
          mediaType: type,
          text: "" // caption
        })
      });
      const sendData = await sendRes.json();
      if (sendData.success && sendData.message) {
        const sentMsg = sendData.message;
        setMessages(prev => {
          if (prev.some(m => m.whatsappId === sentMsg.whatsappId)) return prev;
          return [...prev, sentMsg];
        });
        setLeads(prev => {
          const idx = prev.findIndex(l => l.id === selectedLead!.id);
          if (idx === -1) return prev;
          const newLeads = [...prev];
          newLeads[idx] = { ...newLeads[idx], messages: [sentMsg] };
          return newLeads;
        });
        scrollToBottom();
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar mídia.");
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLead) return;
    setSending(true);

    let type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' = 'DOCUMENT';
    if (file.type.startsWith('image/')) type = 'IMAGE';
    else if (file.type.startsWith('video/')) type = 'VIDEO';
    else if (file.type.startsWith('audio/')) type = 'AUDIO';

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = (event.target?.result as string).split(',')[1];
      uploadMediaAndSend(base64Data, file.name, file.type, type);
    };
    reader.readAsDataURL(file);
    
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        if (cancelRecordingRef.current) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg' });
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = (e.target?.result as string).split(',')[1];
          setSending(true);
          uploadMediaAndSend(base64Data, `audio_${Date.now()}.ogg`, 'audio/ogg', 'AUDIO');
        };
        reader.readAsDataURL(audioBlob);
      };

      cancelRecordingRef.current = false;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      console.error("Erro ao acessar microfone", err);
      alert("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    cancelRecordingRef.current = true;
    stopRecording();
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedLead) return;
    setSending(true);
    
    const textToSend = inputText;
    setInputText("");

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          text: textToSend
        })
      });
      const data = await res.json();
      if (data.success && data.message) {
        const sentMsg = data.message;
        setMessages(prev => {
          if (prev.some(m => m.whatsappId === sentMsg.whatsappId)) return prev;
          return [...prev, sentMsg];
        });
        setLeads(prev => {
          const idx = prev.findIndex(l => l.id === selectedLead.id);
          if (idx === -1) return prev;
          const newLeads = [...prev];
          newLeads[idx] = { ...newLeads[idx], messages: [sentMsg] };
          return newLeads;
        });
        scrollToBottom();
      }
    } catch(e) {
      console.error(e);
      alert("Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const openPropertyModal = async () => {
    setIsPropertyModalOpen(true);
    setLoadingProperties(true);
    try {
      const res = await fetch("/api/properties/list");
      const data = await res.json();
      if (data.success) {
        setPropertiesList(data.properties);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleSendProperty = async (property: any, sendMode: 'summary' | 'pdf') => {
    if (!selectedLead) return;
    setIsPropertyModalOpen(false);
    setSending(true);

    const textCaption = `📍 *${property.title}*\n\n${property.description || ""}\n\n🛏️ Quartos: ${property.bedrooms}\n📐 Área Útil: ${property.area}m²\n💰 Preço: ${formatCurrency(property.price)}`;

    try {
      let finalMediaUrl = property.imageUrl || null;
      let finalMediaType = property.imageUrl ? 'IMAGE' : null;

      if (sendMode === 'pdf') {
        let hasGallery = false;
        try {
          if (property.galleryUrls) {
            const gallery = JSON.parse(property.galleryUrls);
            if (gallery && gallery.length > 0) hasGallery = true;
          }
        } catch(e) {}
        
        if (hasGallery) {
          // Gera PDF
          const pdfRes = await fetch('/api/properties/generate-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId: property.id })
          });

          if (pdfRes.status === 403) {
            alert("Geração de PDF é exclusiva do plano Premium. Faça o upgrade na página Inicial.");
            setSending(false);
            return;
          }

          const pdfData = await pdfRes.json();
          if (pdfData.success && pdfData.pdfUrl) {
            finalMediaUrl = pdfData.pdfUrl;
            finalMediaType = 'DOCUMENT';
          } else {
            alert("Erro ao gerar PDF: " + (pdfData.error || "Tente novamente"));
            setSending(false);
            return; // don't send summary if pdf failed
          }
        } else {
          alert("Este imóvel não possui fotos adicionais na galeria para gerar o PDF.");
          setSending(false);
          return;
        }
      }

      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          text: textCaption,
          mediaUrl: finalMediaUrl,
          mediaType: finalMediaType
        })
      });
      const data = await res.json();
      if (data.success && data.message) {
        const sentMsg = data.message;
        setMessages(prev => {
          if (prev.some(m => m.whatsappId === sentMsg.whatsappId)) return prev;
          return [...prev, sentMsg];
        });
        setLeads(prev => {
          const idx = prev.findIndex(l => l.id === selectedLead.id);
          if (idx === -1) return prev;
          const newLeads = [...prev];
          newLeads[idx] = { ...newLeads[idx], messages: [sentMsg] };
          return newLeads;
        });
        scrollToBottom();
      } else {
        alert("Erro ao enviar imóvel: " + (data.error || "Tente novamente"));
      }
    } catch (e) {
      alert("Erro ao enviar imóvel.");
    } finally {
      setSending(false);
    }
  };

  const handleMagicWrite = async () => {
    if (!inputText.trim()) return;
    setIsMagicWriting(true);
    try {
      const res = await fetch('/api/ai/magic-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      });
      const data = await res.json();
      
      if (res.status === 403) {
        alert("Funcionalidade exclusiva do plano Premium. Faça o upgrade na página Inicial.");
        setIsMagicWriting(false);
        return;
      }

      if (data.success && data.text) {
        setInputText(data.text);
      } else {
        alert("Erro na IA: " + (data.error || "Tente novamente"));
      }
    } catch (e) {
      alert("Erro ao conectar com a IA");
    } finally {
      setIsMagicWriting(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedLead) return;
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLead.id })
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setLeads(prev => {
          const newLeads = [...prev];
          const idx = newLeads.findIndex(l => l.id === selectedLead.id);
          if (idx !== -1) {
            newLeads[idx] = { ...newLeads[idx], aiSummary: data.summary };
          }
          return newLeads;
        });
        setSelectedLead(prev => prev ? { ...prev, aiSummary: data.summary } : null);
      } else {
        alert("Erro na IA: " + (data.error || "Tente novamente"));
      }
    } catch (e) {
      alert("Erro ao conectar com a IA");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleUpdateName = async () => {
    if (!selectedLead || !editNameValue.trim() || editNameValue === selectedLead.name) {
      setIsEditingName(false);
      return;
    }
    try {
      const res = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLead.id, data: { name: editNameValue } })
      });
      const data = await res.json();
      if (data.success) {
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, name: editNameValue } : l));
        setSelectedLead(prev => prev ? { ...prev, name: editNameValue } : null);
      } else {
        alert("Erro: " + data.error);
      }
    } catch(e) {
      alert("Erro de conexão");
    } finally {
      setIsEditingName(false);
    }
  };

  const handleUpdatePhone = async () => {
    if (!selectedLead || !editPhoneValue.trim()) {
      setIsEditingPhone(false);
      return;
    }
    let cleanPhone = editPhoneValue.replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone;
    }
    const oldPhone = selectedLead.phone;
    setSelectedLead({ ...selectedLead, phone: cleanPhone });
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, phone: cleanPhone } : l));
    
    try {
      const res = await fetch("/api/leads/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selectedLead.id, data: { phone: cleanPhone } })
      });
      const data = await res.json();
      if (!data.success) {
        setSelectedLead({ ...selectedLead, phone: oldPhone });
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, phone: oldPhone } : l));
        alert("Erro: " + data.error);
      }
    } catch(e) {
      setSelectedLead({ ...selectedLead, phone: oldPhone });
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, phone: oldPhone } : l));
      alert("Erro de conexão");
    } finally {
      setIsEditingPhone(false);
    }
  };

  const handleUpdateNotes = async (newNotes: string) => {
    if (!selectedLead) return;
    // O estado local selectedLead já é atualizado no onChange do textarea para UI imediata
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notes: newNotes } : l));
    
    try {
      await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLead.id, data: { notes: newNotes } })
      });
    } catch(e) {
      console.error("Erro ao salvar anotações", e);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedLead) return;
    
    // Otimisticamente atualiza a UI
    const oldStatus = selectedLead.status;
    setSelectedLead({ ...selectedLead, status: newStatus });
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: newStatus } : l));
    
    try {
      const res = await fetch("/api/leads/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selectedLead.id, data: { status: newStatus } })
      });
      const data = await res.json();
      if (!data.success) throw new Error();
    } catch {
      setSelectedLead({ ...selectedLead, status: oldStatus });
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: oldStatus } : l));
      alert("Erro ao atualizar o status.");
    }
  };

  const handlePromoteLead = async () => {
    if (!selectedLead) return;
    const oldLead = { ...selectedLead };
    
    const newName = editNameValue.trim() || selectedLead.name;
    let cleanPhone = editPhoneValue.replace(/\D/g, '') || selectedLead.phone;
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone;
    }
    
    const updatedLead = { ...selectedLead, name: newName, phone: cleanPhone, status: 'NOVO' };
    setSelectedLead(updatedLead);
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));
    
    try {
      const res = await fetch("/api/leads/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          leadId: selectedLead.id, 
          data: { name: newName, phone: cleanPhone, status: 'NOVO' } 
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error();
      }
    } catch {
      alert("Erro ao qualificar lead.");
      setSelectedLead(oldLead);
      setLeads(prev => prev.map(l => l.id === oldLead.id ? oldLead : l));
    } finally {
      setIsPromotingContact(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    
    try {
      const res = await fetch(`/api/leads/delete?leadId=${selectedLead.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
        setSelectedLead(null);
      } else {
        alert("Erro ao excluir lead: " + (data.error || "Tente novamente."));
      }
    } catch (e) {
      alert("Erro ao conectar com o servidor.");
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || lead.phone.includes(searchQuery);
    const matchesInstance = selectedInstanceFilter === "ALL" || 
      lead.whatsappInstance?.id === selectedInstanceFilter || 
      lead.whatsappInstanceId === selectedInstanceFilter;
    return matchesSearch && matchesInstance;
  });

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[var(--color-surface)] overflow-hidden font-sans">
      
      {/* SIDEBAR DO CHAT */}
      <div className="w-1/3 max-w-sm bg-white dark:bg-surface-container border-r border-gray-200 dark:border-outline-variant flex flex-col z-20">
        <div className="p-4 bg-transparent border-b border-white/30 dark:border-outline-variant flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <UserCircle2 className="w-8 h-8 text-[var(--color-primary)]" />
            <h2 className="font-semibold text-lg text-[var(--color-on-surface)] font-display-sm tracking-tight">Conversas</h2>
          </div>
        </div>

        <div className="p-3 bg-transparent border-b border-white/20 dark:border-outline-variant shrink-0 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-[var(--color-outline)]" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar contatos..." 
                className="w-full bg-[var(--color-surface-container-lowest)]/60 text-[var(--color-on-surface)] border border-white/50 dark:border-outline-variant rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
              />
            </div>
            <button 
              onClick={() => setIsNewLeadModalOpen(true)}
              className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 active:scale-95 transition-all flex-shrink-0 shadow-md flex items-center justify-center"
              title="Novo Lead"
            >
              <UserPlus size={18} />
            </button>
          </div>
          
          {instances.length > 1 && (
            <div className="px-1">
              <select
                value={selectedInstanceFilter}
                onChange={(e) => setSelectedInstanceFilter(e.target.value)}
                className="w-full bg-white/50 dark:bg-surface-container-highest border border-white/50 dark:border-outline-variant text-[var(--color-on-surface)] text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                <option value="ALL">Todas as Instâncias</option>
                {instances.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <p className="text-center text-gray-500 mt-10 text-sm">Nenhum contato encontrado.</p>
          ) : (
            filteredLeads.map((lead, index) => {
              const lastMsg = lead.messages?.[0];
              const isSelected = selectedLead?.id === lead.id;

              const currentTimestamp = lastMsg?.timestamp || lead.updatedAt;
              const currentGroup = getMessageDateGroup(currentTimestamp);
              
              const prevLead = index > 0 ? filteredLeads[index - 1] : null;
              const prevTimestamp = prevLead ? (prevLead.messages?.[0]?.timestamp || prevLead.updatedAt) : null;
              const prevGroup = prevTimestamp ? getMessageDateGroup(prevTimestamp) : null;
              
              const showGroupHeader = currentGroup !== prevGroup;

              return (
                <div key={lead.id}>
                  {showGroupHeader && (
                    <div className="px-5 py-2 mt-2 flex items-center gap-3">
                      <span className="text-[10px] font-bold text-emerald-700/70 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50/50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-100/50 dark:border-emerald-800/30">
                        {currentGroup}
                      </span>
                    </div>
                  )}
                  <div 
                    onClick={() => {
                      setSelectedLead(lead);
                      if (lead.unreadCount && lead.unreadCount > 0) {
                        fetch(`/api/leads/${lead.id}/read`, { method: 'POST' });
                        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, unreadCount: 0 } : l));
                      }
                    }}
                    className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-white/40 dark:hover:bg-surface-container-highest transition-colors border-b border-white/20 dark:border-outline-variant ${isSelected ? 'bg-[var(--color-primary-container)]/10 hover:bg-[var(--color-primary-container)]/15 dark:bg-[var(--color-primary-container)]/20 shadow-sm' : ''}`}
                  >
                  {lead.profilePictureUrl ? (
                    <img src={lead.profilePictureUrl} alt={lead.name} className="w-12 h-12 rounded-full object-cover shrink-0 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[var(--color-primary-container)] to-[var(--color-primary)] flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <div className="flex flex-col min-w-0">
                        <h2 className={`font-body-lg truncate pr-2 ${lead.unreadCount ? (lead.unreadCount > 0 ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-[var(--color-on-surface)]') : 'text-[var(--color-on-surface)]'}`}>{lead.name}</h2>
                        {instances.length > 1 && lead.whatsappInstance && (
                          <span className="text-[9px] font-medium text-[var(--color-primary)] bg-[var(--color-primary-container)]/30 border border-[var(--color-primary)]/20 px-1.5 py-0.5 rounded-md mt-0.5 self-start">
                            {lead.whatsappInstance.name}
                          </span>
                        )}
                      </div>
                      {lastMsg && (
                        <span className={`text-[11px] shrink-0 ${lead.unreadCount ? (lead.unreadCount > 0 ? 'text-green-600 font-bold' : 'text-gray-400') : 'text-gray-400'}`}>
                          {formatTime(lastMsg.timestamp)}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <div className="flex justify-between items-center gap-2">
                        <p className={`text-sm truncate flex items-center gap-1 min-w-0 ${lead.unreadCount ? (lead.unreadCount > 0 ? 'font-medium text-gray-700' : 'text-[var(--color-on-surface-variant)]') : 'text-[var(--color-on-surface-variant)]'}`}>
                          {lastMsg.fromMe && <span className="font-medium opacity-80">Você:</span>}
                          {lastMsg.mediaType === 'IMAGE' && <ImageIcon className="w-4 h-4 inline opacity-70 shrink-0" />}
                          {lastMsg.mediaType === 'AUDIO' && <Mic className="w-4 h-4 inline opacity-70 shrink-0" />}
                          {lastMsg.mediaType === 'VIDEO' && <Video className="w-4 h-4 inline opacity-70 shrink-0" />}
                          {lastMsg.mediaType === 'DOCUMENT' && <FileText className="w-4 h-4 inline opacity-70 shrink-0" />}
                          <span className="truncate">{lastMsg.body || (lastMsg.fromMe ? "Mídia enviada" : "Mídia recebida")}</span>
                        </p>
                        {lead.unreadCount ? (
                          lead.unreadCount > 0 ? (
                            <span className="flex items-center justify-center bg-green-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full shrink-0">
                              {lead.unreadCount}
                            </span>
                          ) : null
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col bg-transparent relative">
        <div className="absolute inset-0 pointer-events-none bg-[var(--color-surface)] z-0"></div>
        {/* Pattern subtil opcional se quiser manter textura */}
        <div className="absolute inset-0 opacity-5 pointer-events-none mix-blend-multiply z-0" style={{ backgroundImage: "url('https://static.whatsapp.net/rsrc.php/v3/yO/r/FsWUvqSpTKu.png')" }}></div>

        {selectedLead ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white dark:bg-surface-container border-b border-gray-200 dark:border-outline-variant flex items-center gap-3 shrink-0 shadow-sm z-10">
              {selectedLead.profilePictureUrl ? (
                <img src={selectedLead.profilePictureUrl} alt={selectedLead.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--color-primary-container)] to-[var(--color-primary)] flex items-center justify-center text-white font-bold shadow-sm">
                  {selectedLead.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="font-headline-md text-lg text-[var(--color-on-surface)] leading-tight">{selectedLead.name}</h2>
                <p className="text-xs text-[var(--color-on-surface-variant)]">{selectedLead.phone}</p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-3 z-10">
              {messages.map((msg, index) => {
                const isMe = msg.fromMe;
                const currentGroup = getMessageDateGroup(msg.timestamp);
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const prevGroup = prevMsg ? getMessageDateGroup(prevMsg.timestamp) : null;
                const showGroupHeader = currentGroup !== prevGroup;

                return (
                  <div key={msg.id || index} className="flex flex-col gap-3">
                    {showGroupHeader && (
                      <div className="flex justify-center my-2">
                        <span className="bg-white/80 dark:bg-surface-container-highest/80 backdrop-blur-md text-gray-500 dark:text-gray-400 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm border border-gray-100 dark:border-outline-variant uppercase tracking-widest">
                          {currentGroup}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] md:max-w-[70%] rounded-xl px-4 py-3 shadow-sm relative ${isMe ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-tr-sm' : 'bg-gray-100 dark:bg-surface-container-high border border-gray-200 dark:border-outline-variant text-[var(--color-on-surface)] rounded-tl-sm'}`}>
                      
                      {/* Mídias sem borda (Imagem e Vídeo) */}
                      {msg.mediaUrl && (msg.mediaType === 'IMAGE' || msg.mediaType === 'VIDEO') && (
                        <div className="mb-2 -mx-4 -mt-2 rounded-t-2xl overflow-hidden">
                          {msg.mediaType === 'IMAGE' && <img src={msg.mediaUrl} alt="Imagem" className="w-full h-auto object-cover max-h-80" />}
                          {msg.mediaType === 'VIDEO' && <video src={msg.mediaUrl} controls className="w-full h-auto max-h-80" />}
                        </div>
                      )}
                      
                      {/* Áudio */}
                      {msg.mediaUrl && msg.mediaType === 'AUDIO' && (
                        <div className="my-2 min-w-[200px] w-full">
                          <audio src={msg.mediaUrl} controls className="w-full opacity-90" />
                        </div>
                      )}

                      {/* Documento */}
                      {msg.mediaUrl && msg.mediaType === 'DOCUMENT' && (
                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-black/5 hover:bg-black/10 transition mb-2 rounded-lg">
                          <FileText className="w-6 h-6 text-red-500" />
                          <span className="text-sm font-medium">Baixar Documento</span>
                        </a>
                      )}
                      
                      {msg.body && (
                        <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{msg.body}</p>
                      )}
                      
                      <div className={`text-[11px] font-medium text-right mt-1 opacity-70 ${isMe ? 'text-[var(--color-on-primary)]' : 'text-[var(--color-on-surface-variant)]'}`}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-surface-container border-t border-gray-200 dark:border-outline-variant flex items-center gap-2 z-10 shrink-0 relative">
              {isRecording ? (
                <div className="flex-1 bg-[var(--color-surface-container-lowest)] rounded-full shadow-sm border border-white/80 overflow-hidden flex items-center justify-between p-2">
                  <div className="flex items-center gap-3 text-red-500 animate-pulse px-3">
                    <Mic className="w-5 h-5" />
                    <span className="font-semibold text-sm">{formatRecordingTime(recordingTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={cancelRecording}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                      title="Cancelar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => stopRecording()}
                      className="p-2 bg-green-500 text-white hover:bg-green-600 rounded-full transition shadow-sm"
                      title="Enviar"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition"
                    title="Anexar Arquivo"
                  >
                    <Paperclip className="w-6 h-6" />
                  </button>
                  <button onClick={openPropertyModal} className="p-2 text-gray-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]/20 rounded-full transition" title="Enviar Imóvel">
                    <Home className="w-6 h-6" />
                  </button>
                  
                  <div className="flex-1 bg-[var(--color-surface-container-lowest)] rounded-3xl shadow-sm border border-white/80 overflow-hidden flex items-center relative focus-within:ring-2 focus-within:ring-[var(--color-primary)] transition-all">
                    <textarea 
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Digite uma mensagem..." 
                      className="w-full max-h-40 min-h-[44px] py-3 px-5 resize-none focus:outline-none text-[var(--color-on-surface)] bg-transparent custom-scrollbar leading-relaxed"
                      rows={1}
                    />
                  </div>

                  {inputText.trim() && (
                    <button 
                      onClick={handleMagicWrite}
                      disabled={isMagicWriting || sending}
                      className="p-3 mr-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-sm flex items-center justify-center shrink-0"
                      title="Escrita Mágica (IA)"
                    >
                      {isMagicWriting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    </button>
                  )}

                  {inputText.trim() ? (
                    <button 
                      onClick={handleSendMessage}
                      disabled={sending}
                      className="p-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full hover:bg-[var(--color-primary-container)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-sm flex items-center justify-center shrink-0"
                    >
                      <Send className="w-5 h-5 ml-1" />
                    </button>
                  ) : (
                    <button 
                      onClick={startRecording}
                      disabled={sending}
                      className="p-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full hover:bg-[var(--color-primary-container)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-sm flex items-center justify-center shrink-0"
                      title="Gravar áudio"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10">
            <div className="w-24 h-24 bg-gray-100 dark:bg-surface-container-high border border-gray-200 dark:border-outline-variant rounded-full flex items-center justify-center shadow-sm mb-6">
              <UserCircle2 className="w-12 h-12 text-[var(--color-primary)]" />
            </div>
            <h2 className="font-display-lg text-[var(--color-on-surface)] mb-4 text-3xl">Brokerfield Chat</h2>
            <p className="font-body-md text-[var(--color-on-surface-variant)] max-w-md">Selecione um contato na barra lateral para visualizar o histórico e enviar mensagens integradas ao seu WhatsApp.</p>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR (LEAD INFO & AI SUMMARY) */}
      {selectedLead && (
        <div className="w-[320px] max-w-sm bg-white dark:bg-surface-container border-l border-gray-200 dark:border-outline-variant flex flex-col z-20 overflow-y-auto custom-scrollbar">
          
          {/* Header do Perfil */}
          <div className="p-6 border-b border-gray-200 dark:border-outline-variant flex flex-col items-center text-center">
            {selectedLead.profilePictureUrl ? (
              <img src={selectedLead.profilePictureUrl} alt={selectedLead.name} className="w-20 h-20 rounded-full object-cover shadow-sm mb-4 border-2 border-white dark:border-surface-container-high" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[var(--color-primary-container)] to-[var(--color-primary)] flex items-center justify-center text-white font-bold text-2xl shadow-sm mb-4 border-2 border-white dark:border-surface-container-high">
                {selectedLead.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Nome Editável */}
            {isEditingName ? (
              <div className="flex items-center justify-center gap-2 w-full mb-1">
                <input 
                  type="text" 
                  value={editNameValue} 
                  onChange={(e) => setEditNameValue(e.target.value)}
                  className="bg-gray-50 dark:bg-surface-container-high border border-gray-200 dark:border-outline-variant rounded px-2 py-1 text-sm font-semibold text-center w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                />
                <button onClick={handleUpdateName} className="p-1.5 text-green-600 hover:bg-green-50 rounded bg-white border border-gray-200 dark:border-outline-variant shadow-sm">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 group w-full">
                <h2 className="font-bold text-[var(--color-on-surface)] text-xl leading-tight truncate">{selectedLead.name}</h2>
                <button 
                  onClick={() => { setEditNameValue(selectedLead.name); setIsEditingName(true); }}
                  className="text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors shrink-0"
                  title="Editar Nome"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Telefone Editável */}
            {isEditingPhone ? (
               <div className="flex items-center justify-center gap-1 mt-2 w-full">
                  <input
                    type="text"
                    value={editPhoneValue}
                    onChange={(e) => setEditPhoneValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdatePhone();
                      if (e.key === 'Escape') setIsEditingPhone(false);
                    }}
                    className="bg-gray-50 dark:bg-surface-container-high border border-gray-200 dark:border-outline-variant text-sm rounded px-2 py-1 text-center w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button onClick={handleUpdatePhone} className="p-1 text-green-600"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setIsEditingPhone(false)} className="p-1 text-red-500"><X className="w-4 h-4" /></button>
               </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 group mt-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{selectedLead.phone}</p>
                <button 
                  onClick={() => { setEditPhoneValue(selectedLead.phone); setIsEditingPhone(true); }}
                  className="text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors shrink-0"
                  title="Editar Telefone"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          
          <div className="p-5 flex-1 flex flex-col gap-6">
            {/* Seção: Funil */}
            {selectedLead.status === 'CONTACT' ? (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Qualificação</h3>
                
                {isPromotingContact ? (
                  <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col gap-3 animate-in fade-in">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Confirme os dados do Lead</p>
                    
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Nome</label>
                      <input 
                        type="text" 
                        value={editNameValue} 
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="w-full bg-white dark:bg-surface-container-high border border-gray-200 dark:border-outline-variant rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Nome do Lead"
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Telefone</label>
                      <input 
                        type="text" 
                        value={editPhoneValue} 
                        onChange={(e) => setEditPhoneValue(e.target.value)}
                        className="w-full bg-white dark:bg-surface-container-high border border-gray-200 dark:border-outline-variant rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Ex: 5511999999999"
                      />
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => setIsPromotingContact(false)}
                        className="flex-1 py-2 bg-white dark:bg-surface-container border border-gray-200 dark:border-outline-variant text-gray-600 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handlePromoteLead}
                        className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 transition-colors shadow-sm"
                      >
                        Qualificar Lead
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      <UserPlus className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mb-3">
                      Este é um novo contato. Adicione ao funil para acompanhar a negociação.
                    </p>
                    <button 
                      onClick={() => {
                        setEditNameValue(selectedLead.name);
                        setEditPhoneValue(selectedLead.phone);
                        setIsPromotingContact(true);
                      }}
                      className="w-full py-2.5 bg-primary text-white rounded-lg hover:brightness-110 transition-all font-bold text-sm shadow-sm flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" /> Qualificar Contato
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Gestão de Funil</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Status Atual</label>
                      <select 
                        value={selectedLead.status}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-surface-container-high border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 text-sm font-semibold rounded-lg focus:ring-2 focus:ring-primary/50 block p-2.5 outline-none transition-all cursor-pointer"
                      >
                        <option value="NOVO">Novo</option>
                        <option value="ATENDIMENTO">Atendimento</option>
                        <option value="VISITA">Visita</option>
                        <option value="PROPOSTA">Proposta</option>
                        <option value="GANHO">Ganho (Vendido)</option>
                        <option value="PERDIDO">Perdido</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Imóvel de Interesse</label>
                      <select 
                        value={selectedLead.propertyId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedLead({ ...selectedLead, propertyId: val });
                          fetch('/api/leads/update', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ leadId: selectedLead.id, data: { propertyId: val } })
                          });
                          setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, propertyId: val } : l));
                        }}
                        className="w-full bg-gray-50 dark:bg-surface-container-high border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 text-sm font-semibold rounded-lg focus:ring-2 focus:ring-primary/50 block p-2.5 outline-none transition-all cursor-pointer"
                      >
                        <option value="">-- Não definido --</option>
                        {propertiesList.map(prop => (
                          <option key={prop.id} value={prop.id}>{prop.title}</option>
                        ))}
                      </select>
                    </div>
                    
                    <button 
                      onClick={() => setIsTaskModalOpen(true)}
                      className="w-full py-2 bg-white dark:bg-surface-container-high border border-gray-200 dark:border-outline-variant text-gray-700 dark:text-gray-300 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 transition-all font-semibold text-sm flex items-center justify-center gap-2 shadow-sm mt-2"
                    >
                      <CalendarIcon className="w-4 h-4" /> Agendar Tarefa
                    </button>
                  </div>
                </div>

                <hr className="border-gray-100 dark:border-outline-variant/50" />

                {/* AI Summary Box */}
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Inteligência Artificial
                  </h3>
                  
                  <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl p-4 flex flex-col">
                    {selectedLead.aiSummary ? (
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap mb-4">
                        {selectedLead.aiSummary}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">
                        Nenhum resumo gerado. A IA pode analisar o chat para extrair orçamento e preferências.
                      </p>
                    )}
                    
                    <button 
                      onClick={handleGenerateSummary}
                      disabled={isSummarizing}
                      className="w-full py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all disabled:opacity-50 font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      {isSummarizing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
                      ) : (
                        <><Wand2 className="w-4 h-4" /> {selectedLead.aiSummary ? "Atualizar Resumo" : "Gerar Resumo"}</>
                      )}
                    </button>
                  </div>
                </div>

                <hr className="border-gray-100 dark:border-outline-variant/50" />

                {/* Anotações Manuais */}
                <div className="flex flex-col">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Anotações Internas
                  </h3>
                  <textarea 
                    className="w-full bg-gray-50 dark:bg-surface-container-high border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 text-sm rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-transparent p-3 outline-none transition-colors resize-y min-h-[120px] custom-scrollbar shadow-inner placeholder-gray-400"
                    placeholder="Ex: Ligar amanhã de manhã. O cliente gostou do imóvel X..."
                    value={selectedLead.notes || ""}
                    onChange={(e) => setSelectedLead({ ...selectedLead, notes: e.target.value })}
                    onBlur={(e) => handleUpdateNotes(e.target.value)}
                  />
                </div>

                {/* Ações Perigosas */}
                <div className="mt-4 flex flex-col">
                  {isConfirmingDelete ? (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-3 flex flex-col gap-3 animate-in fade-in">
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium text-center">
                        Tem certeza? O histórico será apagado permanentemente.
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsConfirmingDelete(false)}
                          className="flex-1 py-1.5 bg-white dark:bg-surface-container border border-gray-200 dark:border-outline-variant text-gray-600 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-surface-container-high transition-colors"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={handleDeleteLead}
                          className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsConfirmingDelete(true)}
                      className="w-full py-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-xs font-semibold flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir Contato
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* PROPERTY SELECTION MODAL */}
      {isPropertyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-container w-full max-w-3xl max-h-[80vh] flex flex-col rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-outline-variant">
            <div className="p-4 border-b border-gray-200/50 dark:border-outline-variant flex justify-between items-center bg-white/50 dark:bg-surface-container-highest/50">
              <h2 className="font-headline-md text-xl text-[var(--color-on-surface)] flex items-center gap-2">
                <Home className="w-6 h-6 text-[var(--color-primary)]" />
                Selecione um Imóvel
              </h2>
              <button 
                onClick={() => setIsPropertyModalOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {loadingProperties ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
                </div>
              ) : propertiesList.length === 0 ? (
                <p className="text-center text-gray-500 mt-10">Nenhum imóvel cadastrado.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {propertiesList.map(prop => (
                    <div key={prop.id} className="bg-white dark:bg-surface-container-highest border border-gray-200 dark:border-outline-variant rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col">
                      <div className="h-32 w-full bg-gray-100 relative">
                        {prop.imageUrl ? (
                          <img src={prop.imageUrl} alt={prop.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                            <Home className="w-8 h-8 mb-1 opacity-50" />
                            <span className="text-xs font-medium">Sem foto</span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {prop.status === "AVAILABLE" ? "Disponível" : prop.status === "SOLD" ? "Vendido" : "Destaque"}
                        </div>
                      </div>
                      <div className="p-3 flex-1 flex flex-col">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-1 mb-1">{prop.title}</h3>
                        <p className="text-xs text-gray-500 mb-2 line-clamp-1">{prop.location}</p>
                        <p className="font-bold text-[var(--color-primary)] text-sm mb-3 mt-auto">
                          {formatCurrency(prop.price)}
                        </p>
                        <div className="flex flex-col gap-2 mt-auto">
                          <button 
                            onClick={() => handleSendProperty(prop, 'summary')}
                            className="w-full py-1.5 bg-gray-50 dark:bg-surface-container text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-container-high rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 border border-gray-200 dark:border-outline-variant"
                          >
                            <ImageIcon className="w-3 h-3" /> Enviar Resumo
                          </button>
                          
                          {(() => {
                            try {
                              if (prop.galleryUrls && JSON.parse(prop.galleryUrls).length > 0) {
                                return (
                                  <button 
                                    onClick={() => handleSendProperty(prop, 'pdf')}
                                    className="w-full py-1.5 bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] hover:bg-[var(--color-primary)] hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                                  >
                                    <FileText className="w-3 h-3" /> Enviar Apresentação (PDF)
                                  </button>
                                );
                              }
                            } catch(e) {}
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <NewLeadModal 
        isOpen={isNewLeadModalOpen} 
        onClose={() => setIsNewLeadModalOpen(false)}
        onSuccess={(newLead) => {
          setLeads(prev => [{ ...newLead, messages: [] }, ...prev]);
          setSelectedLead({ ...newLead, messages: [] });
        }}
      />

      {isTaskModalOpen && selectedLead && (
        <CreateTaskModal 
          isOpen={isTaskModalOpen} 
          onClose={() => setIsTaskModalOpen(false)} 
          onSuccess={() => {
            alert("Tarefa agendada com sucesso!");
          }}
          defaultLeadId={selectedLead.id}
        />
      )}
    </div>
  );
}
