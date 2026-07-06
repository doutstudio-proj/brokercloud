"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface SidebarProps {
  planId?: string;
  trialEndsAt?: string;
}

export function Sidebar({ planId = 'TRIAL', trialEndsAt }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/notifications");
        const json = await res.json();
        if (json.success) {
          const chatNotifs = json.notifications.filter((n: any) => n.type === 'MESSAGE');
          setUnreadChatCount(chatNotifs.length);
        }
      } catch (e) {
        // ignore
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <aside className="flex flex-col h-screen sticky left-0 top-0 p-4 gap-4 bg-surface border-r border-gray-200 dark:border-outline-variant w-64 shrink-0 z-50">
      <div className="flex items-center gap-3 px-2 mb-6 mt-2">
        <img src="/logo1.png" alt="Broker Logo" className="h-10 w-auto object-contain" />
        <div className="flex flex-col">
          <span className="font-display-lg text-xl font-black tracking-tight leading-none text-gray-800 dark:text-gray-100">Brokercloud</span>
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">CRM Imobiliário</span>
        </div>
      </div>
      
      <nav className="flex flex-col gap-1 flex-grow overflow-y-auto overflow-x-hidden pb-4 pr-2 custom-scrollbar">
        <Link href="/dashboard" className={`${pathname === '/dashboard' || pathname === '/' ? "bg-primary text-on-primary font-semibold shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container-high/50"} rounded-lg flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:translate-x-1`}>
          <span className="material-symbols-outlined">dashboard</span>
          <span className="font-label-sm text-label-sm">Dashboard</span>
        </Link>
        
        <Link href="/properties" className={`${pathname === '/properties' ? "bg-primary text-on-primary font-semibold shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container-high/50"} rounded-lg flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:translate-x-1`}>
          <span className="material-symbols-outlined">home_work</span>
          <span className="font-label-sm text-label-sm">Imóveis</span>
        </Link>

        {/* Grupo Gestão de Leads */}
        <div className="mt-5 mb-2 px-4">
          <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider opacity-70">Gestão de Leads</span>
        </div>
        
        <Link href="/leads?tab=lista" className={`${pathname === '/leads' && tab !== 'kanban' ? "bg-primary text-on-primary font-semibold shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container-high/50"} rounded-lg flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:translate-x-1`}>
          <span className="material-symbols-outlined">format_list_bulleted</span>
          <span className="font-label-sm text-label-sm">Leads</span>
        </Link>
        
        <Link href="/leads?tab=kanban" className={`${pathname === '/leads' && tab === 'kanban' ? "bg-primary text-on-primary font-semibold shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container-high/50"} rounded-lg flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:translate-x-1`}>
          <span className="material-symbols-outlined">view_kanban</span>
          <span className="font-label-sm text-label-sm">Funil de Vendas</span>
        </Link>
        
        <Link href="/chat" className={`${pathname === '/chat' ? "bg-primary text-on-primary font-semibold shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container-high/50"} rounded-lg flex items-center justify-between px-4 py-3 transition-all duration-300 hover:translate-x-1`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">chat</span>
            <span className="font-label-sm text-label-sm">Chat Interno</span>
          </div>
          {unreadChatCount > 0 && (
            <span className="flex items-center justify-center bg-green-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full shrink-0">
              {unreadChatCount}
            </span>
          )}
        </Link>

        {/* Grupo Ferramentas */}
        <div className="mt-5 mb-2 px-4">
          <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider opacity-70">Ferramentas</span>
        </div>
        
        <Link href="/calendar" className={`${pathname === '/calendar' ? "bg-primary text-on-primary font-semibold shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container-high/50"} rounded-lg flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:translate-x-1`}>
          <span className="material-symbols-outlined">calendar_today</span>
          <span className="font-label-sm text-label-sm">Agenda</span>
        </Link>
        

        
        <Link href="/finance" className={`${pathname === '/finance' ? "bg-primary text-on-primary font-semibold shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container-high/50"} rounded-lg flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:translate-x-1`}>
          <span className="material-symbols-outlined">payments</span>
          <span className="font-label-sm text-label-sm">Financeiro</span>
        </Link>
      </nav>
      
      <div className="mt-auto flex flex-col gap-2">
        {planId === 'PREMIUM' ? (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3.5 rounded-xl border border-amber-500/20 flex flex-col gap-1 mb-1 shadow-sm">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="material-symbols-outlined text-amber-600 text-[18px]">workspace_premium</span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">Plano Premium</span>
            </div>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-500/80 font-semibold leading-tight">Você tem acesso ilimitado a todos os recursos.</p>
          </div>
        ) : (
          <>
            <div className="bg-surface-container-high dark:bg-surface-container-highest p-3.5 rounded-xl border border-gray-200 dark:border-outline-variant flex flex-col gap-2 mb-1 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plano Atual</span>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">Trial</span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold leading-tight">
                {(() => {
                  if (!trialEndsAt) return "3 dias de teste grátis";
                  const end = new Date(trialEndsAt);
                  const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return diff > 0 ? `${diff} dias restantes` : "Teste expirado";
                })()}
              </p>
              <div className="w-full bg-gray-200 dark:bg-outline/30 rounded-full h-1.5 mt-1 overflow-hidden">
                <div 
                  className="bg-primary h-1.5 rounded-full" 
                  style={{ width: `${(() => {
                    if (!trialEndsAt) return 100;
                    const end = new Date(trialEndsAt);
                    const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const percent = Math.max(0, Math.min(100, (diff / 3) * 100));
                    return percent;
                  })()}%` }}
                ></div>
              </div>
            </div>

            <button 
              onClick={() => alert("Assinatura de plano em desenvolvimento.")}
              className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary font-semibold text-label-sm hover:opacity-90 transition-opacity shadow-sm"
            >
              Fazer Upgrade
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
