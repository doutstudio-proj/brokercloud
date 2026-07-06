"use client";

import { Lock, ArrowRight, Loader2, Check } from "lucide-react";
import { useState } from "react";

export function LockScreen() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Erro ao iniciar checkout");
        setLoading(null);
      }
    } catch (e) {
      alert("Erro de conexão");
      setLoading(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 min-h-full p-6 text-center z-50 fixed inset-0 overflow-y-auto">
      <div className="max-w-4xl w-full my-12 flex flex-col items-center">
        <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
          <Lock size={40} />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">Tempo Esgotado</h2>
        <p className="text-blue-200 mb-12 text-lg max-w-2xl leading-relaxed">
          Seu período de testes de 3 dias chegou ao fim. Para continuar usando o Brokercloud, organizar seu WhatsApp e automatizar suas vendas, assine um de nossos planos.
        </p>

        <div className="grid md:grid-cols-2 gap-8 w-full text-left">
          {/* Plano Básico */}
          <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 flex flex-col">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Básico</h3>
              <p className="text-slate-400">Para corretores organizados.</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-black text-white">R$ 97</span>
              <span className="text-slate-400">/mês</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-3"><Check className="text-blue-400" size={18} /> <span className="text-slate-200">Até 100 leads / mês</span></li>
              <li className="flex items-center gap-3"><Check className="text-blue-400" size={18} /> <span className="text-slate-200">CRM em Kanban completo</span></li>
              <li className="flex items-center gap-3"><Check className="text-blue-400" size={18} /> <span className="text-slate-200">Integração 1 WhatsApp</span></li>
            </ul>
            <button 
              onClick={() => handleSubscribe("BASIC")}
              disabled={loading !== null}
              className="w-full bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-600 transition-all disabled:opacity-50"
            >
              {loading === "BASIC" ? <Loader2 className="animate-spin" /> : "Assinar Básico"}
            </button>
          </div>

          {/* Plano Premium */}
          <div className="bg-gradient-to-b from-blue-600 to-blue-800 rounded-3xl p-8 border border-blue-500 shadow-2xl flex flex-col transform md:-translate-y-4">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
              <p className="text-blue-200">Para os top producers.</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-black text-white">R$ 197</span>
              <span className="text-blue-200">/mês</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-3"><Check className="text-white" size={18} /> <span className="text-white font-medium">Leads Ilimitados</span></li>
              <li className="flex items-center gap-3"><Check className="text-white" size={18} /> <span className="text-white font-medium">Até 2 WhatsApps Simultâneos</span></li>
              <li className="flex items-center gap-3"><Check className="text-white" size={18} /> <span className="text-white font-medium">Magic Write (IA de persuasão)</span></li>
              <li className="flex items-center gap-3"><Check className="text-white" size={18} /> <span className="text-white font-medium">Geração de PDFs Mágicos</span></li>
            </ul>
            <button 
              onClick={() => handleSubscribe("PREMIUM")}
              disabled={loading !== null}
              className="w-full bg-white text-blue-900 font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-all shadow-lg disabled:opacity-50"
            >
              {loading === "PREMIUM" ? <Loader2 className="animate-spin" /> : "Assinar Premium"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
