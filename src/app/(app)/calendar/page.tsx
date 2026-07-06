"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin, Phone, MessageSquare, CheckCircle2, Circle, Trash2, Home, Edit2 } from "lucide-react";
import CreateTaskModal from "@/components/CreateTaskModal";

type Task = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  dueDate: string;
  status: string;
  leadId: string | null;
  propertyId: string | null;
  lead?: { name: string; phone: string };
  property?: { title: string };
};

const TASK_ICONS: any = {
  VISIT: <MapPin className="w-4 h-4" />,
  CALL: <Phone className="w-4 h-4" />,
  MESSAGE: <MessageSquare className="w-4 h-4" />,
  MEETING: <Clock className="w-4 h-4" />,
  OTHER: <CalendarIcon className="w-4 h-4" />
};

const TASK_COLORS: any = {
  VISIT: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
  CALL: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
  MESSAGE: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30",
  MEETING: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30",
  OTHER: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30"
};

const TASK_LABELS: any = {
  VISIT: "Visita",
  CALL: "Ligação",
  MESSAGE: "Mensagem",
  MEETING: "Reunião",
  OTHER: "Outro"
};

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const fetchTasks = async () => {
    try {
      // In a real app, pass start/end dates of the month
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) setTasks(data.tasks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Build calendar grid
  const daysArray = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - firstDay + 1;
    if (dayNumber > 0 && dayNumber <= daysInMonth) {
      return new Date(year, month, dayNumber);
    }
    return null;
  });

  const getTasksForDate = (date: Date) => {
    return tasks.filter(t => {
      const d = new Date(t.dueDate);
      return d.getFullYear() === date.getFullYear() && 
             d.getMonth() === date.getMonth() && 
             d.getDate() === date.getDate();
    });
  };

  const selectedDayTasks = getTasksForDate(selectedDate);



  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    // Otimisticamente
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      fetchTasks(); // rollback on error
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    } catch (e) {
      fetchTasks();
    }
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const isToday = (d: Date) => isSameDay(d, new Date());

  return (
    <div className="flex-1 flex h-[calc(100vh-80px)] overflow-hidden font-sans relative bg-gray-50/30 dark:bg-[#030712]/30">
      {/* Background Decorativo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-primary)] opacity-[0.03] rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
      
      {/* LEFT AREA: CALENDAR (65%) */}
      <div className="flex-1 flex flex-col px-8 py-6 overflow-y-auto custom-scrollbar border-r border-gray-200/50 dark:border-outline-variant">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div>
            <h1 className="font-display-lg text-[var(--color-on-surface)] text-3xl tracking-tight mb-1">Agenda</h1>
            <p className="font-body-md text-[var(--color-on-surface-variant)]">Organize suas visitas, ligações e rotina diária.</p>
          </div>
          
          <button 
            onClick={() => {
              setTaskToEdit(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold shadow-sm hover:shadow transition-all hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)]"
          >
            <Plus className="w-5 h-5" /> Nova Tarefa
          </button>
        </div>

        <div className="bg-white dark:bg-surface-container border border-gray-200 dark:border-outline-variant shadow-sm rounded-xl flex-1 flex flex-col">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-outline-variant">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
              {MONTHS[month]} <span className="font-normal text-gray-500 dark:text-gray-400">{year}</span>
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-container-high text-gray-600 dark:text-gray-400 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
                className="px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-container-high text-sm font-semibold text-gray-600 dark:text-gray-400 transition-colors"
              >
                Hoje
              </button>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-container-high text-gray-600 dark:text-gray-400 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 flex flex-col p-4">
            {/* Days of Week */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center font-semibold text-sm text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 grid-rows-6 flex-1 gap-1">
              {daysArray.map((date, i) => {
                if (!date) return <div key={i} className="p-2 rounded-xl bg-gray-50/50 dark:bg-[#030712]/50 border border-transparent"></div>;
                
                const isSelected = isSameDay(date, selectedDate);
                const isDayToday = isToday(date);
                const dayTasks = getTasksForDate(date);
                
                return (
                  <div 
                    key={i} 
                    onClick={() => setSelectedDate(date)}
                    className={`p-2 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all min-h-[80px]
                      ${isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)]/10 shadow-sm' : 'border-gray-100 dark:border-outline-variant hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-surface-container-highest'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                        ${isDayToday ? 'bg-[var(--color-primary)] text-white' : 'text-gray-700 dark:text-gray-300'}
                      `}>
                        {date.getDate()}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-xs font-bold text-gray-400">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 mt-1">
                      {dayTasks.slice(0, 3).map(task => (
                        <div 
                          key={task.id} 
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate border ${TASK_COLORS[task.type]} ${task.status === 'COMPLETED' ? 'opacity-50 line-through' : ''}`}
                        >
                          {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-[10px] text-center font-bold text-gray-400">
                          +{dayTasks.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT AREA: TASKS PANEL (35%) */}
      <div className="w-[400px] shrink-0 flex flex-col bg-white dark:bg-surface-container-high border-l border-white/60 dark:border-white/10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] relative z-10">
        <div className="p-6 border-b border-gray-100 dark:border-outline-variant bg-gray-50/50 dark:bg-[#030712]/50 shrink-0">
          <h3 className="font-headline-md text-xl text-gray-800 dark:text-gray-100">
            {isToday(selectedDate) ? "Hoje" : selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {selectedDayTasks.length} {selectedDayTasks.length === 1 ? 'tarefa agendada' : 'tarefas agendadas'}
          </p>
        </div>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
          {selectedDayTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
              <CalendarIcon className="w-16 h-16 text-gray-300 mb-4" />
              <p className="font-semibold text-gray-500">Nenhuma tarefa para este dia.</p>
              <p className="text-sm text-gray-400 mt-2">Clique em "Nova Tarefa" para adicionar compromissos à sua agenda.</p>
            </div>
          ) : (
            selectedDayTasks.map(task => (
              <div 
                key={task.id} 
                className={`p-4 rounded-xl border flex gap-3 transition-all group ${task.status === 'COMPLETED' ? 'bg-gray-50 dark:bg-surface-container border-gray-100 dark:border-outline-variant opacity-70' : 'bg-white dark:bg-surface-container-highest border-gray-200 dark:border-outline-variant shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-500'}`}
              >
                <button 
                  onClick={() => toggleTaskStatus(task.id, task.status)}
                  className="mt-1 shrink-0 text-gray-300 hover:text-[var(--color-primary)] transition-colors"
                >
                  {task.status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-semibold text-gray-800 dark:text-gray-100 ${task.status === 'COMPLETED' ? 'line-through text-gray-500 dark:text-gray-500' : ''}`}>
                      {task.title}
                    </h4>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#030712] px-2 py-0.5 rounded-full shrink-0">
                      {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border uppercase tracking-wider ${TASK_COLORS[task.type]}`}>
                      {TASK_ICONS[task.type]} {TASK_LABELS[task.type]}
                    </span>
                    
                    {task.lead && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500/30">
                        <Phone className="w-3 h-3" /> {task.lead.name}
                      </span>
                    )}
                    
                    {task.property && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                        <Home className="w-3 h-3" /> {task.property.title}
                      </span>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-[#030712] p-2 rounded-lg">
                      {task.description}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setTaskToEdit(task);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <CreateTaskModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setTaskToEdit(null);
        }} 
        onSuccess={fetchTasks} 
        taskToEdit={taskToEdit}
      />
    </div>
  );
}
