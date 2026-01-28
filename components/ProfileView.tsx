import React, { useState, useMemo, useRef, useEffect } from 'react';

import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { GlassHeader } from './GlassHeader';

import { TrendingUp, TrendingDown, Clock, Filter, ChevronLeft, ChevronRight, Calendar, Calculator, Sparkles, Download, Upload, Trash2, Settings, Bell, Palette, X, Info, ChevronDown, CheckCircle2, Circle, Users, Plus, FileText, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { expandRecurringEvents } from '../utils/recurrence';
import { parseDurationToHours, calculateReactiveCost } from '../utils/cost';


export const ProfileView: React.FC = () => {
  const { user, logout } = useAuth();
  const { budget, documents, addDocument, events, applyStateUpdate, projects, tagColors, setTagColor, assigneeColors, setAssigneeColor, chatHistory, enableNotifications, fcmToken, activityLog } = useApp();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const [timeRange, setTimeRange] = useState({ start: 0, end: 11 }); // 0-11 months
  const [paletteOpen, setPaletteOpen] = useState<string | null>(null);
  const [agendaDensity, setAgendaDensity] = useState<number>(1);
  const [resizing, setResizing] = useState<{ id: string, type: 'top' | 'bottom', initialY: number, initialDate: string, initialDuration: number } | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<{ id: string, title: string, start: string, end: string, x: number, y: number, color: string } | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    events.forEach(e => e.tags.forEach(t => s.add(t)));
    projects.forEach(p => p.tags?.forEach(t => s.add(t)));
    return ['TODO', ...Array.from(s).sort()];
  }, [events, projects]);

  const { coloredTags, uncoloredTags } = useMemo(() => {
    return {
      coloredTags: allTags.filter(t => tagColors?.[t]),
      uncoloredTags: allTags.filter(t => !tagColors?.[t])
    };
  }, [allTags, tagColors]);

  const sliderRef = useRef<HTMLDivElement>(null);

  const allAssignees = useMemo(() => {
    const s = new Set<string>();
    events.forEach(e => e.assignees?.forEach(a => s.add(a)));
    projects.forEach(p => p.assignees?.forEach(a => s.add(a)));
    return Array.from(s).sort();
  }, [events, projects]);

  const projectMaps = useMemo(() => {
    const tags: Record<string, string[]> = {};
    const asgs: Record<string, string[]> = {};
    projects.forEach(p => {
      tags[p.id] = p.tags || [];
      asgs[p.id] = p.assignees || [];
    });
    return { tags, asgs };
  }, [projects]);

  const expandedEvents = useMemo(() => {
    // Expand for the entire selected year to be safe, then filter
    return expandRecurringEvents(events, new Date(selectedYear, 0, 1), new Date(selectedYear, 11, 31));
  }, [events, selectedYear]);

  const filteredEventsForRange = useMemo(() => {
    return expandedEvents.filter(ev => {
      const d = new Date(ev.date);
      const monthMatch = d.getMonth() >= timeRange.start && d.getMonth() <= timeRange.end;
      return monthMatch;
    });
  }, [expandedEvents, timeRange]);

  const filteredEvents = useMemo(() => {
    return filteredEventsForRange.filter(ev => {
      const pTags = ev.projectId ? (projectMaps.tags[ev.projectId] || []) : [];
      const combinedTags = [...ev.tags, ...pTags];
      const tagMatch = selectedTags.length === 0 || combinedTags.some(t => selectedTags.includes(t));

      const pAsgs = ev.projectId ? (projectMaps.asgs[ev.projectId] || []) : [];
      const combinedAsgs = [...(ev.assignees || []), ...pAsgs];
      const assigneeMatch = selectedAssignees.length === 0 || combinedAsgs.some(a => selectedAssignees.includes(a));

      return tagMatch && assigneeMatch;
    });
  }, [filteredEventsForRange, selectedTags, selectedAssignees, projectMaps]);

  // Metrics calculation
  // Metrics calculation
  const metrics = useMemo(() => {
    let valorEstimado = 0;
    let costeEstimado = 0;
    let valorReal = 0;
    let costeReal = 0;
    let productionReal = 0;
    let timeReal = 0;

    // 1. Process Events
    filteredEvents.forEach(ev => {
      const rate = budget.hourlyRate || 80;
      const multiplier = (ev.assignees && ev.assignees.length > 0) ? ev.assignees.length : 1;

      // Real Cost: Progressive (All executed events)
      if (ev.completed || new Date(ev.date) < new Date()) {
        const rC = calculateReactiveCost(ev.duration, rate, ev.realCost, multiplier, true);
        costeReal += rC;
        timeReal += rC; // Events are considered "Time" costs by default

        if (!ev.projectId) {
          valorReal += ev.realValue || 0;
        }
      }

      // Estimado: Only Independent Events
      if (!ev.projectId) {
        const bC = calculateReactiveCost(ev.duration, rate, ev.budgetedCost, multiplier);
        costeEstimado += bC;
        valorEstimado += ev.budgetedValue !== undefined ? ev.budgetedValue : bC;
      }
    });

    // 2. Process Projects (Proportional for Annual, Puntual by Deadline)
    // Ensure we strictly respect the slider.
    const monthsSelected = Math.max(1, (timeRange.end - timeRange.start) + 1);

    // Helper for Annual Project Logic
    const getProjectFactor = (p: any) => {
      const isAnnual = p.tags?.some((t: string) =>
        ['anual', 'mantenimiento', 'fee', 'rrss', 'social media', 'recurrente'].some(kw => t.toLowerCase().includes(kw))
      );

      if (isAnnual) {
        // Broad definition: If it's ongoing, or if it has a deadline in this year.
        // Even if deadline is past (e.g. Jan 2026), if we are looking at 2026, it counts.
        const d = p.deadline ? new Date(p.deadline) : null;
        const dateIsValid = d && !isNaN(d.getTime());
        const isCurrentYear = dateIsValid && d.getFullYear() === selectedYear;

        // Show if ongoing (regardless of date) OR if it belongs to this year
        // PRORATION: Always prorate annual projects based on the slider selection (monthsSelected / 12)
        if (p.status === 'ongoing' || isCurrentYear) {
          return { isInRange: true, factor: monthsSelected / 12 };
        }
        return { isInRange: false, factor: 0 };
      }

      // Non-Annual (One-off)
      if (p.deadline) {
        const d = new Date(p.deadline);
        const yearMatch = d.getFullYear() === selectedYear;
        const monthMatch = d.getMonth() >= timeRange.start && d.getMonth() <= timeRange.end;
        if (yearMatch && monthMatch) {
          return { isInRange: true, factor: 1 };
        }
      }
      return { isInRange: false, factor: 0 };
    };

    projects.forEach(p => {
      const { isInRange, factor } = getProjectFactor(p);

      if (isInRange) {
        const tagMatch = selectedTags.length === 0 || p.tags?.some(t => selectedTags.includes(t));
        const assigneeMatch = selectedAssignees.length === 0 || p.assignees?.some(a => selectedAssignees.includes(a));
        if (!tagMatch || !assigneeMatch) return;

        const internalRate = budget.hourlyRate || 20;
        const marketRate = 80;
        const pBudgetedHours = p.budgetedHours || 0;
        // Use safe default for budgetedCost
        const pBudgetedCost = p.budgetedCost !== undefined ? p.budgetedCost : 0;

        const currentProjectedCost = calculateReactiveCost(`${pBudgetedHours}h`, marketRate, pBudgetedCost);

        valorEstimado += (p.budgetedValue || p.globalValue || 0) * factor;
        costeEstimado += currentProjectedCost * factor;

        if (p.status === 'completed' || p.status === 'ongoing') {
          const pProd = (p.realProductionCost || 0);
          const pCost = p.realCost !== undefined ? p.realCost : (pProd + (p.realTimeCost || 0));
          const pTime = p.realCost !== undefined ? Math.max(0, p.realCost - pProd) : (p.realTimeCost || 0);

          productionReal += pProd * factor;
          timeReal += pTime * factor;
          costeReal += pCost * factor;

          valorReal += (p.realValue || 0) * factor;
        }
      }
    });

    const totalAnnualExpenses = (budget.expenses || []).reduce((acc, exp) => acc + exp.amount, 0);
    const proratedExpenses = (totalAnnualExpenses / 12) * monthsSelected;

    const tagBreakdown: Record<string, { proyVal: number, proyCost: number, realVal: number, realCost: number }> = {};

    // Initialize tags
    (selectedTags.length > 0 ? selectedTags : Array.from(allTags).filter(t => t !== 'TODO')).forEach(t => {
      tagBreakdown[t] = { proyVal: 0, proyCost: 0, realVal: 0, realCost: 0 };
    });

    // Populate tags from events
    filteredEventsForRange.forEach(ev => {
      const rate = budget.hourlyRate || 80;
      const multiplier = (ev.assignees && ev.assignees.length > 0) ? ev.assignees.length : 1;

      const pTags = ev.projectId ? (projectMaps.tags[ev.projectId] || []) : [];
      const combinedTags = Array.from(new Set([...ev.tags, ...pTags]));

      combinedTags.forEach(t => {
        if (!tagBreakdown[t]) return;

        if (ev.completed || new Date(ev.date) < new Date()) {
          const rC = calculateReactiveCost(ev.duration, rate, ev.realCost, multiplier, true);
          tagBreakdown[t].realCost += rC;
          if (!ev.projectId) {
            tagBreakdown[t].realVal += ev.realValue || 0;
          }
        }

        if (!ev.projectId) {
          const bC = calculateReactiveCost(ev.duration, rate, ev.budgetedCost, multiplier);
          tagBreakdown[t].proyCost += bC;
          tagBreakdown[t].proyVal += ev.budgetedValue !== undefined ? ev.budgetedValue : bC;
        }
      });
    });

    // Populate tags from projects
    projects.forEach(p => {
      const { isInRange, factor } = getProjectFactor(p);

      if (isInRange) {
        p.tags?.forEach(t => {
          if (!tagBreakdown[t]) return;

          const rate = budget.hourlyRate || 80;
          const pBudgetedHours = p.budgetedHours || 0;
          const pBudgetedCost = p.budgetedCost !== undefined ? p.budgetedCost : 0;
          const currentProjectedCost = calculateReactiveCost(`${pBudgetedHours}h`, rate, pBudgetedCost);

          tagBreakdown[t].proyVal += (p.budgetedValue || p.globalValue || 0) * factor;
          tagBreakdown[t].proyCost += currentProjectedCost * factor;

          if (p.status === 'completed' || p.status === 'ongoing') {
            const pProd = (p.realProductionCost || 0);
            const pCost = p.realCost !== undefined ? p.realCost : (pProd + (p.realTimeCost || 0));
            tagBreakdown[t].realVal += (p.realValue || 0) * factor;
            tagBreakdown[t].realCost += pCost * factor;
          }
        });
      }
    });

    return { valorEstimado, costeEstimado, valorReal, costeReal, productionReal, timeReal, proratedExpenses, tagBreakdown };
  }, [filteredEvents, filteredEventsForRange, projects, timeRange, selectedYear, budget.hourlyRate, budget.expenses, selectedTags, allTags, projectMaps]);



  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (re) => {
        const content = re.target?.result as string;
        addDocument(file.name, content);
        alert('Documento de texto procesado como contexto para la IA.');
      };
      reader.readAsText(file);
    } else {
      addDocument(file.name);
      alert('Documento subido. Nota: Para archivos PDF o imágenes, la IA solo puede conocer el nombre del archivo por ahora. Se recomienda subir manuales en formato texto (.txt o .md) para contexto completo.');
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Este navegador no soporta notificaciones de escritorio");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification("¡Notificaciones activadas!", {
        body: "Ahora recibirás avisos de tus actividades de 3V",
        icon: '/icon-mobile.png'
      });
    } else {
      alert("Para recibir avisos, debes permitir las notificaciones en los ajustes de tu navegador o móvil.");
    }
  };

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // State for continuous dragging (for smooth visual movement)
  const [visualRange, setVisualRange] = useState({ start: 0, end: 11 });
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(null);

  // Sync timeRange (integer months) when visualRange changes
  useEffect(() => {
    setTimeRange({
      start: Math.round(visualRange.start),
      end: Math.round(visualRange.end)
    });
  }, [visualRange]);

  // Handle pointer move for smooth dragging
  useEffect(() => {
    if (activeHandle === null) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      // Note: we don't subtract padding here if rect is the track itself
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const value = percent * 11;

      setVisualRange(prev => {
        if (activeHandle === 'start') {
          return { ...prev, start: Math.min(value, prev.end) };
        } else {
          return { ...prev, end: Math.max(value, prev.start) };
        }
      });
    };

    const handlePointerUp = () => setActiveHandle(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeHandle]);
  return (
    <div className="flex flex-col min-h-full bg-gray-50 select-none relative">
      <GlassHeader title="Rendimiento" underlineColor="#dc0014" />

      {/* User Info & Logout - Absolute top right (desktop) or stacked (mobile) */}
      <div className="absolute top-6 right-6 z-[110] flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conectado como</span>
          <span className="text-xs font-bold text-gray-700">{user?.email}</span>
        </div>
        <button
          onClick={() => logout()}
          className="p-2 bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl border border-gray-200 transition-all shadow-sm"
          title="Cerrar sesión"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Tags Filter Section - Updated with Palette */}
      <div className="flex justify-center items-center gap-2 px-4 pt-2 pb-0 relative z-50">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setSelectedTags([])}
            className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${selectedTags.length === 0
              ? 'bg-black text-white border-black shadow-lg'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-black'
              }`}
          >
            Todos
          </button>
          {(() => {
            const tagsToShow = showAllTags ? allTags.filter(t => t !== 'TODO').sort() : coloredTags.filter(t => t !== 'TODO').sort();

            return (
              <>
                {tagsToShow.map(tag => (
                  <div key={tag} className="relative group">
                    <div
                      className={`flex items-center rounded-full border transition-all ${selectedTags.includes(tag)
                        ? 'bg-white border-gray-300 shadow-md'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-black'
                        }`}
                      style={selectedTags.includes(tag) && tagColors?.[tag] ? {
                        backgroundColor: tagColors[tag],
                        borderColor: tagColors[tag],
                        boxShadow: `0 0 15px ${tagColors[tag]}44`
                      } : {}}
                    >
                      <button
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${selectedTags.includes(tag) ? 'text-black' : 'text-gray-500 group-hover:text-black'}`}
                      >
                        {tag}
                      </button>

                      {selectedTags.includes(tag) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaletteOpen(paletteOpen === tag ? null : tag);
                          }}
                          className={`pr-3 pl-1 py-1.5 transition-transform hover:scale-125 ${selectedTags.includes(tag) ? 'text-black/60 hover:text-black' : 'text-gray-400 hover:text-black'}`}
                        >
                          <Palette size={10} />
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {paletteOpen === tag && (
                        <>
                          <div
                            className="fixed inset-0 z-[90] cursor-default"
                            onClick={() => setPaletteOpen(null)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-200 p-2.5 rounded-xl flex items-center gap-3 z-[100] shadow-2xl"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Color RGB</span>
                              <input
                                type="color"
                                value={tagColors?.[tag] || '#ffffff'}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setTagColor(tag, e.target.value);
                                }}
                                className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-none"
                              />
                            </div>
                            <div className="w-[1px] h-4 bg-white/10 mx-1" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTagColor(tag, '');
                                setPaletteOpen(null);
                              }}
                              className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform flex items-center justify-center bg-transparent text-gray-400"
                            >
                              <X size={12} />
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                {uncoloredTags.filter(t => t !== 'TODO').length > 0 && (
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black hover:border-gray-400 transition-all flex items-center gap-2"
                  >
                    <Palette size={10} className={showAllTags ? 'rotate-180 transition-transform' : ''} />
                    {showAllTags ? 'Menos' : `+${uncoloredTags.filter(t => t !== 'TODO').length}`}
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Assignees Filter Section */}
      {allAssignees.length > 0 && (
        <div className="flex justify-center items-center gap-2 px-4 pt-2 pb-0 relative z-40">
          <div className="flex flex-wrap gap-2 justify-center">
            {/* Assigned icon handled inside buttons for consistency */}
            {allAssignees.map(a => (
              <div key={a} className="relative">
                <button
                  onClick={() => setSelectedAssignees(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
                  className={`group px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${selectedAssignees.includes(a)
                    ? 'bg-[#dc0014] border-[#dc0014] text-white shadow-md'
                    : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-black'
                    }`}
                  style={selectedAssignees.includes(a) && assigneeColors?.[a] ? {
                    backgroundColor: assigneeColors[a],
                    borderColor: assigneeColors[a],
                    color: '#fff',
                    boxShadow: `0 0 15px ${assigneeColors[a]}66`
                  } : {}}
                >
                  <div className="flex items-center gap-2">
                    <Users size={10} className={selectedAssignees.includes(a) ? "text-white" : "text-gray-500"} />
                    {a}
                    {selectedAssignees.includes(a) && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="hover:scale-125 transition-transform"
                        onClick={(e) => { e.stopPropagation(); setPaletteOpen(paletteOpen === `assignee-${a}` ? null : `assignee-${a}`); }}
                      >
                        <Palette size={10} className="text-white/60 hover:text-white" />
                      </motion.span>
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {paletteOpen === `assignee-${a}` && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-200 p-2.5 rounded-xl flex items-center gap-3 z-[100] shadow-2xl"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Color RGB</span>
                        <input
                          type="color"
                          value={assigneeColors?.[a] || '#B066FF'}
                          onChange={(e) => setAssigneeColor(a, e.target.value)}
                          className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-none"
                        />
                      </div>
                      <div className="w-[1px] h-4 bg-white/10 mx-1" />
                      <button
                        onClick={() => { setAssigneeColor(a, ''); setPaletteOpen(null); }}
                        className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform flex items-center justify-center bg-transparent text-gray-400"
                        title="Quitar color"
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full mx-auto px-6 md:px-12 pb-20 space-y-10 mt-6">
        {/* Module 1: Timeline & Chart Card */}
        <div className="bg-white border border-gray-100 rounded-[3rem] p-8 md:p-12 shadow-sm relative overflow-visible">
          {/* Centered Year Selector & Timeline */}
          <div className="flex flex-col gap-6 relative overflow-visible mb-16">
            <div className="flex justify-center w-full">
              <div className="flex items-center bg-gray-50 border border-gray-200 p-1 rounded-xl">
                <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-1.5 text-gray-400 hover:text-black transition-all"><ChevronLeft size={16} /></button>
                <span className="text-xs font-bold px-4 text-gray-700">{selectedYear}</span>
                <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-1.5 text-gray-400 hover:text-black transition-all"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="relative h-10">
              <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full touch-none" ref={sliderRef}>
                <div className="absolute h-full bg-[#dc0014] rounded-full" style={{ left: `${(visualRange.start / 11) * 100}%`, width: `${((visualRange.end - visualRange.start) / 11) * 100}%` }} />
                {months.map((m, i) => (
                  <div key={m} className="absolute top-1/2 flex flex-col items-center pointer-events-none" style={{ left: `${(i / 11) * 100}%`, transform: 'translateX(-50%)' }}>
                    <div className={`w-0.5 h-1 rounded-full mb-4 ${i >= visualRange.start && i <= visualRange.end ? 'bg-black/40' : 'bg-gray-300'}`} />
                    <span className={`text-[10px] md:text-xs font-bold ${i >= Math.round(visualRange.start) && i <= Math.round(visualRange.end) ? 'text-gray-900 opacity-100 scale-110' : 'text-gray-400 opacity-60'}`}>{m}</span>
                  </div>
                ))}
                <div onPointerDown={() => setActiveHandle('start')} className="absolute top-1/2 w-10 h-10 flex items-center justify-center z-20 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform -translate-x-1/2 -translate-y-1/2 touch-none" style={{ left: `${(visualRange.start / 11) * 100}%` }}>
                  <div className="w-6 h-6 bg-[#dc0014] rounded-full border-[3px] border-white shadow-lg shadow-black/10" />
                </div>
                <div onPointerDown={() => setActiveHandle('end')} className="absolute top-1/2 w-10 h-10 flex items-center justify-center z-20 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform -translate-x-1/2 -translate-y-1/2 touch-none" style={{ left: `${(visualRange.end / 11) * 100}%` }}>
                  <div className="w-6 h-6 bg-[#dc0014] rounded-full border-[3px] border-white shadow-lg shadow-black/10" />
                </div>
              </div>
            </div>
          </div>





        </div>

        {/* Stats Grid */}
        {/* Stats Grid - Now matching the same wrapper of lower blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white border border-gray-100 rounded-[3rem] p-6 md:p-10 group hover:border-[#dc0014]/30 transition-all shadow-sm">
            <p className="text-gray-500 font-bold text-[9px] tracking-[0.3em] mb-4 group-hover:text-[#dc0014] transition-colors">Coste Estimado</p>
            <p className="text-4xl font-bold text-black tracking-tighter mb-1">{metrics.costeEstimado.toLocaleString()}€</p>
            <div className="flex items-center gap-2 mt-4 opacity-50">
              <TrendingUp size={12} />
              <span className="text-[10px] font-bold tracking-widest">Presupuesto proyectado</span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-[3rem] p-6 md:p-10 group hover:border-[#dc0014]/30 transition-all border-l-4 border-l-[#dc0014] shadow-sm">
            <p className="text-[#dc0014] font-bold text-[9px] tracking-[0.3em] mb-4">Coste Real</p>
            <p className="text-4xl font-bold text-[#dc0014] tracking-tighter mb-1">
              {metrics.costeReal.toLocaleString()}€
            </p>
            <div className="flex gap-4 mt-2 mb-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-normal text-gray-400 uppercase tracking-widest">Producción</span>
                <span className="text-sm font-bold text-gray-600">{metrics.productionReal.toLocaleString()}€</span>
              </div>
              <div className="flex flex-col border-l border-gray-200 pl-4">
                <span className="text-[8px] font-normal text-gray-400 uppercase tracking-widest">Tiempo</span>
                <span className="text-sm font-bold text-gray-600">{metrics.timeReal.toLocaleString()}€</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 opacity-50 pt-3 border-t border-gray-100">
              <Clock size={12} className="text-[#dc0014]" />
              <span className="text-[10px] font-black tracking-widest text-[#dc0014]">Inversión ejecutada</span>
            </div>
          </div>
        </div>


        {/* Expenses Section moved here */}
        <div className="bg-white border border-gray-100 rounded-[3rem] p-6 md:p-10 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-gray-700 font-bold text-2xl tracking-tighter mb-2">Gastos fijos anuales</h3>
              <p className="text-gray-500 font-bold text-[10px] tracking-[0.4em]">Estructura de costes (Prorrateado: {((timeRange.end - timeRange.start) + 1)} meses)</p>
            </div>
            <div className="flex flex-col items-end mr-4">
              <span className="text-[10px] font-black tracking-widest text-[#dc0014]">Inversión Proyectos</span>
              <span className="text-xl font-bold text-[#dc0014]">
                {(metrics.productionReal + metrics.timeReal).toLocaleString()}€
              </span>
              <div className="flex gap-2 text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                <span>Prod: {metrics.productionReal.toLocaleString()}€</span>
                <span>•</span>
                <span>Tiem: {metrics.timeReal.toLocaleString()}€</span>
              </div>
            </div>
            <div className="flex flex-col items-end mr-4 border-l border-gray-100 pl-4">
              <span className="text-[10px] font-black tracking-widest text-gray-500">Gastos Fijos</span>
              <span className="text-xl font-bold text-gray-700">
                {(metrics.proratedExpenses || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}€
              </span>
            </div>
            <button
              onClick={() => {
                const newExp = { id: Date.now().toString(), title: 'Nuevo Gasto', amount: 0 };
                applyStateUpdate({ message: 'Añadir nuevo gasto fijo', budgetUpdate: { expenses: [...(budget.expenses || []), newExp] } });
              }}
              className="p-3 bg-gray-100 hover:bg-black hover:text-white hover:scale-110 active:scale-95 transition-all rounded-xl text-gray-600 border border-gray-200"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(budget.expenses || []).map(exp => (
              <div key={exp.id} className="group relative bg-gray-50 border border-gray-200 p-3 rounded-2xl hover:border-black/20 transition-all flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={exp.title}
                    onChange={(e) => {
                      const next = (budget.expenses || []).map(x => x.id === exp.id ? { ...x, title: e.target.value } : x);
                      applyStateUpdate({ message: 'Actualizar nombre de gasto', budgetUpdate: { expenses: next } });
                    }}
                    className="bg-transparent text-sm font-bold text-black outline-none w-full mr-2 hover:text-green-600 transition-colors"
                  />
                  <button
                    onClick={() => {
                      const next = (budget.expenses || []).filter(x => x.id !== exp.id);
                      applyStateUpdate({ message: 'Eliminar gasto fijo', budgetUpdate: { expenses: next } });
                    }}
                    className="text-gray-400 group-hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <TrendingUp size={14} className="rotate-180" /> {/* Just an icon, using trash is better but let's re-use imported if possible or import Trash */}
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {/* Prorated Amount (Big) */}
                  <span className="text-3xl font-black text-black w-full">
                    {(exp.amount / 12 * ((timeRange.end - timeRange.start) + 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}€
                  </span>
                </div>

                {/* Annual Amount (Small/Secondary) */}
                <div className="pt-2 border-t border-gray-200 mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[9px] text-gray-500 tracking-widest font-bold">Anual:</span>

                    <div className="flex items-center bg-white rounded-md border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => {
                          const next = (budget.expenses || []).map(x => x.id === exp.id ? { ...x, amount: Math.max(0, x.amount - 10) } : x);
                          applyStateUpdate({ message: 'Reducir importe de gasto', budgetUpdate: { expenses: next } });
                        }}
                        className="px-1.5 py-0.5 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                      >
                        <ChevronLeft size={10} />
                      </button>
                      <input
                        type="number"
                        value={exp.amount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const next = (budget.expenses || []).map(x => x.id === exp.id ? { ...x, amount: val } : x);
                          applyStateUpdate({ message: 'Actualizar importe de gasto', budgetUpdate: { expenses: next } });
                        }}
                        className="bg-transparent text-[10px] font-bold text-gray-600 outline-none w-12 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:text-black transition-colors"
                      />
                      <button
                        onClick={() => {
                          const next = (budget.expenses || []).map(x => x.id === exp.id ? { ...x, amount: x.amount + 10 } : x);
                          applyStateUpdate({ message: 'Aumentar importe de gasto', budgetUpdate: { expenses: next } });
                        }}
                        className="px-1.5 py-0.5 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                      >
                        <ChevronRight size={10} />
                      </button>
                    </div>
                    <span className="text-[9px] text-gray-500 font-bold">€</span>
                  </div>
                </div>
              </div>
            ))}
            {(budget.expenses || []).length === 0 && (
              <div className="col-span-full py-8 text-center border border-dashed border-gray-300 rounded-2xl text-gray-400 text-[10px] tracking-widest">
                No hay gastos registrados
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white border border-gray-100 rounded-[3rem] p-6 md:p-10 shadow-sm relative overflow-hidden">
          <div className={`flex items-center justify-between gap-4 ${documents.length === 0 ? 'mb-4' : 'mb-10'}`}>
            <div>
              <h3 className={`${documents.length === 0 ? 'text-lg' : 'text-2xl'} font-bold text-gray-700 mb-2 tracking-tighter`}>Archivos de contexto</h3>
              {documents.length > 0 && <p className="text-gray-500 font-bold text-[10px] tracking-[0.2em]">Base de conocimiento extendida para la IA.</p>}
            </div>
            <label className={`cursor-pointer flex items-center justify-center gap-3 bg-black hover:bg-gray-800 transition-all text-white font-black ${documents.length === 0 ? 'px-4 py-2 text-[8px]' : 'px-8 py-4 text-[10px]'} rounded-2xl tracking-widest shadow-xl active:scale-95`}>
              <Upload size={documents.length === 0 ? 12 : 16} />
              <span>Subir documento</span>
              <input type="file" className="hidden" accept=".pdf,.txt,.md" onChange={input => handleFileUpload(input as any)} />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc, idx) => (
              <div key={idx} className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-gray-50 border border-gray-200 group hover:border-[#dc0014]/20 transition-all cursor-default">
                <div className="bg-white border border-gray-200 p-4 rounded-xl text-black group-hover:scale-110 group-hover:bg-[#dc0014] group-hover:text-white transition-all">
                  <FileText size={20} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-black font-bold text-[12px] truncate mb-0.5">{doc}</p>
                  <p className="text-[8px] text-gray-500 font-black tracking-widest uppercase">{doc.split('.').pop()} Documento</p>
                </div>
              </div>
            ))}
            {documents.length === 0 && (
              <div className="col-span-full py-6 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-[2.5rem] opacity-40 grayscale">
                <FileText size={24} className="mb-2" />
                <p className="text-[10px] font-black tracking-[0.4em]">Repositorio vacío</p>
              </div>
            )}
          </div>
        </div >

        {/* Notificaciones & Permisos */}
        <div className="bg-white border border-gray-100 rounded-[3rem] p-6 md:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
            <Bell size={120} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl text-center md:text-left">
              <h3 className="text-2xl font-bold text-gray-700 mb-2 tracking-tighter">Sistema de alertas</h3>
              <p className="text-gray-500 font-bold text-sm leading-relaxed mb-4">
                Activa las notificaciones para que la IA de 3V te avise automáticamente de tus próximas actividades, sesiones de trabajo y fechas límite.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <button
                  onClick={enableNotifications}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${fcmToken ? 'bg-[#dc0014]/10 border-[#dc0014]/20 cursor-default' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 hover:scale-105'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${fcmToken ? 'bg-[#dc0014] shadow-[0_0_10px_#dc0014]' : 'bg-red-500 animate-pulse'}`} />
                  <span className={`text-[10px] font-black tracking-widest ${fcmToken ? 'text-[#dc0014]' : 'text-gray-500'}`}>
                    {fcmToken ? 'Notificaciones activas' : 'Activar notificaciones'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-100/50 border border-transparent rounded-[3rem] p-6 md:p-10 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-600 mb-2 tracking-tighter">Gestión de datos</h3>
              <p className="text-gray-500 font-bold text-sm leading-relaxed">
                Administra tu base de datos local. Exporta una copia de seguridad, importa datos existentes o reinicia tu entorno.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              {/* Export Button */}
              <button
                onClick={() => {
                  const data = {
                    events,
                    projects,
                    budget,
                    tagColors,
                    documents,
                    chatHistory,
                    exportDate: new Date().toISOString()
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `3v_backup_${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Download size={14} /> Exportar
              </button>

              {/* Import Button */}
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (re) => {
                      try {
                        const content = JSON.parse(re.target?.result as string);
                        // Basic validation
                        if (content.events || content.projects) {
                          if (confirm('¿Estás seguro de que quieres importar estos datos? Se sobrescribirá la configuración actual.')) {
                            applyStateUpdate({
                              message: 'Importación de backup de datos',
                              newEvents: content.events,
                              newProjects: content.projects,
                              budgetUpdate: content.budget
                            });
                            // For complex cases like tags or history, we might need a resetState prop in AppContext
                            // But applyStateUpdate with merge works for basic sync
                            alert('Datos importados con éxito. Refrescando vinculaciones...');
                          }
                        } else {
                          alert('El archivo no parece ser un backup válido de 3V.');
                        }
                      } catch (err) {
                        alert('Error al leer el archivo JSON.');
                      }
                    };
                    reader.readAsText(file);
                  };
                  input.click();
                }}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-[#dc0014] hover:bg-red-50 transition-all"
              >
                <Upload size={14} /> Importar
              </button>

              {/* Delete Button */}
              <button
                onClick={() => {
                  if (confirm('⚠️ PELIGRO: ¿Estás seguro de que quieres BORRAR TODOS los datos? Esta acción no se puede deshacer.')) {
                    if (confirm('CONFIRMACIÓN FINAL: Se eliminarán todos los proyectos y eventos del calendario.')) {
                      applyStateUpdate({
                        message: 'BORRADO TOTAL DE DATOS',
                        deletedEvents: events.map(e => e.id),
                        deletedProjects: projects.map(p => p.id),
                        budgetUpdate: { assigned: 10000, estimated: 0, expenses: [], hourlyRate: 80 }
                      });
                    }
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-2xl text-xs font-bold hover:bg-red-600 transition-all shadow-lg"
              >
                <Trash2 size={14} /> Borrar todo
              </button>
            </div>
          </div>
        </div>

        {/* Activity Log Section */}
        <div className="pb-12">
          <div className="bg-white border border-gray-100 rounded-[3rem] p-6 md:p-10 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-gray-700 font-bold text-2xl tracking-tighter mb-2">Log de Actividad</h3>
                <p className="text-gray-500 font-bold text-[10px] tracking-[0.4em]">Historial de acciones recientes</p>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <Clock size={20} />
              </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {activityLog && activityLog.length > 0 ? (
                activityLog.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-white border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <p className="text-xs text-gray-600 truncate">
                        <span className="font-bold text-red-600 uppercase text-[9px] mr-2">{log.action.replace('_', ' ')}</span>
                        {log.details}
                      </p>
                    </div>
                    <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest ml-4">{log.userName}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400 text-[10px] tracking-[0.4em] font-bold uppercase">
                  No hay actividad registrada
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
