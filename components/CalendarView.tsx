import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GlassHeader } from './GlassHeader';
import { MarketingEvent } from '../types';
import {
  X, CheckCircle2, Calendar as CalendarIcon, Clock,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Palette,
  Trash2, Grid, Users
} from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { expandRecurringEvents } from '../utils/recurrence';
import {
  parseDurationToHours,
  calculateReactiveCost,
  formatDuration,
  mixColors
} from '../utils/cost';

// Sub-components
import { DayView } from './calendar/DayView';
import { WeekView } from './calendar/WeekView';
import { MonthView } from './calendar/MonthView';
import { YearView } from './calendar/YearView';
import { AgendaView } from './calendar/AgendaView';
import { EventModal } from './calendar/EventModal';

export const CalendarView: React.FC = () => {
  const {
    budget, events, projects, toggleEventTask, toggleProjectItem,
    updateEvent, tagColors, setTagColor, assigneeColors,
    setAssigneeColor, deleteEvent
  } = useApp();

  const [filter, setFilter] = useState<string[]>(['TODO']);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MarketingEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<MarketingEvent>>({});
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [showAllTags, setShowAllTags] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState<string | null>(null);
  const [agendaDensity, setAgendaDensity] = useState<number>(1);
  const [resizing, setResizing] = useState<{ id: string, type: 'top' | 'bottom', initialY: number, initialDate: string, initialDuration: number } | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<{ id: string, title: string, start: string, end: string, x: number, y: number, color: string } | null>(null);
  const [hideWeekends, setHideWeekends] = useState(false);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    events.forEach(e => {
      e.tags?.forEach(t => s.add(t));
      if (e.type === 'holiday') s.add('Festivo');
      if (e.type === 'campaign') s.add('Campaña');
    });
    projects.forEach(p => p.tags?.forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [events, projects]);

  const { coloredTags, uncoloredTags } = useMemo(() => {
    return {
      coloredTags: allTags.filter(t => tagColors?.[t]),
      uncoloredTags: allTags.filter(t => !tagColors?.[t])
    };
  }, [allTags, tagColors]);

  const dragControls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);

  const zoomLevels: ('day' | 'week' | 'month' | 'year')[] = ['day', 'week', 'month', 'year'];
  const zoomLabels = { day: 'Día', week: 'Semana', month: 'Mes', year: 'Año' };
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

  const eventsInView = useMemo(() => {
    let start = new Date(viewDate);
    let end = new Date(viewDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (zoomLevel === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      end.setDate(start.getDate() + 6);
    } else if (zoomLevel === 'month') {
      start.setDate(1);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      end = new Date(start);
      end.setDate(start.getDate() + 41);
    } else if (zoomLevel === 'year') {
      start.setMonth(0, 1);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    }

    const expanded = expandRecurringEvents(events, start, end);

    return expanded.filter(e => {
      const d = new Date(e.date);
      if (zoomLevel === 'day') return isSameDay(d, viewDate);
      if (zoomLevel === 'month') return true;
      if (zoomLevel === 'year') {
        return d.getFullYear() === viewDate.getFullYear();
      }
      if (zoomLevel === 'week') return d >= start && d <= end;
      return true;
    });
  }, [events, viewDate, zoomLevel]);

  const filteredEvents = useMemo(() => {
    const list = eventsInView.filter(e => {
      if (filter.includes('TODO')) return true;
      const project = e.projectId ? projects.find(p => p.id === e.projectId) : null;
      const pTags = project?.tags || [];
      const virtualTags = [...e.tags, ...pTags];
      if (e.type === 'holiday' && !virtualTags.includes('Festivo')) virtualTags.push('Festivo');
      if (e.type === 'campaign' && !virtualTags.includes('Campaña')) virtualTags.push('Campaña');
      return virtualTags.some(t => filter.includes(t));
    });

    const withAssignees = list.filter(e => {
      if (selectedAssignees.length === 0) return true;
      const project = e.projectId ? projects.find(p => p.id === e.projectId) : null;
      const pAsgs = project?.assignees || [];
      const combinedAsgs = [...(e.assignees || []), ...pAsgs];
      return combinedAsgs.some(a => selectedAssignees.includes(a));
    });

    return withAssignees.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [eventsInView, filter, selectedAssignees]);

  const allAssignees = useMemo(() => {
    const s = new Set<string>();
    events.forEach(e => e.assignees?.forEach(a => s.add(a)));
    projects.forEach(p => p.assignees?.forEach(a => s.add(a)));
    return Array.from(s).sort();
  }, [events, projects]);

  const toggleFilter = (tag: string) => {
    if (tag === 'TODO') { setFilter(['TODO']); return; }
    setFilter(prev => {
      const filtered = prev.filter(t => t !== 'TODO');
      if (filtered.includes(tag)) {
        const next = filtered.filter(t => t !== tag);
        return next.length === 0 ? ['TODO'] : next;
      } else return [...filtered, tag];
    });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (viewMode === 'agenda') {
      if (direction === 'in' && agendaDensity < 1) setAgendaDensity(agendaDensity + 1);
      else if (direction === 'out' && agendaDensity > 0) setAgendaDensity(agendaDensity - 1);
      return;
    }
    const currentIndex = zoomLevels.indexOf(zoomLevel);
    if (direction === 'in' && currentIndex > 0) setZoomLevel(zoomLevels[currentIndex - 1]);
    else if (direction === 'out' && currentIndex < zoomLevels.length - 1) setZoomLevel(zoomLevels[currentIndex + 1]);
  };

  const changeDate = (offset: number) => {
    const newDate = new Date(viewDate);
    if (zoomLevel === 'month') newDate.setMonth(newDate.getMonth() + offset);
    else if (zoomLevel === 'year') newDate.setFullYear(newDate.getFullYear() + offset);
    else if (zoomLevel === 'week') newDate.setDate(newDate.getDate() + (offset * 7));
    else if (zoomLevel === 'day') newDate.setDate(newDate.getDate() + offset);
    setViewDate(newDate);
  };

  const handleOpenEvent = (event: MarketingEvent) => {
    setSelectedEvent(event);
    const internalRate = budget.hourlyRate || 20;
    const marketRate = 80;
    const multiplier = (event.assignees && event.assignees.length > 0) ? event.assignees.length : 1;

    const estimatedReactiveCost = calculateReactiveCost(event.duration, marketRate, undefined, multiplier);
    const realReactiveCost = calculateReactiveCost(event.duration, internalRate, undefined, multiplier);

    setEditForm({
      ...event,
      budgetedCost: event.budgetedCost !== undefined ? event.budgetedCost : estimatedReactiveCost,
      realCost: event.realCost !== undefined ? event.realCost : realReactiveCost
    });
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (selectedEvent && editForm.title) {
      const idToUpdate = selectedEvent.masterId || selectedEvent.id;
      const { id, masterId, ...updates } = editForm;
      updateEvent(idToUpdate, updates as Partial<MarketingEvent>);
      setIsEditing(false);
      setSelectedEvent(null);
    }
  };

  const getEventStyle = (event: MarketingEvent) => {
    const virtualTags = [...(event.tags || [])];
    if (event.type === 'holiday' && !virtualTags.includes('Festivo')) virtualTags.push('Festivo');
    if (event.type === 'campaign' && !virtualTags.includes('Campaña')) virtualTags.push('Campaña');

    const colorTags = virtualTags.filter(t => tagColors?.[t]);
    let baseColor = '#9ca3af';
    if (colorTags.length > 0) baseColor = mixColors(colorTags.map(t => tagColors![t]));
    return {
      backgroundColor: `${baseColor}1a`,
      borderColor: `${baseColor}4d`,
      color: baseColor,
      boxShadow: `0 0 10px ${baseColor}1a`
    };
  };

  useEffect(() => {
    if (!resizing) return;
    const onPointerMove = (e: PointerEvent) => {
      const deltaY = e.clientY - resizing.initialY;
      const deltaMinutes = Math.round(deltaY / 50 * 60 / 15) * 15;
      if (resizing.type === 'top') {
        const newDate = new Date(resizing.initialDate);
        newDate.setMinutes(newDate.getMinutes() + deltaMinutes);
        const newDurationMinutes = Math.max(15, resizing.initialDuration - deltaMinutes);
        updateEvent(resizing.id, {
          date: newDate.toISOString(),
          duration: formatDuration(newDurationMinutes)
        });
      } else {
        const newDurationMinutes = Math.max(15, resizing.initialDuration + deltaMinutes);
        updateEvent(resizing.id, {
          duration: formatDuration(newDurationMinutes)
        });
      }
    };
    const onPointerUp = () => setResizing(null);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [resizing, updateEvent]);

  const renderContent = () => {
    if (viewMode === 'agenda') {
      return (
        <AgendaView
          filteredEvents={filteredEvents}
          agendaDensity={agendaDensity}
          tagColors={tagColors}
          onOpenEvent={handleOpenEvent}
          getEventStyle={getEventStyle}
        />
      );
    }

    switch (zoomLevel) {
      case 'day':
        return (
          <DayView
            filteredEvents={filteredEvents}
            updateEvent={updateEvent}
            onOpenEvent={handleOpenEvent}
            getEventStyle={getEventStyle}
            dragControls={dragControls}
            setResizing={setResizing}
          />
        );
      case 'week':
        return (
          <WeekView
            viewDate={viewDate}
            filteredEvents={filteredEvents}
            tagColors={tagColors}
            updateEvent={updateEvent}
            onOpenEvent={handleOpenEvent}
            getEventStyle={getEventStyle}
            hideWeekends={hideWeekends}
          />
        );
      case 'month':
        return (
          <MonthView
            viewDate={viewDate}
            filteredEvents={filteredEvents}
            allEvents={events}
            filter={filter}
            tagColors={tagColors}
            updateEvent={updateEvent}
            onOpenEvent={handleOpenEvent}
            getEventStyle={getEventStyle}
            onSelectCampaign={setSelectedCampaign}
            projects={projects}
          />
        );
      case 'year':
        return (
          <YearView
            viewDate={viewDate}
            filteredEvents={filteredEvents}
            tagColors={tagColors}
            onSelectDate={(d) => { setViewDate(d); setZoomLevel('day'); }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <GlassHeader title="Actividades" underlineColor="#dc0014" />

      {/* Tags Filter Section */}
      <div className="flex justify-center items-center gap-2 px-4 pt-2 pb-0 relative z-30">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setFilter(['TODO'])}
            className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${filter.includes('TODO')
              ? 'bg-[#dc0014] border-[#dc0014] text-white shadow-md'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-black'
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
                        ? 'bg-white border-white shadow-md'
                        : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-black'
                        }`}
                      style={filter.includes(tag) && tagColors?.[tag] ? {
                        backgroundColor: tagColors[tag],
                        borderColor: tagColors[tag],
                        boxShadow: `0 0 15px ${tagColors[tag]}44`
                      } : {}}
                    >
                      <button
                        onClick={() => toggleFilter(tag)}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${filter.includes(tag) ? 'text-black' : 'text-gray-500 group-hover:text-black'}`}
                        style={filter.includes(tag) && tagColors?.[tag] ? { color: 'white' } : {}}
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
                          className={`pr-3 pl-1 py-2 flex items-center justify-center transition-transform hover:scale-125 ${filter.includes(tag) && tagColors?.[tag] ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-black'}`}
                        >
                          <Palette size={14} />
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {paletteOpen === tag && (
                        <>
                          {/* Invisible backdrop to capture clicks outside */}
                          <div
                            className="fixed inset-0 z-[120] cursor-default"
                            onClick={() => setPaletteOpen(null)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-neutral-900 border border-neutral-800 p-3 rounded-2xl flex items-center gap-4 z-[130] shadow-2xl min-w-[150px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Color</span>
                              <input
                                type="color"
                                value={tagColors?.[tag] || '#ffffff'}
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
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black hover:border-gray-400 transition-all flex items-center gap-2"
                  >
                    {showAllTags ? <Palette size={10} className="rotate-180 transition-transform" /> : <Palette size={10} />}
                    {showAllTags ? 'Menos' : `+${uncoloredTags.length}`}
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Assignees Filter Row */}
      {allAssignees.length > 0 && (
        <div className="flex justify-center items-center gap-2 px-4 pt-1 pb-2 relative z-30">
          <div className="flex flex-wrap gap-2 justify-center">
            {allAssignees.map(a => (
              <div key={a} className="relative">
                <button
                  onClick={() => setSelectedAssignees(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
                  className={`group px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${selectedAssignees.includes(a)
                    ? 'bg-[#dc0014] border-[#dc0014] text-white shadow-md'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-black'
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
                        onClick={(e) => { e.stopPropagation(); setPaletteOpen(paletteOpen === `asg-${a}` ? null : `asg-${a}`); }}
                      >
                        <Palette size={10} className="text-white/60 hover:text-white" />
                      </motion.span>
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {paletteOpen === `asg-${a}` && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-neutral-900 border border-neutral-800 p-2.5 rounded-2xl flex items-center gap-3 z-[100] shadow-2xl"
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
                      <button onClick={() => { setAssigneeColor(a, ''); setPaletteOpen(null); }} className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-gray-400">
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

      <div className={`w-full mx-auto p-4 md:p-8 ${zoomLevel === 'year' ? 'max-w-[1400px]' : 'px-6 md:px-12'}`}>
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-center">
            <div className="order-1 flex flex-wrap justify-center items-center gap-4">
              <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#dc0014] text-white' : 'text-gray-400 hover:text-black'}`}><Grid size={18} /></button>
                <button onClick={() => setViewMode('agenda')} className={`p-2 rounded-lg transition-all ${viewMode === 'agenda' ? 'bg-[#dc0014] text-white' : 'text-gray-400 hover:text-black'}`}><CalendarIcon size={18} /></button>
              </div>
              <div className="flex items-center bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                <button onClick={() => handleZoom('in')} disabled={viewMode === 'agenda' ? agendaDensity >= 1 : zoomLevel === 'day'} className="p-2 text-gray-400 hover:text-black"><ZoomIn size={18} /></button>
                <span className="text-sm font-black uppercase tracking-[0.2em] text-gray-700 px-4 min-w-[120px] text-center">{viewMode === 'agenda' ? (agendaDensity === 0 ? 'Compacto' : 'Estándar') : zoomLabels[zoomLevel]}</span>
                <button onClick={() => handleZoom('out')} disabled={viewMode === 'agenda' ? agendaDensity <= 0 : zoomLevel === 'year'} className="p-2 text-gray-400 hover:text-black"><ZoomOut size={18} /></button>
              </div>
            </div>
            {zoomLevel === 'week' && (
              <button
                onClick={() => setHideWeekends(!hideWeekends)}
                className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${hideWeekends ? 'bg-[#dc0014] border-[#dc0014] text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:text-black hover:bg-gray-50'}`}
                title={hideWeekends ? 'Mostrar Fines de Semana' : 'Ocultar Fines de Semana'}
              >
                L-V
              </button>
            )}
            <div className="order-2 flex items-center gap-4 bg-white border border-gray-200 px-5 py-1.5 rounded-2xl shadow-sm">
              <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-black"><ChevronLeft size={18} /></button>
              <span className="text-sm font-black uppercase tracking-[0.2em] text-gray-700 min-w-[150px] md:min-w-[200px] text-center">
                {zoomLevel === 'year' ? `${viewDate.getFullYear()}` : zoomLevel === 'day' ? viewDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-black"><ChevronRight size={18} /></button>
            </div>
          </div>
        </div>
        {renderContent()}
      </div>

      <AnimatePresence>
        {selectedEvent && (
          <EventModal
            event={selectedEvent}
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            editForm={editForm}
            setEditForm={setEditForm}
            projects={projects}
            budget={budget}
            updateEvent={updateEvent}
            deleteEvent={deleteEvent}
            toggleEventTask={toggleEventTask}
            toggleProjectItem={toggleProjectItem}
            onSave={handleSaveEdit}
            getEventStyle={getEventStyle}
            tagColors={tagColors}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCampaign && (
          <>
            <div className="fixed inset-0 z-[150]" onClick={() => setSelectedCampaign(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="fixed z-[200] bg-neutral-900 border p-6 rounded-[2rem] shadow-2xl min-w-[320px] max-w-[450px]"
              style={{
                borderColor: selectedCampaign.color,
                left: Math.min(window.innerWidth - 340, Math.max(20, selectedCampaign.x - 160)),
                top: selectedCampaign.y + 20
              }}
            >
              <h4 className="font-black uppercase tracking-widest text-xs mb-1" style={{ color: selectedCampaign.color }}>Campaña Activa</h4>
              <p className="text-white font-bold text-sm mb-2 leading-tight">{selectedCampaign.title}</p>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon size={10} />
                {new Date(selectedCampaign.start).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {new Date(selectedCampaign.end).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
