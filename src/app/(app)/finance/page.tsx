"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, Building2, Plus, Filter, CheckCircle2, Circle, Clock, TrendingUp, Building, User, Edit2, Trash2, MoreVertical, Settings, X } from "lucide-react";

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  date: string;
  status: "PENDING" | "COMPLETED" | "CANCELED";
  category: string;
  property?: { title: string; id: string };
  lead?: { name: string; id: string };
};

type Metrics = {
  totalIncome: number;
  totalExpense: number;
  pendingIncome: number;
  pendingExpense: number;
  balance: number;
  portfolioValue: number;
};

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalIncome: 0, totalExpense: 0, pendingIncome: 0, pendingExpense: 0, balance: 0, portfolioValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [propertiesList, setPropertiesList] = useState<any[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filtros locais da lista
  const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  // Modal Custos Fixos
  const [isFixedCostsModalOpen, setIsFixedCostsModalOpen] = useState(false);
  const [fixedExpenses, setFixedExpenses] = useState<any[]>([]);
  const [newFixedCost, setNewFixedCost] = useState({ description: "", amount: "", category: "OUTROS" });

  // Formulário de Nova Transação
  const [formData, setFormData] = useState({
    id: "",
    type: "INCOME",
    amount: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    category: "COMISSAO",
    status: "PENDING",
    propertyId: "",
    installments: 1
  });

  const fetchFinance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/finance?month=${selectedMonth}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
        setMetrics(data.metrics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch("/api/properties/list");
      const data = await res.json();
      if (data.success) {
        setPropertiesList(data.properties);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFinance();
    fetchProperties();
  }, [selectedMonth]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const toggleStatus = async (tx: Transaction) => {
    const newStatus = tx.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    // Otimistic
    setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: newStatus } : t));
    
    await fetch(`/api/finance/${tx.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    fetchFinance(); // recarrega para bater as métricas
  };

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const propId = e.target.value;
    const prop = propertiesList.find(p => p.id === propId);
    
    if (prop && formData.type === 'INCOME') {
      // Sugere a comissão
      setFormData({ ...formData, propertyId: propId, amount: prop.commission ? prop.commission.toString() : "", description: `Comissão - ${prop.title}` });
    } else {
      setFormData({ ...formData, propertyId: propId });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = formData.id ? "PUT" : "POST";
      const res = await fetch("/api/finance", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormData({
          id: "", type: "INCOME", amount: "", description: "", date: new Date().toISOString().split('T')[0], category: "COMISSAO", status: "PENDING", propertyId: "", installments: 1
        });
        fetchFinance();
      }
    } catch (e) {
      alert("Erro ao salvar");
    }
  };

  const handleEdit = (tx: Transaction) => {
    setFormData({
      id: tx.id,
      type: tx.type,
      amount: tx.amount.toString(),
      description: tx.description,
      date: new Date(tx.date).toISOString().split('T')[0],
      category: tx.category,
      status: tx.status,
      propertyId: tx.property?.id || "",
      installments: 1 // can't edit installments of an already created tx
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este lançamento?")) {
      try {
        const res = await fetch(`/api/finance?id=${id}`, { method: 'DELETE' });
        if (res.ok) fetchFinance();
      } catch (e) {
        alert("Erro ao deletar");
      }
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filterType !== "ALL" && tx.type !== filterType) return false;
    if (filterStatus !== "ALL" && tx.status !== filterStatus) return false;
    return true;
  });

  const fetchFixedExpenses = async () => {
    const res = await fetch('/api/finance/fixed');
    const data = await res.json();
    if (data.success) setFixedExpenses(data.fixedExpenses);
  };

  const handleAddFixedExpense = async () => {
    if (!newFixedCost.description || !newFixedCost.amount) return;
    try {
      const res = await fetch('/api/finance/fixed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFixedCost)
      });
      if (res.ok) {
        setNewFixedCost({ description: "", amount: "", category: "OUTROS" });
        fetchFixedExpenses();
      }
    } catch (e) {
      alert("Erro ao adicionar custo fixo");
    }
  };

  const handleDeleteFixedExpense = async (id: string) => {
    if (confirm("Remover este custo fixo mestre da lista? (Não afeta lançamentos passados)")) {
      try {
        const res = await fetch(`/api/finance/fixed?id=${id}`, { method: 'DELETE' });
        if (res.ok) fetchFixedExpenses();
      } catch (e) {
        alert("Erro ao remover");
      }
    }
  };

  return (
    <main className="flex-1 flex flex-col h-screen overflow-y-auto custom-scrollbar relative bg-surface">
        <div className="p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end mt-4 gap-4">
            <div>
              <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight font-bold">Gestão Financeira</h1>
              <p className="text-on-surface-variant font-body-lg mt-2">Controle de comissões, despesas e previsibilidade</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-surface-container-low border border-outline-variant text-on-surface px-4 py-3 rounded-xl font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none flex-1 md:w-48"
              />
              <button 
                onClick={() => {
                  setFormData({ id: "", type: "INCOME", amount: "", description: "", date: new Date().toISOString().split('T')[0], category: "COMISSAO", status: "PENDING", propertyId: "", installments: 1 });
                  setIsModalOpen(true);
                }}
                className="bg-primary text-on-primary px-6 py-3 rounded-xl font-label-lg flex items-center gap-2 hover:opacity-90 transition-all shadow-sm shrink-0"
              >
                <Plus className="w-5 h-5" /> Novo
              </button>
            </div>
          </header>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
            {/* Saldo Líquido */}
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <span className="font-label-sm text-on-surface-variant uppercase tracking-wider">Saldo Líquido</span>
              </div>
              <span className={`text-3xl font-bold tracking-tight ${metrics.balance >= 0 ? 'text-primary' : 'text-error'}`}>
                {formatCurrency(metrics.balance)}
              </span>
            </div>

            {/* Receitas Recebidas */}
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-primary" />
                </div>
                <span className="font-label-sm text-on-surface-variant uppercase tracking-wider">Comissões Recebidas</span>
              </div>
              <span className="text-3xl font-bold tracking-tight text-on-surface">
                {formatCurrency(metrics.totalIncome)}
              </span>
            </div>

            {/* Comissões a Receber (Previsibilidade) */}
            <div className="bg-primary-container p-6 rounded-2xl border border-primary-container shadow-sm flex flex-col text-on-primary-container relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-on-primary-container/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-on-primary-container" />
                </div>
                <span className="font-label-sm text-on-primary-container/80 uppercase tracking-wider">A Receber (Previsão)</span>
              </div>
              <span className="text-3xl font-bold tracking-tight relative z-10 text-on-primary-container">
                {formatCurrency(metrics.pendingIncome)}
              </span>
            </div>

            {/* Despesas */}
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-error-container flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-on-error-container" />
                </div>
                <span className="font-label-sm text-on-surface-variant uppercase tracking-wider">Custo Operacional</span>
              </div>
              <span className="text-3xl font-bold tracking-tight text-on-surface">
                {formatCurrency(metrics.totalExpense + metrics.pendingExpense)}
              </span>
            </div>
          </div>

          {/* VGV Panel */}
          <div className="w-full bg-surface-container-low rounded-2xl p-6 border border-outline-variant shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-6 z-10">
              <div className="w-16 h-16 bg-surface-container rounded-xl flex items-center justify-center border border-outline-variant">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-on-surface-variant font-label-md uppercase tracking-wider mb-1">VGV - Valor da Carteira Ativa</h3>
                <p className="text-4xl font-bold text-on-surface tracking-tight">{formatCurrency(metrics.portfolioValue)}</p>
              </div>
            </div>
            <div className="z-10 hidden md:block opacity-10">
              <TrendingUp className="w-24 h-24 text-on-surface" />
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white dark:bg-surface-container rounded-3xl border border-gray-200 dark:border-outline-variant shadow-sm overflow-hidden flex flex-col mt-4">
            <div className="p-6 border-b border-gray-100 dark:border-outline-variant flex items-center justify-between bg-gray-50/50 dark:bg-surface-container-highest/50 relative">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Lançamentos Financeiros</h2>
                <button 
                  onClick={() => {
                    fetchFixedExpenses();
                    setIsFixedCostsModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Custos Fixos
                </button>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className={`p-2 border rounded-xl transition-colors ${
                    filterType !== 'ALL' || filterStatus !== 'ALL' 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-white dark:bg-surface-container border-gray-200 dark:border-outline-variant text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-5 h-5" />
                </button>

                {isFilterMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-surface-container border border-gray-100 dark:border-outline-variant rounded-2xl shadow-xl z-50 p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</label>
                      <select 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="bg-gray-50 border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-lg p-2 text-sm outline-none focus:border-primary"
                      >
                        <option value="ALL">Todos os Lançamentos</option>
                        <option value="INCOME">Apenas Receitas</option>
                        <option value="EXPENSE">Apenas Despesas</option>
                      </select>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</label>
                      <select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="bg-gray-50 border border-gray-200 dark:border-outline-variant text-gray-800 dark:text-gray-100 rounded-lg p-2 text-sm outline-none focus:border-primary"
                      >
                        <option value="ALL">Todos os Status</option>
                        <option value="PENDING">Pendentes (A Pagar/Receber)</option>
                        <option value="COMPLETED">Finalizados (Pagos/Recebidos)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col min-h-[200px]">
              {loading ? (
                <div className="p-8 text-center text-gray-400 font-medium animate-pulse">Carregando transações...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                  <DollarSign className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-medium text-lg">Nenhum lançamento encontrado</p>
                  <p className="text-sm">Tente ajustar os filtros ou cadastre uma nova transação.</p>
                </div>
              ) : (
                filteredTransactions.map((tx) => (
                  <div key={tx.id} className="group flex items-center justify-between p-5 border-b border-gray-50 dark:border-outline-variant hover:bg-gray-50/80 dark:hover:bg-surface-container-highest/50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Check button */}
                      <button 
                        onClick={() => toggleStatus(tx)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          tx.status === 'COMPLETED' 
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:bg-surface-container-high dark:text-gray-500 dark:hover:bg-surface-container-highest'
                        }`}
                      >
                        {tx.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>

                      {/* Icon type */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-50 text-red-500 dark:bg-red-500/20 dark:text-red-400'
                      }`}>
                        {tx.type === 'INCOME' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight">{tx.description}</span>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                          <span className="bg-gray-100 dark:bg-surface-container-high px-2 py-0.5 rounded-md">{tx.category}</span>
                          <span>{new Date(tx.date).toLocaleDateString('pt-BR')}</span>
                          {tx.property && (
                            <span className="flex items-center gap-1 text-blue-600 bg-blue-50 dark:bg-blue-500/20 dark:text-blue-400 px-2 py-0.5 rounded-md">
                              <Building className="w-3 h-3" /> {tx.property.title}
                            </span>
                          )}
                          {tx.lead && (
                            <span className="flex items-center gap-1 text-purple-600 bg-purple-50 dark:bg-purple-500/20 dark:text-purple-400 px-2 py-0.5 rounded-md">
                              <User className="w-3 h-3" /> {tx.lead.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className={`font-black text-xl tracking-tight ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-gray-800 dark:text-gray-100'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 mb-3 ${
                        tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}>
                        {tx.status === 'COMPLETED' ? (tx.type === 'INCOME' ? 'Recebido' : 'Pago') : (tx.type === 'INCOME' ? 'A Receber' : 'A Pagar')}
                      </span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(tx)} className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 dark:bg-surface-container-high dark:hover:bg-blue-500/20 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(tx.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 dark:bg-surface-container-high dark:hover:bg-red-500/20 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      {/* MODAL NOVA TRANSAÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-container w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-outline-variant flex items-center justify-between bg-gray-50 dark:bg-surface-container-highest">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{formData.id ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-800 dark:hover:text-white dark:text-gray-300 bg-gray-200/50 dark:bg-surface-container-highest p-2 flex items-center justify-center rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              <div className="flex gap-4 p-1 bg-gray-100 dark:bg-surface-container-highest rounded-xl">
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'INCOME', category: 'COMISSAO' })}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${formData.type === 'INCOME' ? 'bg-white dark:bg-surface-container text-emerald-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  Receita (Comissão)
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'EXPENSE', category: 'MARKETING' })}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${formData.type === 'EXPENSE' ? 'bg-white dark:bg-surface-container text-red-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  Despesa (Custo)
                </button>
              </div>

              {formData.type === 'INCOME' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Imóvel Relacionado (Opcional)</label>
                  <select 
                    value={formData.propertyId}
                    onChange={handlePropertyChange}
                    className="w-full bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- Não vincular imóvel --</option>
                    {propertiesList.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Valor Total (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant rounded-xl px-4 py-3 font-black text-gray-800 dark:text-gray-100 text-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Data Inicial</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant rounded-xl px-4 py-3 font-semibold text-gray-800 dark:text-gray-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {!formData.id && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Parcelamento</label>
                  <div className="flex items-center gap-3">
                    <select
                      value={formData.installments}
                      onChange={(e) => setFormData({...formData, installments: parseInt(e.target.value)})}
                      className="bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant rounded-xl px-4 py-3 font-semibold text-gray-800 dark:text-gray-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full"
                    >
                      <option value={1}>Pagamento Único</option>
                      <option value={2}>2 Parcelas</option>
                      <option value={3}>3 Parcelas</option>
                      <option value={4}>4 Parcelas</option>
                      <option value={5}>5 Parcelas</option>
                      <option value={6}>6 Parcelas</option>
                      <option value={10}>10 Parcelas</option>
                      <option value={12}>12 Parcelas</option>
                      <option value={24}>24 Parcelas</option>
                    </select>
                  </div>
                  {formData.installments > 1 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">O valor será dividido em {formData.installments} lançamentos de {formatCurrency(parseFloat(formData.amount || "0") / formData.installments)}.</p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Categoria</label>
                <select 
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant rounded-xl px-4 py-3 font-semibold text-gray-800 dark:text-gray-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  {formData.type === 'INCOME' ? (
                    <>
                      <option value="COMISSAO">Comissão</option>
                      <option value="CONSULTORIA">Consultoria</option>
                      <option value="OUTROS">Outros</option>
                    </>
                  ) : (
                    <>
                      <option value="MARKETING">Marketing (Anúncios, Portais)</option>
                      <option value="COMBUSTIVEL">Combustível</option>
                      <option value="ALIMENTACAO">Alimentação</option>
                      <option value="IMPOSTOS">Impostos (DAS, DARF)</option>
                      <option value="REPASSE">Repasse (Parceria)</option>
                      <option value="OUTROS">Outros</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Descrição</label>
                <input 
                  type="text" 
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-outline-variant rounded-xl px-4 py-3 font-semibold text-gray-800 dark:text-gray-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Ex: Venda Casa Cond. Alphaville"
                />
              </div>

              <div className="flex gap-4 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-gray-100 dark:bg-surface-container-highest dark:hover:bg-surface-container-highest/80 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className={`flex-1 py-3.5 rounded-xl font-bold text-white transition-colors shadow-lg ${formData.type === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'}`}>
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FIXED COSTS MODAL */}
      {isFixedCostsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-container rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-100 dark:border-outline-variant animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gray-50/80 px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Custos Fixos da Corretagem</h2>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Lista Mestra de Recorrências</p>
                </div>
              </div>
              <button 
                onClick={() => setIsFixedCostsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200/60 text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-6">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-sm text-emerald-800">
                  Os itens desta lista são <strong>clonados automaticamente</strong> para a sua planilha de lançamentos sempre que o mês vira. Ao apagar daqui, eles não serão gerados no próximo mês.
                </p>
              </div>

              {/* Add New */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Adicionar Novo Custo Fixo</h3>
                <div className="flex gap-2 items-start">
                  <div className="flex-1 flex flex-col gap-2">
                    <input 
                      type="text"
                      placeholder="Descrição (ex: Zap Imóveis)"
                      value={newFixedCost.description}
                      onChange={e => setNewFixedCost({...newFixedCost, description: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 dark:border-outline-variant rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <select 
                      value={newFixedCost.category}
                      onChange={e => setNewFixedCost({...newFixedCost, category: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 dark:border-outline-variant rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="MARKETING">Marketing / Tráfego</option>
                      <option value="PORTAIS">Portais (Zap, VivaReal)</option>
                      <option value="OUTROS">Outros Operacionais</option>
                    </select>
                  </div>
                  <div className="w-32 flex flex-col gap-2">
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="Valor (R$)"
                      value={newFixedCost.amount}
                      onChange={e => setNewFixedCost({...newFixedCost, amount: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 dark:border-outline-variant rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold"
                    />
                    <button 
                      onClick={handleAddFixedExpense}
                      disabled={!newFixedCost.description || !newFixedCost.amount}
                      className="w-full bg-primary text-white rounded-lg px-3 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100 dark:border-outline-variant" />

              {/* List */}
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Custos Ativos ({fixedExpenses.length})</h3>
                {fixedExpenses.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhum custo fixo cadastrado.</p>
                ) : (
                  fixedExpenses.map(fe => (
                    <div key={fe.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-outline-variant rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{fe.description}</span>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{fe.category}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-gray-700 dark:text-gray-200">{formatCurrency(fe.amount)}</span>
                        <button 
                          onClick={() => handleDeleteFixedExpense(fe.id)}
                          className="p-1.5 text-gray-400 hover:text-error hover:bg-error-container rounded-md transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-6 bg-gray-50/50 dark:bg-surface-container-highest/50 border-t border-gray-100 dark:border-outline-variant flex justify-end">
              <button 
                onClick={() => {
                  setIsFixedCostsModalOpen(false);
                  fetchFinance(); // Refresh main list to pull in newly lazy-loaded items if month matches
                }}
                className="bg-white dark:bg-surface-container border border-gray-200 dark:border-outline-variant text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
