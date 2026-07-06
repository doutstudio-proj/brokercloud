"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { Sparkles, DollarSign, Target, TrendingUp, AlertCircle, Calendar, MessageSquare, Phone, Flame, ArrowRight, CheckCircle2, Circle, Home, User } from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (loading) {
    return (
      <div className="p-12 h-full flex flex-col items-center justify-center text-gray-400">
        <div className="w-16 h-16 border-4 border-gray-100 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="animate-pulse font-medium">Carregando painel principal...</p>
      </div>
    );
  }

  if (!data) return null;

  const { finance, leads, properties, tasks } = data;
  const progressPercent = Math.min(100, Math.round((finance.realizedIncome / (finance.monthlyGoal || 1)) * 100));

  // AI Briefing Messages
  let briefing = "O sol está brilhando e seus negócios também! Tudo calmo por aqui.";
  let briefingType = "neutral";
  if (leads.abandonedCount > 2) {
    briefing = `Atenção: Você tem ${leads.abandonedCount} leads esfriando sem contato há mais de 48h!`;
    briefingType = "alert";
  } else if (progressPercent >= 80 && progressPercent < 100) {
    briefing = `Quase lá! Faltam apenas ${formatCurrency(finance.monthlyGoal - finance.realizedIncome)} para bater sua meta do mês. Vai pra cima!`;
    briefingType = "success";
  }

  // Charts Data
  const funnelData = [
    { name: 'Novo', value: leads.funnel.NOVO || 0 },
    { name: 'Atendimento', value: leads.funnel.ATENDIMENTO || 0 },
    { name: 'Visita', value: leads.funnel.VISITA || 0 },
    { name: 'Proposta', value: leads.funnel.PROPOSTA || 0 },
    { name: 'Ganho', value: leads.funnel.GANHO || 0 },
  ];
  const FUNNEL_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  const sparklineData = Array.from({length: 12}, (_, i) => ({ value: Math.random() * 100 + i * 10 }));
  const incomeSparkline = Array.from({length: 12}, (_, i) => ({ value: finance.realizedIncome * 0.1 * Math.random() + i * 1000 }));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-12 pt-6 font-sans">
      
      {/* 1. Briefing Inteligente */}
      <div className={`p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-500 shadow-sm border ${
        briefingType === 'alert' ? 'bg-red-50 border-red-100 text-red-800 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400' :
        briefingType === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' :
        briefingType === 'hot' ? 'bg-orange-50 border-orange-100 text-orange-800 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400' :
        'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400'
      }`}>
        <div className={`p-2 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-sm shrink-0`}>
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm opacity-80 mb-0.5">Assistente IA</h3>
          <p className="font-medium">{briefing}</p>
        </div>
      </div>

      {/* 2. KPIs Animados com Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Realizado */}
        <div className="bg-white dark:bg-surface-container rounded-xl p-6 shadow-sm border border-gray-100 dark:border-outline-variant relative overflow-hidden group hover:shadow-md hover:border-primary/30 transition-all">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">+12%</span>
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Realizado no Mês</p>
            <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 mt-1">{formatCurrency(finance.realizedIncome)}</h3>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20 group-hover:opacity-40 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={incomeSparkline} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Area type="monotone" dataKey="value" stroke="var(--color-primary)" fill="var(--color-primary)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPI 2: Meta */}
        <div className="bg-white dark:bg-surface-container rounded-xl p-6 shadow-sm border border-gray-100 dark:border-outline-variant relative overflow-hidden group hover:shadow-md hover:border-blue-300 transition-all">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{progressPercent}% atingido</span>
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Meta Mensal</p>
            <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 mt-1">{formatCurrency(finance.monthlyGoal)}</h3>
            
            {/* Meta Progress */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* KPI 3: VGV */}
        <div className="bg-white dark:bg-surface-container rounded-xl p-6 shadow-sm border border-gray-100 dark:border-outline-variant relative overflow-hidden group hover:shadow-md hover:border-purple-300 transition-all">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-purple-100 rounded-xl text-purple-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">{leads.activeCount} ativos</span>
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">VGV em Negociação</p>
            <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 mt-1">{formatCurrency(finance.vgvInNegotiation)}</h3>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-10 group-hover:opacity-30 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Area type="monotone" dataKey="value" stroke="#9333ea" fill="#9333ea" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPI 4: Alerta */}
        <Link href="/leads" className="bg-white dark:bg-surface-container rounded-xl p-6 shadow-sm border border-gray-100 dark:border-outline-variant relative overflow-hidden group hover:shadow-md hover:border-red-300 transition-all cursor-pointer block">
          {leads.abandonedCount > 0 && (
            <div className="absolute top-4 right-4 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </div>
          )}
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-red-50 rounded-xl text-red-500">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Leads Abandonados</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100">{leads.abandonedCount}</h3>
              <span className="text-xs font-medium text-red-500">precisam de atenção</span>
            </div>
          </div>
        </Link>
      </div>

      {/* 3. Área Central (Pulse) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Funnel Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-container rounded-xl p-6 shadow-sm border border-gray-100 dark:border-outline-variant flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Saúde do Funil</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Distribuição dos seus leads ativos</p>
            </div>
            <div className="bg-gray-50 dark:bg-surface-container-highest px-3 py-1 rounded-lg border border-gray-100">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Conversão: <span className="text-emerald-600">{leads.conversionRate}%</span></span>
            </div>
          </div>
          <div className="flex-1 min-h-[250px] w-full flex flex-col md:flex-row items-center justify-center gap-8 py-4">
            {/* O Funil Visual (CSS Puro) */}
            <div className="relative w-full max-w-[220px] h-[240px] drop-shadow-sm shrink-0">
              <div 
                className="absolute inset-0 w-full h-full flex flex-col overflow-hidden"
                style={{ clipPath: 'polygon(0 0, 100% 0, 65% 100%, 35% 100%)' }}
              >
                {(() => {
                  const isAllZero = funnelData.every(d => d.value === 0);
                  const funnelTotal = isAllZero ? 1 : funnelData.reduce((a, b) => a + b.value, 0);

                  return funnelData.map((item, i) => {
                    // Se tudo for 0, dividimos igualmente para o funil existir visualmente.
                    // Se não, o tamanho é proporcional (com mínimo de 8% pra não sumir a cor de quem tem pelo menos 1)
                    let heightPct = isAllZero ? (100 / funnelData.length) : (item.value / funnelTotal) * 100;
                    if (!isAllZero && item.value > 0 && heightPct < 12) heightPct = 12;

                    return (
                      <div 
                        key={item.name}
                        className="w-full flex items-center justify-center transition-all duration-500 hover:brightness-110 relative group border-b border-black/10 last:border-0"
                        style={{ 
                          height: `${heightPct}%`, 
                          backgroundColor: FUNNEL_COLORS[i] 
                        }}
                        title={`${item.name}: ${item.value}`}
                      >
                         {heightPct > 10 && (
                            <span className="text-white font-bold text-sm opacity-90 drop-shadow-md">
                              {item.value}
                            </span>
                         )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            
            {/* Legenda Lateral */}
            <div className="flex flex-col gap-2.5 w-full">
              {funnelData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between bg-gray-50 dark:bg-surface-container-highest p-3 rounded-xl border border-gray-100 dark:border-outline-variant/30 hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: FUNNEL_COLORS[i] }}></div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.name}</span>
                  </div>
                  <span className="text-lg font-black text-gray-900 dark:text-gray-50">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Plan */}
        <div className="bg-white dark:bg-surface-container rounded-xl p-6 shadow-sm border border-gray-100 dark:border-outline-variant flex flex-col max-h-[350px]">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">Plano de Ação</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Para hoje ({new Date().toLocaleDateString('pt-BR')})</p>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
            {tasks.today.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Você está livre hoje!</p>
              </div>
            ) : (
              tasks.today.map((task: any) => (
                <div key={task.id} className="p-3 bg-gray-50 dark:bg-surface-container-highest hover:bg-gray-100 rounded-xl transition-colors border border-gray-100 flex gap-3 group">
                  <div className="mt-0.5 text-gray-400">
                    <Circle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{task.title}</h4>
                    {task.lead && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                        <User className="w-3 h-3" /> {task.lead.name}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded-md h-fit border border-gray-100 shadow-sm">
                    {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
          
          <Link href="/calendar" className="mt-4 pt-4 border-t border-gray-100 text-sm font-bold text-primary flex items-center justify-center gap-2 hover:opacity-80 transition-opacity">
            Ver Agenda Completa <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

    </div>
  );
}
