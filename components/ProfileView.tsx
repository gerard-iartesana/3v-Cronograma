import React, { useState, useMemo, useRef, useEffect } from 'react';

import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { MetricsChart } from './MetricsChart';
import { GlassHeader } from './GlassHeader';

import { TrendingUp, Clock, ChevronLeft, ChevronRight, Upload, Trash2, Bell, Palette, X, Users, Plus, FileText, LogOut, Download, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { expandRecurringEvents } from '../utils/recurrence';
import { parseDurationToHours, calculateReactiveCost } from '../utils/cost';


export const ProfileView: React.FC = () => {
  const { user, logout } = useAuth();
  const { budget, documents, addDocument, events, applyStateUpdate, projects, tagColors, setTagColor, assigneeColors, setAssigneeColor, activityLog, fcmToken, enableNotifications } = useApp();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const [timeRange, setTimeRange] = useState({ start: 0, end: 11 }); // 0-11 months
  const [paletteOpen, setPaletteOpen] = useState<string | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);
  const [displayMode, setDisplayMode] = useState<'accumulated' | 'detailed'>('accumulated');
  const [breakdownMetric, setBreakdownMetric] = useState<'valor' | 'coste'>('valor');

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

  const metrics = useMemo(() => {
    let valorEstimado = 0;
    let costeEstimado = 0;
    let valorReal = 0;
    let costeReal = 0;
    let productionReal = 0;
    let timeReal = 0;

    const monthsSelected = Math.max(1, (timeRange.end - timeRange.start) + 1);
    const tagBreakdown: Record<string, { proyVal: number, proyCost: number, realVal: number, realCost: number, realProd: number, realTime: number }> = {};
    (selectedTags.length > 0 ? selectedTags : Array.from(allTags).filter(t => t !== 'TODO')).forEach(t => {
      tagBreakdown[t] = { proyVal: 0, proyCost: 0, realVal: 0, realCost: 0, realProd: 0, realTime: 0 };
    });

    filteredEvents.forEach(ev => {
      const rate = budget.hourlyRate || 80;
      const multiplier = (ev.assignees && ev.assignees.length > 0) ? ev.assignees.length : 1;

      if (ev.completed || new Date(ev.date) < new Date()) {
        const rC = calculateReactiveCost(ev.duration, rate, ev.realCost, multiplier, true);
        costeReal += rC;
        timeReal += rC;

        if (!ev.projectId) {
          valorReal += ev.realValue || 0;
        }

        ev.tags.forEach(t => { if (tagBreakdown[t]) { tagBreakdown[t].realCost += rC; tagBreakdown[t].realTime += rC; tagBreakdown[t].realVal += !ev.projectId ? (ev.realValue || 0) : 0; } });
      }

      if (!ev.projectId) {
        const bC = calculateReactiveCost(ev.duration, rate, ev.budgetedCost, multiplier);
        costeEstimado += bC;
        valorEstimado += ev.budgetedValue !== undefined ? ev.budgetedValue : bC;
        ev.tags.forEach(t => { if (tagBreakdown[t]) { tagBreakdown[t].proyCost += bC; tagBreakdown[t].proyVal += ev.budgetedValue !== undefined ? ev.budgetedValue : bC; } });
      }
    });

    const getProjectFactor = (p: any) => {
      const isAnnual = p.tags?.some((t: string) => ['anual', 'mantenimiento', 'fee', 'rrss', 'social media', 'recurrente'].some(kw => t.toLowerCase().includes(kw)));
      if (isAnnual) {
        const d = p.deadline ? new Date(p.deadline) : null;
        if (p.status === 'ongoing' || (d && !isNaN(d.getTime()) && d.getFullYear() === selectedYear)) return { isInRange: true, factor: monthsSelected / 12 };
        return { isInRange: false, factor: 0 };
      }
      if (p.deadline) {
        const d = new Date(p.deadline);
        if (d.getFullYear() === selectedYear && d.getMonth() >= timeRange.start && d.getMonth() <= timeRange.end) return { isInRange: true, factor: 1 };
      }
      return { isInRange: false, factor: 0 };
    };

    projects.forEach(p => {
      const { isInRange, factor } = getProjectFactor(p);
      if (isInRange) {
        const tagMatch = selectedTags.length === 0 || p.tags?.some(t => selectedTags.includes(t));
        const assigneeMatch = selectedAssignees.length === 0 || p.assignees?.some(a => selectedAssignees.includes(a));
        if (!tagMatch || !assigneeMatch) return;

        const rate = budget.hourlyRate || 80;
        const pBudgetedHours = p.budgetedHours || 0;
        const pBudgetedCost = p.budgetedCost !== undefined ? p.budgetedCost : 0;
        const currentProjectedCost = calculateReactiveCost(`${pBudgetedHours}h`, rate, pBudgetedCost);

        valorEstimado += (p.budgetedValue || p.globalValue || 0) * factor;
        costeEstimado += currentProjectedCost * factor;

        p.tags?.forEach(t => { if (tagBreakdown[t]) { tagBreakdown[t].proyVal += (p.budgetedValue || p.globalValue || 0) * factor; tagBreakdown[t].proyCost += currentProjectedCost * factor; } });

        if (p.status === 'completed' || p.status === 'ongoing') {
          const pProd = (p.realProductionCost || 0);
          const pTime = p.realCost !== undefined ? Math.max(0, p.realCost - pProd) : (p.realTimeCost || 0);
          const pCost = p.realCost !== undefined ? p.realCost : (pProd + pTime);

          productionReal += pProd * factor;
          timeReal += pTime * factor;
          costeReal += pCost * factor;
          valorReal += (p.realValue || 0) * factor;

          p.tags?.forEach(t => { if (tagBreakdown[t]) { tagBreakdown[t].realProd += pProd * factor; tagBreakdown[t].realTime += pTime * factor; tagBreakdown[t].realCost += pCost * factor; tagBreakdown[t].realVal += (p.realValue || 0) * factor; } });
        }
      }
    });

    const totalAnnualExpenses = (budget.expenses || []).reduce((acc, exp) => acc + exp.amount, 0);
    const proratedExpenses = (totalAnnualExpenses / 12) * monthsSelected;

    return { valorEstimado, costeEstimado, valorReal, costeReal, productionReal, timeReal, proratedExpenses, tagBreakdown };
  }, [filteredEvents, projects, timeRange, selectedYear, budget.hourlyRate, budget.expenses, selectedTags, allTags]);

  const chartData = useMemo(() => {
    if (displayMode === 'accumulated') {
      return [{ name: 'Total', Estimado: metrics.costeEstimado, RealProduction: metrics.productionReal, RealTime: metrics.timeReal }];
    } else {
      return Object.entries(metrics.tagBreakdown).map(([tag, data]) => ({
        name: tag,
        Estimado: data.proyCost, // Simplified for performance, was causing confusion
        RealProduction: data.realProd,
        RealTime: data.realTime,
      })).filter(d => d.Estimado > 0 || d.RealProduction > 0 || d.RealTime > 0);
    }
  }, [metrics, displayMode]);

  const toggleTag = (tag: string) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (re) => { addDocument(file.name, re.target?.result as string); alert('Contexto cargado.'); };
      reader.readAsText(file);
    } else {
      addDocument(file.name);
      alert('Documento subido.');
    }
  };

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const [visualRange, setVisualRange] = useState({ start: 0, end: 11 });
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(null);

  useEffect(() => { setTimeRange({ start: Math.round(visualRange.start), end: Math.round(visualRange.end) }); }, [visualRange]);

  useEffect(() => {
    if (activeHandle === null) return;
    const handlePointerMove = (e: PointerEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const value = percent * 11;
      setVisualRange(prev => activeHandle === 'start' ? { ...prev, start: Math.min(value, prev.end) } : { ...prev, end: Math.max(value, prev.start) });
    };
    const handlePointerUp = () => setActiveHandle(null);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => { window.removeEventListener('pointermove', handlePointerMove); window.removeEventListener('pointerup', handlePointerUp); };
  }, [activeHandle]);

  return (
    <div className="flex flex-col min-h-full bg-neutral-950 font-['Open_Sans'] select-none relative pb-20">
      <GlassHeader title="Rendimiento" underlineColor="#ffffff" />

      {/* Logout */}
      <div className="absolute top-6 right-6 z-[110] flex items-center gap-3">
        <button onClick={() => logout()} className="p-2 bg-neutral-900 text-gray-400 hover:text-red-500 rounded-xl border border-neutral-800 shadow-sm transition-all">
          <LogOut size={16} />
        </button>
      </div>

      {/* Filters (Standardized) */}
      <div className="w-full flex flex-col items-center gap-4 px-6 mt-4 relative z-50">
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={() => setSelectedTags([])} className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${selectedTags.length === 0 ? 'bg-white text-black border-white' : 'bg-neutral-900 text-gray-400 border-neutral-800'}`}>Todos</button>
          {coloredTags.filter(t => t !== 'TODO').map(tag => (
            <div key={tag} className="relative group flex items-center">
              <div
                className={`flex items-center rounded-full border transition-all ${selectedTags.includes(tag) ? 'bg-white border-white shadow-md' : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-gray-400 hover:text-white'}`}
                style={selectedTags.includes(tag) && tagColors?.[tag] ? { backgroundColor: tagColors[tag], borderColor: tagColors[tag], color: 'white', boxShadow: `0 0 15px ${tagColors[tag]}44` } : {}}
              >
                <button
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 text-xs font-bold transition-all ${selectedTags.includes(tag) ? (tagColors?.[tag] ? 'text-white' : 'text-black') : 'text-gray-400'}`}
                >
                  {tag}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setPaletteOpen(paletteOpen === tag ? null : tag); }}
                  className={`pr-3 pl-1 py-2 flex items-center justify-center transition-all hover:scale-125 ${selectedTags.includes(tag) ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-white'}`}
                >
                  <Palette size={14} />
                </button>
              </div>

              <AnimatePresence>
                {paletteOpen === tag && (
                  <>
                    <div className="fixed inset-0 z-[120]" onClick={() => setPaletteOpen(null)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-neutral-900 border border-neutral-800 p-3 rounded-2xl flex items-center gap-4 z-[130] shadow-2xl min-w-[150px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Color</span>
                        <input
                          type="color"
                          value={tagColors?.[tag] || '#ffffff'}
                          onChange={(e) => setTagColor(tag, e.target.value)}
                          className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer p-0"
                        />
                      </div>
                      <div className="w-[1px] h-4 bg-neutral-800" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setTagColor(tag, ''); setPaletteOpen(null); }}
                        className="w-6 h-6 rounded-full border border-neutral-800 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 transition-all flex items-center justify-center text-gray-500"
                        title="Eliminar color"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ))}
          {uncoloredTags.length > 0 && (
            <button onClick={() => setShowAllTags(!showAllTags)} className="px-3 py-1.5 rounded-full border border-dashed border-neutral-800 text-xs text-gray-400 hover:text-white hover:border-gray-600 transition-all">
              {showAllTags ? 'Ocultar extras' : `+${uncoloredTags.length} más`}
            </button>
          )}
        </div>

        {/* Uncolored Tags (Shown when toggled) */}
        <AnimatePresence>
          {showAllTags && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-2 justify-center overflow-hidden"
            >
              {uncoloredTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${selectedTags.includes(tag) ? 'text-black bg-white border-white' : 'text-gray-500 bg-neutral-900/50 border-neutral-800'}`}
                >
                  {tag}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full mx-auto px-6 md:px-12 space-y-12 mt-10">
        {/* Module 1: Timeline & Chart Card (Premium Styling) */}
        <div className="bg-transparent p-10 md:p-14 relative overflow-visible">
          {/* Centered Year Selector & Timeline */}
          <div className="flex flex-col gap-10 relative overflow-visible mb-16">
            <div className="flex justify-center w-full">
              <div className="flex items-center bg-neutral-800 border border-neutral-700 p-1 rounded-xl">
                <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-1.5 text-gray-400 hover:text-white transition-all"><ChevronLeft size={16} /></button>
                <span className="text-xs font-bold px-4 text-gray-200">{selectedYear}</span>
                <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-1.5 text-gray-400 hover:text-white transition-all"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="relative h-10">
              <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-1 bg-neutral-800 rounded-full touch-none" ref={sliderRef}>
                <div className="absolute h-full bg-white rounded-full" style={{ left: `${(visualRange.start / 11) * 100}%`, width: `${((visualRange.end - visualRange.start) / 11) * 100}%` }} />
                {months.map((m, i) => (
                  <div key={m} className="absolute top-1/2 flex flex-col items-center pointer-events-none" style={{ left: `${(i / 11) * 100}%`, transform: 'translateX(-50%)' }}>
                    <div className={`w-0.5 h-1 rounded-full mb-4 ${i >= visualRange.start && i <= visualRange.end ? 'bg-white/40' : 'bg-neutral-700'}`} />
                    <span className={`text-[10px] md:text-xs font-bold ${i >= Math.round(visualRange.start) && i <= Math.round(visualRange.end) ? 'text-white opacity-100 scale-110' : 'text-gray-500 opacity-60'}`}>{m}</span>
                  </div>
                ))}
                <div onPointerDown={() => setActiveHandle('start')} className="absolute top-1/2 w-10 h-10 flex items-center justify-center z-20 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform -translate-x-1/2 -translate-y-1/2 touch-none" style={{ left: `${(visualRange.start / 11) * 100}%` }}>
                  <div className="w-6 h-6 bg-white rounded-full border-[3px] border-black shadow-lg shadow-black/10" />
                </div>
                <div onPointerDown={() => setActiveHandle('end')} className="absolute top-1/2 w-10 h-10 flex items-center justify-center z-20 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform -translate-x-1/2 -translate-y-1/2 touch-none" style={{ left: `${(visualRange.end / 11) * 100}%` }}>
                  <div className="w-6 h-6 bg-white rounded-full border-[3px] border-black shadow-lg shadow-black/10" />
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Section Header with Mode Toggle */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-16 mb-10">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-white" />
              <h2 className="text-3xl font-bold text-white">Métricas</h2>
            </div>

            <div className="flex items-center bg-neutral-800 border border-neutral-700 p-1.5 rounded-2xl self-start md:self-auto">
              <button
                onClick={() => setDisplayMode('accumulated')}
                className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${displayMode === 'accumulated' ? 'bg-neutral-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Global
              </button>
              <button
                onClick={() => setDisplayMode('detailed')}
                className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${displayMode === 'detailed' ? 'bg-neutral-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Desglose
              </button>
            </div>
          </div>

          <div className="w-full h-[450px]">
            <MetricsChart data={chartData} displayMode={displayMode} />
          </div>
        </div>

        {/* Stats Grid - Bold and Larger Titles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-neutral-900 border-l-[6px] border-neutral-600 p-10 md:p-12 hover:border-white/30 shadow-sm transition-all group rounded-[2.5rem]">
            <h3 className="text-gray-500 font-bold text-xl mb-6 group-hover:text-white">Coste Estimado</h3>
            <p className="text-5xl font-bold text-neutral-500 tracking-tight">{metrics.costeEstimado.toLocaleString()}€</p>
            <div className="flex items-center gap-2 mt-6 text-sm text-gray-400 font-normal">
              <TrendingUp size={14} /> <span>Presupuesto proyectado</span>
            </div>
          </div>

          <div className="bg-neutral-900 border-r-[6px] border-white p-10 md:p-12 shadow-sm group rounded-[2.5rem]">
            <h3 className="text-white font-bold text-xl mb-6">Coste Real</h3>
            <p className="text-5xl font-bold text-white tracking-tight">{metrics.costeReal.toLocaleString()}€</p>
            <div className="flex gap-10 mt-8">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Producción</p>
                <p className="text-2xl font-bold text-gray-200">{metrics.productionReal.toLocaleString()}€</p>
              </div>
              <div className="border-l border-neutral-800 pl-10">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Tiempo</p>
                <p className="text-2xl font-bold text-gray-200">{metrics.timeReal.toLocaleString()}€</p>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses - Bold titles and regular details */}
        <div className="bg-neutral-900 border border-neutral-800 p-10 md:p-12 shadow-sm rounded-[2.5rem]">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h3 className="text-3xl font-bold text-white mb-2">Gastos fijos anuales</h3>
              <p className="text-sm text-gray-400 font-normal">Estructura de costes (Prorrateado: {((timeRange.end - timeRange.start) + 1)} meses)</p>
            </div>
            <button onClick={() => { const newExp = { id: Date.now().toString(), title: 'Nuevo Gasto', amount: 0 }; applyStateUpdate({ message: 'Añadir gasto', budgetUpdate: { expenses: [...(budget.expenses || []), newExp] } }); }} className="p-4 bg-neutral-800 text-gray-400 hover:bg-white hover:text-black rounded-2xl transition-all shadow-sm">
              <Plus size={24} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {(budget.expenses || []).map(exp => (
              <div key={exp.id} className="bg-neutral-950 p-8 rounded-[2.5rem] border border-neutral-800 group relative">
                <div className="flex justify-between items-start mb-6">
                  <input value={exp.title} onChange={e => { const next = budget.expenses?.map(x => x.id === exp.id ? { ...x, title: e.target.value } : x); applyStateUpdate({ message: 'Act. gasto', budgetUpdate: { expenses: next } }); }} className="bg-transparent font-bold text-xl text-gray-200 outline-none w-full" />
                  <button onClick={() => { const next = budget.expenses?.filter(x => x.id !== exp.id); applyStateUpdate({ message: 'Borrar gasto', budgetUpdate: { expenses: next } }); }} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                </div>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold text-white">{(exp.amount / 12 * ((timeRange.end - timeRange.start) + 1)).toFixed(0)}€</span>
                  <span className="text-sm text-gray-500 font-normal mb-1.5">Prorrateado</span>
                </div>
                <div className="mt-6 pt-6 border-t border-neutral-800 flex items-center gap-3">
                  <span className="text-xs text-gray-500 font-bold uppercase">Anual:</span>
                  <div className="flex items-center bg-neutral-900 px-4 py-2 rounded-none border border-neutral-800 focus-within:border-white transition-all">
                    <input type="number" value={exp.amount} onChange={e => { const val = parseFloat(e.target.value) || 0; const next = budget.expenses?.map(x => x.id === exp.id ? { ...x, amount: val } : x); applyStateUpdate({ message: 'Act. importe', budgetUpdate: { expenses: next } }); }} className="bg-transparent text-sm font-bold text-white w-20 outline-none" />
                    <span className="text-sm font-bold text-gray-500 ml-1">€</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Documents (Single Module) */}
        <div className="bg-neutral-900 border border-neutral-800 p-10 md:p-12 shadow-sm rounded-[2.5rem]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
            <div>
              <h3 className="text-3xl font-bold text-white mb-2">Archivos de contexto</h3>
              <p className="text-sm text-gray-400 font-normal">Base de conocimiento para potenciar tu IA Assistant</p>
            </div>
            <label className="cursor-pointer bg-white text-black px-10 py-5 font-bold text-sm shadow-xl hover:bg-neutral-100 transition-all active:scale-95 flex items-center gap-3">
              <Upload size={20} /> Subir documento
              <input type="file" className="hidden" accept=".pdf,.txt,.md" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {documents.map((doc, idx) => (
              <div key={idx} className="bg-neutral-950 border border-neutral-800 p-8 flex items-center gap-5 group hover:border-white/30 transition-all">
                <div className="p-5 bg-neutral-800 text-gray-400 group-hover:bg-white group-hover:text-black transition-all shadow-sm">
                  <FileText size={24} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-gray-200 truncate mb-1">{doc}</p>
                  <p className="text-[10px] text-white font-bold uppercase tracking-wider">IA Active Context</p>
                </div>
                <button onClick={() => applyStateUpdate({ message: 'Eliminar doc', deletedDocuments: [doc] })} className="text-gray-300 hover:text-red-500 transition-all p-2"><Trash2 size={18} /></button>
              </div>
            ))}
            {documents.length === 0 && (
              <div className="col-span-full flex flex-col items-center py-20 bg-neutral-950 border-2 border-dashed border-neutral-800">
                <Sparkles size={48} className="text-white opacity-20 mb-6" />
                <p className="text-sm font-bold text-gray-400">Tu repositorio de contexto está vacío</p>
              </div>
            )}
          </div>
        </div>

        {/* Notifications & Data Management (Bottom refined) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Notifications */}
          <div className="bg-neutral-900 border border-neutral-800 p-10 md:p-12 shadow-sm overflow-hidden relative rounded-[2.5rem]">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03]"><Bell size={120} /></div>
            <h3 className="text-2xl font-bold text-white mb-4">Alertas inteligentes</h3>
            <p className="text-gray-400 leading-relaxed mb-8 text-sm font-normal">Activa las notificaciones para que la IA de BSC te avise automáticamente de tus próximas actividades y fechas límite.</p>
            <button onClick={enableNotifications} className={`px-8 py-4 rounded-none transition-all shadow-md ${fcmToken ? 'bg-white/10 text-white border border-white/20' : 'bg-neutral-800 text-gray-400 hover:bg-white hover:text-black'}`}>
              {fcmToken ? '✓ Notificaciones activas' : 'Habilitar notificaciones'}
            </button>
          </div>

          {/* Activity Log Link/Mini View */}
          <div className="bg-neutral-900 border border-neutral-800 p-10 md:p-12 shadow-sm overflow-hidden relative rounded-[2.5rem]">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03]"><Clock size={120} /></div>
            <h3 className="text-2xl font-bold text-white mb-4">Registro reciente</h3>
            <div className="space-y-4">
              {activityLog && activityLog.slice(0, 3).map((log) => (
                <div key={log.id} className="flex items-center gap-4 text-xs font-normal text-gray-500">
                  <span className="font-bold text-red-600 min-w-[40px]">{new Date(log.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="truncate">{log.details}</span>
                </div>
              ))}
              {!activityLog || activityLog.length === 0 && <p className="text-xs text-gray-400 font-normal">No hay actividad reciente</p>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
