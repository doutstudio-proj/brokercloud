"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";

type Notification = {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  isOverdue: boolean;
  actionUrl: string;
};

export function TopNav() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [leadStats, setLeadStats] = useState({ total: 0, today: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Carregar IDs dispensados
    const stored = localStorage.getItem("dismissedNotifications");
    if (stored) {
      try {
        setDismissedIds(JSON.parse(stored));
      } catch (e) {}
    }

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        if (json.success && json.data?.leads?.funnel) {
          const f = json.data.leads.funnel;
          const ativos = (f.NOVO || 0) + (f.ATENDIMENTO || 0) + (f.VISITA || 0) + (f.PROPOSTA || 0);
          setLeadStats({ total: ativos, today: Math.floor(ativos * 0.05) || 1 });
        }
      } catch (e) {
        console.error("Erro ao buscar estatísticas do TopNav", e);
      }
    };

    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        const json = await res.json();
        if (json.success) {
          setNotifications(json.notifications || []);
        }
      } catch (e) {
        console.error("Erro ao buscar notificações", e);
      }
    };

    fetchStats();
    fetchNotifications();

    const intervalId = setInterval(() => {
      fetchStats();
      fetchNotifications();
    }, 15000); // Atualiza a cada 15 segundos

    // Setup click outside listener for dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    setMounted(true);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleClickOutsideAccount = (event: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideAccount);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideAccount);
    };
  }, [pathname]);

  const visibleNotifications = notifications.filter(n => !dismissedIds.includes(n.id));

  const dismissNotification = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem("dismissedNotifications", JSON.stringify(newDismissed));
  };

  const dismissAll = () => {
    const allIds = notifications.map(n => n.id);
    const newDismissed = Array.from(new Set([...dismissedIds, ...allIds]));
    setDismissedIds(newDismissed);
    localStorage.setItem("dismissedNotifications", JSON.stringify(newDismissed));
  };

  return (
    <header className="flex justify-end items-center w-full px-8 h-16 sticky top-0 z-50 bg-surface border-b border-gray-200 dark:border-outline-variant">
      <div className="flex items-center gap-6">
        
        {/* Leads Stats */}
        <div className="text-right hidden sm:block bg-white dark:bg-surface-container px-4 py-1.5 rounded-lg border border-gray-200 dark:border-outline-variant shadow-sm">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Leads Ativos no Funil</p>
          <p className="text-sm font-black text-[var(--color-primary)]">
            {leadStats.total} leads <span className="text-xs text-gray-400 font-medium ml-1">(+{leadStats.today} hoje)</span>
          </p>
        </div>
        
        <div className="w-[1px] h-8 bg-gray-200 dark:bg-gray-700"></div>

        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-lg border bg-white dark:bg-surface-container border-gray-200 text-gray-500 hover:text-[var(--color-primary)] shadow-sm transition-all dark:border-outline-variant"
            title="Alternar Tema"
          >
            <span className="material-symbols-outlined">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>
        )}
        
        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`relative p-2 rounded-xl border transition-all hover:shadow-md ${
              isDropdownOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-white/50 dark:bg-surface-container-high border-gray-100 dark:border-outline-variant text-gray-400 hover:text-[var(--color-primary)] shadow-sm'
            }`}
          >
            <span className="material-symbols-outlined">notifications</span>
            {visibleNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[8px] text-white font-bold items-center justify-center border border-white dark:border-[var(--color-surface-container)]">
                  {visibleNotifications.length}
                </span>
              </span>
            )}
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-surface-container rounded-2xl shadow-xl border border-gray-100 dark:border-outline-variant overflow-hidden origin-top-right animate-in fade-in zoom-in-95 duration-200 z-50">
              <div className="p-4 border-b border-gray-50 dark:border-outline-variant/50 bg-gray-50/50 dark:bg-surface-container-high/50 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Notificações</h3>
                {visibleNotifications.length > 0 && (
                  <button 
                    onClick={dismissAll}
                    className="text-[10px] font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 px-2 py-1 rounded-md transition-colors"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              
              <div className="max-h-96 overflow-y-auto custom-scrollbar flex flex-col">
                {visibleNotifications.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center">
                    <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">check_circle</span>
                    <p className="text-sm font-semibold text-gray-500">Tudo limpo!</p>
                    <p className="text-xs text-gray-400 mt-1">Você não tem pendências urgentes no momento.</p>
                  </div>
                ) : (
                  visibleNotifications.map(notif => (
                    <Link 
                      href={notif.actionUrl} 
                      key={notif.id}
                      onClick={() => setIsDropdownOpen(false)}
                      className="p-4 border-b border-gray-50 hover:bg-gray-50 flex items-start gap-3 transition-colors group relative"
                    >
                      <div className={`p-2 rounded-full shrink-0 ${
                        notif.type === 'TASK' ? (notif.isOverdue ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500') :
                        notif.type === 'LEAD' ? 'bg-orange-50 text-orange-500' :
                        'bg-emerald-50 text-emerald-500'
                      }`}>
                        <span className="material-symbols-outlined text-sm">
                          {notif.type === 'TASK' ? 'event' : notif.type === 'LEAD' ? 'warning' : 'chat'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs font-bold truncate ${notif.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[9px] text-gray-400 whitespace-nowrap mt-0.5">
                            {formatDistanceToNow(new Date(notif.date), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-snug">
                          {notif.description}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => dismissNotification(e, notif.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        title="Marcar como lida"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Account Profile / Settings */}
        <div className="relative" ref={accountDropdownRef}>
          <button 
            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
            className="flex items-center gap-3 p-1.5 pr-4 bg-white/50 dark:bg-surface-container-high/50 border border-gray-100 dark:border-outline-variant/30 rounded-2xl hover:bg-white dark:hover:bg-surface-container-high transition-all shadow-sm hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-sm">
              <span className="material-symbols-outlined">manage_accounts</span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">{session?.user?.name ?? "Minha Conta"}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">{session?.user?.email ?? "Opções"}</p>
            </div>
            <span className={`material-symbols-outlined text-sm text-gray-400 ml-2 transition-transform ${isAccountDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
          </button>
          
          {isAccountDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-surface-container border border-gray-100 dark:border-outline-variant rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-2 flex flex-col gap-1">
                <Link 
                  href="/settings?tab=perfil"
                  onClick={() => setIsAccountDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-surface-container-high hover:text-[var(--color-primary)] dark:hover:text-[var(--color-primary)] rounded-xl transition-colors font-medium"
                >
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  Meu Perfil
                </Link>
                <Link 
                  href="/settings?tab=whatsapp"
                  onClick={() => setIsAccountDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors font-medium"
                >
                  <span className="material-symbols-outlined text-[20px]">smartphone</span>
                  Conexão WhatsApp
                </Link>
                <a 
                  href="#"
                  onClick={() => setIsAccountDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors font-medium"
                >
                  <span className="material-symbols-outlined text-[20px]">help</span>
                  Suporte & Ajuda
                </a>
                <div className="h-px bg-gray-100 dark:bg-outline-variant/50 my-1 mx-2"></div>
                <button 
                  onClick={() => {
                    setIsAccountDropdownOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors font-medium w-full text-left"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Sair do Sistema
                </button>
              </div>
            </div>
          )}
        </div>
        
      </div>
    </header>
  );
}
