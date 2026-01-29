import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { GlassHeader } from './GlassHeader';
import { CheckCircle2, Circle, Layout, ClipboardList, Clock, Info, Banknote, Calendar, Plus, Trash2, Edit3, ArrowRight, ChevronRight, ChevronLeft, ChevronDown, Lightbulb, RotateCw, Check, Cog, Palette, X, TrendingUp, TrendingDown, Filter, Calculator, Sparkles, Download, Upload, Settings, Bell, Users, FileText, Edit, Save, Briefcase, Tag, AlertCircle, GripVertical } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Project, MarketingEvent } from '../types';
import { expandRecurringEvents } from '../utils/recurrence';
import { parseDurationToHours, calculateReactiveCost, formatDuration } from '../utils/cost';

interface ProjectCardProps {
  project: Project;
  isExpanded: boolean;
  onToggle: () => void;
  dedicatedEvents: MarketingEvent[];
  toggleProjectItem: (projectId: string, itemId: string) => void;
  deleteProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  addProject: (project: Project) => void;
  deleteEvent: (id: string) => void;
}


const NumberInput = ({ value, onChange, step = 1, suffix = '' }: { value: number, onChange: (val: number) => void, step?: number, suffix?: string }) => (
  <div className="flex items-center bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden w-full h-[46px]">
    <button type="button" onClick={() => onChange(value - step)} className="h-full px-3 text-gray-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center justify-center"><ChevronLeft size={16} /></button>
    <div className="flex-1 flex items-center justify-center gap-1 h-full relative">
      <input type="number" value={Math.round(value * 100) / 100} onChange={e => onChange(parseFloat(e.target.value) || 0)} className="bg-transparent text-white font-bold text-center outline-none w-full h-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
      {suffix && <span className="absolute right-2 text-[10px] text-gray-500 font-bold pointer-events-none">{suffix}</span>}
    </div>
    <button type="button" onClick={() => onChange(value + step)} className="h-full px-3 text-gray-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center justify-center"><ChevronRight size={16} /></button>
  </div>
);

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isExpanded,
  onToggle,
  dedicatedEvents,
  toggleProjectItem,
  deleteProject,
  updateProject,
  addProject,
  deleteEvent
}) => {
  const { budget, tagColors } = useApp();
  // Move calculation logic inside useEffect to avoid render-time dependency issues
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Project>(project);

  React.useEffect(() => {
    if (isEditing) {
      // Recalculate cost when entering edit mode to ensure fresh data if not manually set
      // But do NOT overwrite if user has already edited.
      // Actually, just syncing initial state when opening edit is enough.
      // We will do it in the render or a specific effect if needed.
      // For now, let's keep it simple: initial state is project.
    }
  }, [isEditing]);

  React.useEffect(() => {
    if (!isExpanded) setIsEditing(false);
  }, [isExpanded]);





  // Helper to expand events for accurate calculation
  const expandedEvents = React.useMemo(() => {
    // Determine expansion range based on project context or defaults
    // If project has deadline, use it. Otherwise, assume reasonable window or use recurrence end.
    const start = new Date(new Date().getFullYear() - 1, 0, 1); // 1 year ago? or just enough to cover past
    const end = project.deadline ? new Date(project.deadline) : new Date(new Date().getFullYear() + 2, 11, 31); // 2 years future

    // We only pass the "dedicatedEvents" (which are masters if recurrence).
    // The expander will return instances.
    return expandRecurringEvents(dedicatedEvents, start, end);
  }, [dedicatedEvents, project.deadline]);

  const totalHours = expandedEvents.reduce((acc, ev) => {
    return acc + parseDurationToHours(ev.duration);
  }, 0);

  const handleCreateFromClone = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = `proj-${Date.now()}`;
    const clonedProject: Project = {
      ...project,
      id: newId,
      status: 'ongoing',
      title: `${project.title} (Copia)`,
      checklist: (project.checklist || []).map(c => ({
        ...c,
        id: `ck-${Math.random().toString(36).substr(2, 4)}`,
        done: false
      }))
    };
    addProject(clonedProject);
  };

  const handleStatusMove = (e: React.MouseEvent, newStatus: Project['status']) => {
    e.stopPropagation();
    updateProject(project.id, { status: newStatus });
  };

  const handleSaveEdit = () => {
    updateProject(project.id, editForm);
    setIsEditing(false);
  };

  const isTemplate = project.status === 'template';

  const getProjectCost = () => {
    const internalRate = budget.hourlyRate || 20;
    const marketRate = 80; // Senior market rate

    const activityMetrics = expandedEvents.reduce((acc, ev) => {
      const multiplier = (ev.assignees && ev.assignees.length > 0) ? ev.assignees.length : 1;
      const hours = parseDurationToHours(ev.duration);

      const bV = ev.budgetedValue !== undefined ? ev.budgetedValue : Math.round(hours * marketRate * multiplier);
      const bC = calculateReactiveCost(ev.duration, marketRate, ev.budgetedCost, multiplier);
      const rV = ev.realValue !== undefined ? ev.realValue : 0;

      const isPast = new Date(ev.date) < new Date();
      const rC = isPast ? calculateReactiveCost(ev.duration, internalRate, ev.realCost, multiplier) : 0;

      return {
        budgetedValue: acc.budgetedValue + bV,
        budgetedCost: acc.budgetedCost + bC,
        realValue: acc.realValue + rV,
        realCost: acc.realCost + rC
      };
    }, { budgetedValue: 0, budgetedCost: 0, realValue: 0, realCost: 0 });

    // Spent: Past or Completed sessions
    const costSpent = expandedEvents.filter(ev => ev.completed || new Date(ev.date) < new Date()).reduce((acc, ev) => {
      const multiplier = (ev.assignees && ev.assignees.length > 0) ? ev.assignees.length : 1;
      return acc + calculateReactiveCost(ev.duration, internalRate, ev.realCost, multiplier);
    }, 0);

    const hoursSpent = expandedEvents.filter(ev => ev.completed || new Date(ev.date) < new Date()).reduce((acc, ev) => acc + parseDurationToHours(ev.duration), 0);

    // Total Budgeted: Manual budgetedHours or all scheduled sessions
    const hoursTotal = project.budgetedHours || totalHours;
    const budgetedValue = project.budgetedValue !== undefined ? project.budgetedValue : (project.globalValue || activityMetrics.budgetedValue);
    const budgetedCost = project.budgetedCost !== undefined ? project.budgetedCost : Math.round(hoursTotal * marketRate); // Use marketRate for budgeted cost

    const realValue = project.realValue !== undefined && project.realValue > 0 ? project.realValue : activityMetrics.realValue;

    return {
      budgetedValue,
      budgetedCost,
      realValue,
      realCost: project.realCost !== undefined ? project.realCost : ((project.realProductionCost || 0) + (project.realTimeCost || 0) || costSpent),
      hoursSpent,
      hoursTotal: project.budgetedHours || totalHours,
      isAI: (budgetedValue === 0 && activityMetrics.budgetedValue === 0)
    };
  };

  const projectCost = getProjectCost();

  // Sync edit form when project or cost changes, ONLY if not currently editing (to avoid overwriting user typings)
  // OR: Initialize correctly when entering edit mode.
  // Let's use a simpler approach: When setIsEditing(true), we update the form.

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditForm({
      ...project,
      budgetedCost: project.budgetedCost || projectCost.budgetedCost,
      realProductionCost: project.realProductionCost || 0,
      realTimeCost: project.realTimeCost || projectCost.realCost,
      realCost: project.realCost || (project.realProductionCost || 0) + (project.realTimeCost || 0) || projectCost.realCost
    });
    setIsEditing(true);
  };



  return (
    <motion.div
      layout
      onClick={(e) => { e.stopPropagation(); if (!isEditing) onToggle(); }}
      className={`group relative border ${isExpanded ? 'border-[#dc0014] shadow-md' : isTemplate ? 'border-neutral-800' : 'border-neutral-800'} ${isTemplate ? 'bg-neutral-900 hover:bg-neutral-800' : 'bg-neutral-900 hover:bg-neutral-800'} rounded-[2rem] overflow-hidden transition-all ${isTemplate ? 'mb-1' : 'mb-2'} z-10 hover:z-20 ${isEditing ? '' : 'cursor-pointer'}`}
    >
      <div className={`${isTemplate ? 'px-4 py-3' : 'px-5 pt-2 pb-3'}`}>
        <div className={`flex justify-between ${isTemplate ? 'items-center' : 'items-start'}`}>
          <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <h3
              className={`text-[16px] font-bold ${isTemplate ? 'text-gray-500 hover:text-gray-300' : 'text-gray-200 hover:text-[#dc0014]'} transition-colors leading-tight`}
            >
              {project.title}
            </h3>

            {(project.tags && project.tags.length > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {project.tags
                  .filter(tag => isExpanded || tagColors?.[tag])
                  .map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full border border-neutral-800 text-[8px] font-black text-gray-400 uppercase tracking-widest bg-neutral-900"
                      style={tagColors?.[tag] ? { color: tagColors[tag], borderColor: `${tagColors[tag]}33` } : {}}
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {!isTemplate && project.deadline && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-900/10 rounded-lg border border-red-900/30">
              <Calendar size={12} className="text-red-400" />
              <span className="text-[10px] font-black text-red-500">
                {new Date(project.deadline).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          )}


          {isTemplate && (
            <div className="flex items-center h-8">
              <button
                onClick={handleCreateFromClone}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-gray-400 shadow-sm hover:border-[#dc0014] hover:text-[#dc0014] transition-all"
                title="Crear Proyecto"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar for Preview (Bottom) */}
      {project.checklist.length > 0 && (
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-neutral-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(project.checklist.filter(i => i.done).length / project.checklist.length) * 100}%` }}
            className="h-full bg-[#dc0014]"
          />
        </div>
      )}

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-neutral-800 bg-neutral-950/50"
          >
            <div className="p-5 space-y-3">
              {!isEditing && (
                <div className="flex items-center justify-end gap-2 -mb-2">
                  {isTemplate && (
                    // Clone Button moved to main card view, removing here to avoid duplication or keeping as alternate
                    // User asked for it "outside". I put it on the right side of the card header.
                    <></>
                  )}
                  <button
                    onClick={startEditing}
                    className="p-1.5 bg-neutral-800 text-gray-400 rounded-lg hover:bg-neutral-700 hover:text-white transition-all border border-neutral-700"
                    title="Editar Proyecto"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              )}

              {isEditing && (
                <div className="flex items-center justify-end gap-2 -mb-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
                    className="p-1.5 bg-neutral-800 text-gray-400 rounded-lg hover:bg-neutral-700 hover:text-white transition-all border border-neutral-700"
                    title="Cancelar Edición"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar proyecto?')) deleteProject(project.id); }}
                    className="p-1.5 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/40 hover:text-red-500 transition-all border border-red-900/30"
                    title="Eliminar Proyecto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-2 text-xl font-black text-white focus:border-[#dc0014] outline-none"
                    placeholder="Título del proyecto"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-2 text-sm text-gray-400 h-20 focus:border-[#dc0014] outline-none leading-relaxed"
                    placeholder="Descripción"
                  />
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">Etiquetas (Enter para añadir)</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                      {editForm.tags?.map(t => (
                        <span key={t} className="flex items-center gap-1 px-2 py-1 bg-neutral-800 text-gray-200 text-[10px] font-bold uppercase rounded-md border border-neutral-700">
                          {t}
                          <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setEditForm({ ...editForm, tags: editForm.tags?.filter(tag => tag !== t) })} />
                        </span>
                      ))}
                      <input
                        type="text"
                        className="bg-transparent border-none text-sm text-white focus:outline-none min-w-[120px]"
                        placeholder="Añadir..."
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim().replace(',', '');
                            if (val && !editForm.tags?.includes(val)) {
                              setEditForm({ ...editForm, tags: [...(editForm.tags || []), val] });
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  {!isTemplate && (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        {/* Bloque Estimado y Real Simplificado */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Estimación</h4>
                            <div>
                              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Coste Estimado (€)</label>
                              <NumberInput
                                value={editForm.budgetedCost || 0}
                                onChange={val => setEditForm({ ...editForm, budgetedCost: Math.max(0, val) })}
                                step={10}
                                suffix="€"
                              />
                            </div>
                          </div>

                          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#dc0014]">Realidad</h4>
                            <div className="grid grid-cols-1 gap-2">
                              <div>
                                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Producción (€)</label>
                                <NumberInput
                                  value={editForm.realProductionCost || 0}
                                  onChange={val => setEditForm(prev => {
                                    const nextProd = Math.max(0, val);
                                    return { ...prev, realProductionCost: nextProd, realCost: nextProd + (prev.realTimeCost || 0) };
                                  })}
                                  step={10}
                                  suffix="€"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Tiempo (€)</label>
                                <NumberInput
                                  value={editForm.realTimeCost || 0}
                                  onChange={val => setEditForm(prev => {
                                    const nextTime = Math.max(0, val);
                                    return { ...prev, realTimeCost: nextTime, realCost: (prev.realProductionCost || 0) + nextTime };
                                  })}
                                  step={10}
                                  suffix="€"
                                />
                              </div>
                              <div className="pt-2 border-t border-neutral-800 flex justify-between items-center">
                                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Total Real:</span>
                                <span className="text-sm font-black text-[#dc0014]">
                                  {(editForm.realCost !== undefined ? editForm.realCost : ((editForm.realProductionCost || 0) + (editForm.realTimeCost || 0))).toLocaleString()}€
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Fecha Límite</label>
                        <input
                          type="date"
                          value={editForm.deadline?.substring(0, 10) || ''}
                          onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3 text-sm text-white outline-none focus:border-[#dc0014]"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2 pt-2 border-t border-neutral-800">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[8px] uppercase tracking-widest text-gray-500 font-bold block">Hoja de Ruta (Checklist)</label>
                      <button
                        onClick={() => setEditForm(prev => ({
                          ...prev,
                          checklist: [...prev.checklist, { id: `ck-${Date.now()}`, label: 'Nueva Tarea', done: false }]
                        }))}
                        className="text-[10px] text-[#dc0014] hover:underline"
                      >
                        + Añadir
                      </button>
                    </div>
                    <Reorder.Group axis="y" values={editForm.checklist || []} onReorder={(newOrder) => setEditForm({ ...editForm, checklist: newOrder })} className="space-y-2">
                      {editForm.checklist.map((item, idx) => (
                        <Reorder.Item key={item.id} value={item} className="flex items-center gap-2">
                          <div className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-white">
                            <GripVertical size={14} />
                          </div>
                          <input
                            type="text"
                            value={item.label}
                            onChange={e => {
                              const newChecklist = [...editForm.checklist];
                              newChecklist[idx] = { ...item, label: e.target.value };
                              setEditForm({ ...editForm, checklist: newChecklist });
                            }}
                            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-[#dc0014]"
                          />
                          <button
                            onClick={() => {
                              const newChecklist = editForm.checklist.filter(i => i.id !== item.id);
                              setEditForm({ ...editForm, checklist: newChecklist });
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </div>
                  <button
                    onClick={handleSaveEdit}
                    className="w-full bg-[#dc0014] text-white font-black py-4 rounded-2xl text-xs uppercase tracking-[0.2em] hover:bg-red-700 transition-all shadow-xl"
                  >
                    Guardar Cambios
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="text-gray-500 font-bold uppercase text-[8px] tracking-[0.3em] mb-1">Descripción</h4>
                    <p className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap">{project.description}</p>
                  </div>

                  {!isTemplate && (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-2">
                      <span className="flex items-center gap-2 text-[12px] font-normal text-gray-500 uppercase tracking-widest leading-none">
                        <span className="text-white font-bold">{project.budgetedCost || 0}€</span> <span className="opacity-50">Est.</span>
                      </span>
                      <span className="flex items-center gap-2 text-[12px] font-normal text-gray-500 uppercase tracking-widest leading-none">
                        <span className="text-[#dc0014] font-bold">{(projectCost.realCost || 0).toFixed(0)}€</span> <span className="opacity-50">Real</span>
                      </span>
                      {(project.realProductionCost !== undefined || project.realTimeCost !== undefined) && project.realProductionCost + project.realTimeCost > 0 && (
                        <div className="flex gap-3 text-[9px] font-normal text-gray-400 uppercase tracking-tighter bg-neutral-800 px-3 py-1 rounded-full border border-neutral-700">
                          <span>Prod: {project.realProductionCost || 0}€</span>
                          <span>Time: {project.realTimeCost || 0}€</span>
                        </div>
                      )}
                      {project.deadline && (
                        <span className="flex items-center gap-2 text-[12px] font-normal text-gray-500 uppercase tracking-widest leading-none ml-auto">
                          <Calendar size={14} className="text-red-500/50" />
                          <span className="text-gray-200">{new Date(project.deadline).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-gray-500 font-bold uppercase text-[8px] tracking-[0.3em]">Hoja de ruta</h4>
                    </div>
                    <div className="space-y-2">
                      {project.checklist.map((item) => (
                        <div
                          key={item.id}
                          onClick={(e) => { e.stopPropagation(); toggleProjectItem(project.id, item.id); }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer hover:border-[#dc0014] transition-all"
                        >
                          {item.done ? <CheckCircle2 className="text-[#dc0014]" size={16} /> : <Circle className="text-gray-300" size={16} />}
                          <span className={`text-xs font-medium ${item.done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.label}</span>
                        </div>
                      ))}
                      {project.checklist.length === 0 && <p className="text-gray-400 italic text-[10px]">Lista vacía.</p>}
                    </div>
                    {project.checklist.length > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Progreso</span>
                          <span className="text-[8px] font-bold text-[#dc0014] uppercase tracking-widest">
                            {Math.round((project.checklist.filter(i => i.done).length / project.checklist.length) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-800 border border-neutral-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(project.checklist.filter(i => i.done).length / project.checklist.length) * 100}%` }}
                            className="h-full bg-[#dc0014] shadow-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {!isTemplate && (
                    <div>
                      <h4 className="text-gray-500 font-bold uppercase text-[8px] tracking-[0.3em] mb-3">Sesiones vinculadas</h4>
                      <div className="flex flex-col gap-2">
                        {dedicatedEvents.length > 0 ? dedicatedEvents.map(e => (
                          <div key={e.id} className="flex items-center justify-between px-3 py-2 bg-neutral-900 rounded-lg border border-neutral-800">
                            <span className="text-[10px] font-bold text-gray-500">
                              {e.title} {e.recurrence ? '(Recurrente)' : ''} ({e.duration || '1h'})
                            </span>
                            <button
                              onClick={(ev) => { ev.stopPropagation(); if (confirm('¿Eliminar actividad vinculada?')) deleteEvent(e.id); }}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )) : (
                          <p className="text-gray-400 italic text-[10px]">Sin sesiones en el calendario.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Move actions */}
                  <div className="flex gap-2 pt-2 items-center">
                    {project.status === 'completed' && (
                      <button
                        onClick={(e) => handleStatusMove(e, 'ongoing')}
                        className="flex-1 py-3 bg-neutral-900 text-white text-[10px] font-black rounded-xl shadow-sm border border-neutral-800 hover:scale-[1.02] transition-all"
                      >
                        Reactivar Proyecto
                      </button>
                    )}
                    {project.status === 'ongoing' && (
                      <button
                        onClick={(e) => handleStatusMove(e, 'completed')}
                        className="flex-1 py-3 bg-[#dc0014] text-white text-[10px] font-black rounded-xl shadow-lg hover:scale-[1.02] transition-all"
                      >
                        Completar Proyecto
                      </button>
                    )}

                    {/* Delete Project Button - Bottom Right - Only in Edit Mode */}
                    {isEditing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar proyecto y sus datos?')) deleteProject(project.id); }}
                        className="p-3 bg-neutral-900 text-red-500 rounded-xl border border-red-900/30 hover:bg-red-900 hover:text-white transition-colors"
                        title="Eliminar Proyecto"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div >
  );
};

export const ProjectListView: React.FC = () => {
  const { projects, toggleProjectItem, events, deleteProject, updateProject, addProject, deleteEvent, tagColors, setTagColor } = useApp();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string[]>(['TODO']);
  const [paletteOpen, setPaletteOpen] = useState<string | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);
  const [sortBy, setSortBy] = useState<'alpha' | 'tag' | 'percent' | 'deadline'>('alpha');

  const allTags = useMemo(() => {
    return Array.from(new Set(projects.flatMap(p => p.tags || []))).sort();
  }, [projects]);

  const { coloredTags, uncoloredTags } = useMemo(() => {
    return {
      coloredTags: allTags.filter(t => tagColors?.[t]),
      uncoloredTags: allTags.filter(t => !tagColors?.[t])
    };
  }, [allTags, tagColors]);

  const columns = [
    { title: 'Propuestas', status: 'template', icon: Lightbulb, color: '#FFD000' },
    { title: 'En curso', status: 'ongoing', icon: RotateCw, color: '#FF7D00' },
    { title: 'Completados', status: 'completed', icon: Check, color: '#dc0014' }
  ];

  const filteredProjects = filter.includes('TODO')
    ? projects
    : projects.filter(p => p.tags?.some(tag => filter.includes(tag)));

  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];
    switch (sortBy) {
      case 'alpha':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'tag':
        return list.sort((a, b) => (a.tags?.[0] || 'zzz').localeCompare(b.tags?.[0] || 'zzz'));
      case 'percent':
        const getPercent = (p: Project) => p.checklist.length === 0 ? 0 : (p.checklist.filter(i => i.done).length / p.checklist.length);
        return list.sort((a, b) => getPercent(b) - getPercent(a));
      case 'deadline':
        return list.sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
      default:
        return list;
    }
  }, [filteredProjects, sortBy]);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950">
      <GlassHeader title="Proyectos" underlineColor="#dc0014" />

      <div className="flex flex-col items-center gap-4 px-4 py-4 relative z-50">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setFilter(['TODO'])}
            className={`px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all ${filter.includes('TODO')
              ? 'bg-white border-white text-black shadow-md'
              : 'bg-neutral-900 border-neutral-800 text-gray-400 hover:bg-neutral-800 hover:text-white'
              }`}
          >
            Todos
          </button>
          {(() => {
            const tagsToShow = showAllTags ? allTags : coloredTags;

            return (
              <>
                {tagsToShow.map((tag: string) => (
                  <div key={tag} className="relative group">
                    <div
                      className={`flex items-center rounded-full border transition-all ${filter.includes(tag)
                        ? 'bg-[#dc0014] border-[#dc0014] shadow-md'
                        : 'bg-neutral-900 border-neutral-800 text-gray-400 hover:bg-neutral-800 hover:text-white'
                        }`}
                      style={filter.includes(tag) && tagColors?.[tag] ? {
                        backgroundColor: tagColors[tag],
                        borderColor: tagColors[tag],
                        boxShadow: `0 0 15px ${tagColors[tag]}44`
                      } : {}}
                    >
                      <button
                        onClick={() => {
                          setFilter(prev => {
                            const filtered = prev.filter(t => t !== 'TODO');
                            if (filtered.includes(tag)) {
                              const next = filtered.filter(t => t !== tag);
                              return next.length === 0 ? ['TODO'] : next;
                            } else return [...filtered, tag];
                          });
                        }}
                        className={`px-3 py-1.5 text-[10px] font-bold transition-colors ${filter.includes(tag) ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}
                      >
                        {tag}
                      </button>

                      {filter.includes(tag) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaletteOpen(paletteOpen === tag ? null : tag);
                          }}
                          className={`pr-3 pl-1 py-1.5 transition-transform hover:scale-125 ${filter.includes(tag) ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-white'}`}
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
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-neutral-900 border border-neutral-800 p-2.5 rounded-2xl flex items-center gap-3 z-[100] shadow-2xl"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-gray-500 tracking-widest">Color RGB</span>
                              <input
                                type="color"
                                value={tagColors?.[tag] || '#32FF7E'}
                                onChange={(e) => setTagColor(tag, e.target.value)}
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
                {uncoloredTags.length > 0 && (
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="px-3 py-1.5 rounded-full border border-dashed border-neutral-700 text-[10px] font-black tracking-widest text-gray-500 hover:text-white hover:border-neutral-500 transition-all flex items-center gap-2"
                  >
                    {showAllTags ? <Palette size={10} className="rotate-180 transition-transform" /> : <Palette size={10} />}
                    {showAllTags ? 'Menos' : `+${uncoloredTags.length}`}
                  </button>
                )}
              </>
            );
          })()}
        </div>

        {/* Sort Buttons */}
        <div className="flex flex-wrap gap-2 justify-center bg-neutral-900 border border-neutral-800 p-1.5 rounded-[1.5rem] shadow-sm">
          <button
            onClick={() => setSortBy('alpha')}
            className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${sortBy === 'alpha' ? 'bg-[#dc0014] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}
          >
            Alfabético
          </button>
          <button
            onClick={() => setSortBy('tag')}
            className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${sortBy === 'tag' ? 'bg-[#dc0014] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}
          >
            TAG
          </button>
          <button
            onClick={() => setSortBy('percent')}
            className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${sortBy === 'percent' ? 'bg-[#dc0014] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}
          >
            %
          </button>
          <button
            onClick={() => setSortBy('deadline')}
            className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${sortBy === 'deadline' ? 'bg-[#dc0014] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}
          >
            DEADLINE
          </button>
        </div>
      </div>

      <div className="p-4 md:p-8 flex flex-col md:flex-row gap-6 overflow-x-auto min-h-[calc(100vh-100px)] click-outside-area" onClick={() => setSelectedProjectId(null)}>
        {columns.map(col => (
          <div
            key={col.status}
            data-status={col.status}
            className="flex-1 min-w-[320px] flex flex-col p-0 rounded-[2.5rem] transition-colors"
          >
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${col.color}11`, color: col.color }}>
                  <col.icon size={18} />
                </div>
                <h2 className="text-base font-bold tracking-tight text-gray-200">{col.title}</h2>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full border border-neutral-800 text-gray-400 bg-neutral-900">
                {filteredProjects.filter(p => p.status === col.status).length}
              </span>
            </div>

            <div className={`flex-1 ${col.status === 'template' ? 'space-y-1.5' : 'space-y-4'}`}>
              <AnimatePresence>
                {sortedProjects.filter(p => p.status === col.status).map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    isExpanded={selectedProjectId === p.id}
                    onToggle={() => setSelectedProjectId(selectedProjectId === p.id ? null : p.id)}
                    dedicatedEvents={events.filter(e => e.projectId === p.id)}
                    toggleProjectItem={toggleProjectItem}
                    deleteProject={deleteProject}
                    updateProject={updateProject}
                    addProject={addProject}
                    deleteEvent={deleteEvent}
                  />
                ))}
              </AnimatePresence>
              {projects.filter(p => p.status === col.status).length === 0 && (
                <div className="p-10 border border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center text-center opacity-50 grayscale">
                  <col.icon size={32} className="mb-3 text-gray-400" />
                  <p className="text-[10px] font-bold tracking-widest text-gray-400">Sin proyectos</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
