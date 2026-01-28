import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Save, Trash2, Layout, Clock, CheckCircle2, Circle, Users, Bell } from 'lucide-react';
import { MarketingEvent, Project, Budget } from '../../types';
import { parseDurationToMinutes, calculateReactiveCost, formatDuration } from '../../utils/cost';

interface EventModalProps {
    event: MarketingEvent | null;
    isOpen: boolean;
    onClose: () => void;
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    editForm: Partial<MarketingEvent>;
    setEditForm: (val: any) => void;
    projects: Project[];
    budget: Budget;
    updateEvent: (id: string, updates: Partial<MarketingEvent>) => void;
    deleteEvent: (id: string) => void;
    toggleEventTask: (eventId: string, taskId: string) => void;
    toggleProjectItem: (projectId: string, itemId: string) => void;
    onSave: () => void;
    getEventStyle: (event: MarketingEvent) => any;
    tagColors?: Record<string, string>;
}

export const EventModal: React.FC<EventModalProps> = ({
    event,
    isOpen,
    onClose,
    isEditing,
    setIsEditing,
    editForm,
    setEditForm,
    projects,
    budget,
    updateEvent,
    deleteEvent,
    toggleEventTask,
    toggleProjectItem,
    onSave,
    getEventStyle,
    tagColors
}) => {
    if (!event || !isOpen) return null;

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) { return dateStr; }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div layoutId={event.id} className="relative bg-white border border-gray-200 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar scroll-smooth">
                <div className="p-8 md:p-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 mr-4">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="w-full bg-white border border-gray-200 text-gray-900 text-3xl font-black rounded-xl px-4 py-3 focus:outline-none focus:border-[#dc0014]" placeholder="Título" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Proyecto</label>
                                            <select value={editForm.projectId || ''} onChange={e => setEditForm({ ...editForm, projectId: e.target.value })} className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#dc0014]"><option value="">(Sin asignar)</option>{projects.map(p => (<option key={p.id} value={p.id}>{p.title}</option>))}</select>
                                        </div>
                                        <div className="flex-1"><label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Fecha y Hora</label><input type="datetime-local" value={editForm.date ? editForm.date.substring(0, 16) : ''} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#dc0014] w-full" /></div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-3xl space-y-3">
                                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#dc0014]">Estimación</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Coste Estimado (€)</label>
                                                    <input type="number" value={editForm.budgetedCost || 0} onChange={e => setEditForm((prev: any) => ({ ...prev, budgetedCost: parseInt(e.target.value) || 0 }))} className="bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#dc0014] w-full" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-3xl space-y-3">
                                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#dc0014]">Realidad</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Coste Real (€)</label>
                                                    <input type="number" value={editForm.realCost || 0} onChange={e => setEditForm((prev: any) => ({ ...prev, realCost: parseInt(e.target.value) || 0 }))} className="bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#dc0014] w-full" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Duración</label>
                                            <div className="flex gap-2">
                                                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 flex-1 focus-within:border-[#dc0014] transition-colors">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        value={Math.floor(parseDurationToMinutes(editForm.duration) / 60)}
                                                        onChange={e => {
                                                            const newH = parseInt(e.target.value) || 0;
                                                            const currentM = parseDurationToMinutes(editForm.duration) % 60;
                                                            const newDuration = formatDuration(newH * 60 + currentM);
                                                            const newCost = editForm.budgetedCost || 0;
                                                            setEditForm((prev: any) => ({
                                                                ...prev,
                                                                duration: newDuration,
                                                                budgetedCost: newCost,
                                                                realCost: newCost
                                                            }));
                                                        }}
                                                        className="bg-transparent text-gray-900 text-sm focus:outline-none w-full py-2 font-bold"
                                                    />
                                                    <span className="text-[10px] text-gray-500 font-bold">h</span>
                                                </div>
                                                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 flex-1 focus-within:border-[#dc0014] transition-colors">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="59"
                                                        placeholder="0"
                                                        value={parseDurationToMinutes(editForm.duration) % 60}
                                                        onChange={e => {
                                                            const newM = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                                            const currentH = Math.floor(parseDurationToMinutes(editForm.duration) / 60);
                                                            const newDuration = formatDuration(currentH * 60 + newM);
                                                            const newCost = editForm.budgetedCost || 0;
                                                            setEditForm((prev: any) => ({
                                                                ...prev,
                                                                duration: newDuration,
                                                                budgetedCost: newCost,
                                                                realCost: newCost
                                                            }));
                                                        }}
                                                        className="bg-transparent text-gray-900 text-sm focus:outline-none w-full py-2 font-bold"
                                                    />
                                                    <span className="text-[10px] text-gray-500 font-bold">min</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">Etiquetas</label>
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                            {editForm.tags?.map(t => (
                                                <span key={t} className="flex items-center gap-1 px-2 py-1 bg-white text-gray-600 border border-gray-200 text-[10px] font-bold uppercase rounded-md shadow-sm">
                                                    {t}
                                                    <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setEditForm((prev: any) => ({ ...prev, tags: prev.tags?.filter((tag: string) => tag !== t) }))} />
                                                </span>
                                            ))}
                                            <input
                                                type="text"
                                                className="bg-transparent border-none text-sm text-black focus:outline-none min-w-[120px]"
                                                placeholder="Añadir..."
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' || e.key === ',') {
                                                        e.preventDefault();
                                                        const val = e.currentTarget.value.trim().replace(',', '');
                                                        if (val && !editForm.tags?.includes(val)) {
                                                            setEditForm((prev: any) => ({ ...prev, tags: [...(prev.tags || []), val] }));
                                                            e.currentTarget.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">Responsables</label>
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                            {editForm.assignees?.map(a => (
                                                <span key={a} className="flex items-center gap-1 px-2 py-1 bg-[#dc0014] text-white text-[10px] font-bold uppercase rounded-md shadow-sm">
                                                    {a}
                                                    <X size={10} className="cursor-pointer hover:text-white" onClick={() => {
                                                        const newAssignees = editForm.assignees?.filter(asg => asg !== a) || [];
                                                        setEditForm((prev: any) => ({ ...prev, assignees: newAssignees }));
                                                    }} />
                                                </span>
                                            ))}
                                            <input
                                                type="text"
                                                className="bg-transparent border-none text-sm text-black focus:outline-none min-w-[120px]"
                                                placeholder="Nombre..."
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' || e.key === ',') {
                                                        e.preventDefault();
                                                        const val = e.currentTarget.value.trim().replace(',', '');
                                                        if (val && !editForm.assignees?.includes(val)) {
                                                            const newAssignees = [...(editForm.assignees || []), val];
                                                            setEditForm((prev: any) => ({ ...prev, assignees: newAssignees }));
                                                            e.currentTarget.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                        <div className="flex-1">
                                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Recurrencia</label>
                                            <select
                                                value={editForm.recurrence?.frequency || 'none'}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === 'none') {
                                                        if (editForm.recurrence) {
                                                            const choice = window.confirm("\u00bfQuieres eliminar las repeticiones futuras?\n\nACEPTAR: Elimina la regla de repetición (s\u00f3lo queda este evento).\nCANCELAR: Mantiene las pasadas pero detiene la repetición hoy.");
                                                            if (choice) {
                                                                setEditForm({ ...editForm, recurrence: undefined });
                                                            } else {
                                                                setEditForm({
                                                                    ...editForm,
                                                                    recurrence: {
                                                                        ...editForm.recurrence!,
                                                                        endDate: new Date().toISOString()
                                                                    }
                                                                });
                                                            }
                                                        } else {
                                                            setEditForm({ ...editForm, recurrence: undefined });
                                                        }
                                                    } else {
                                                        setEditForm({
                                                            ...editForm,
                                                            recurrence: {
                                                                frequency: val as any,
                                                                interval: editForm.recurrence?.interval || 1,
                                                                endDate: editForm.recurrence?.endDate
                                                            }
                                                        });
                                                    }
                                                }}
                                                className="w-full bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#dc0014]"
                                            >
                                                <option value="none">No se repite</option>
                                                <option value="daily">Diaria</option>
                                                <option value="weekly">Semanal</option>
                                                <option value="monthly">Mensual</option>
                                                <option value="yearly">Anual</option>
                                            </select>
                                        </div>
                                        {editForm.recurrence && (
                                            <>
                                                <div className="w-24">
                                                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Intervalo</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={editForm.recurrence.interval}
                                                        onChange={e => setEditForm({ ...editForm, recurrence: { ...editForm.recurrence!, interval: parseInt(e.target.value) || 1 } })}
                                                        className="bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#dc0014] w-full"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Hasta</label>
                                                    <input
                                                        type="date"
                                                        value={editForm.recurrence.endDate?.substring(0, 10) || ''}
                                                        onChange={e => setEditForm({ ...editForm, recurrence: { ...editForm.recurrence!, endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined } })}
                                                        className="bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#dc0014] w-full"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold uppercase tracking-[0.3em] text-sm md:text-md text-gray-900">{formatDate(event.date)}</span>
                                        {event.projectId && (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-600">
                                                <Layout size={10} />
                                                <span className="font-semibold uppercase text-[9px] tracking-widest">
                                                    {projects.find(p => p.id === event.projectId)?.title || 'Proyecto'}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-200 bg-gray-50">
                                            <Clock size={12} className="text-[#dc0014]" />
                                            <span className="font-black uppercase text-xs tracking-[0.2em] text-gray-700">{event.duration || '1h'}</span>
                                        </div>
                                    </div>
                                    <h2 className="text-4xl font-bold text-gray-900 mt-2 leading-tight">{event.title}</h2>
                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                        {event.assignees && event.assignees.length > 0 && (
                                            <div className="flex items-center gap-2 px-2 py-1 bg-white rounded-md border border-gray-200">
                                                <Users size={12} className="text-[#dc0014]" />
                                                <div className="flex gap-1.5">
                                                    {event.assignees.map(a => (
                                                        <span key={a} className="text-gray-700 text-[10px] font-bold uppercase">{a}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {event.tags?.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {event.tags.map(t => (
                                                    <span
                                                        key={t}
                                                        className="px-2 py-1 bg-white text-gray-600 text-[10px] font-bold uppercase rounded-md border border-gray-200"
                                                        style={tagColors?.[t] ? { color: tagColors[t], borderColor: `${tagColors[t]}33`, backgroundColor: `${tagColors[t]}11` } : {}}
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {!isEditing && (
                            <div className="flex items-center gap-1">
                                <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100"><Edit3 size={18} /></button>
                                <button onClick={onClose} className="p-2 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100"><X size={18} /></button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-8 md:px-10 pb-8 space-y-6">
                    {isEditing ? (
                        <textarea
                            value={editForm.description}
                            onChange={e => setEditForm((prev: any) => ({ ...prev, description: e.target.value }))}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-lg mb-6 leading-relaxed font-medium rounded-xl p-4 h-32 focus:outline-none focus:border-[#dc0014]"
                        />
                    ) : (
                        event.description ? (
                            <p className="text-gray-600 text-lg mb-6 leading-relaxed font-medium">{event.description}</p>
                        ) : null
                    )}

                    {!isEditing && (
                        <div className="space-y-6">
                            {event.projectId && (
                                <div className="mb-6 pt-4 border-t border-gray-100">
                                    <h4 className="text-gray-800 font-semibold text-sm mb-2 opacity-90">
                                        {projects.find(p => p.id === event.projectId)?.title}
                                    </h4>
                                    <div className="space-y-2 pl-2 border-l border-gray-200">
                                        {projects.find(p => p.id === event.projectId)?.checklist.map(item => (
                                            <div key={item.id} onClick={() => toggleProjectItem(event.projectId!, item.id)} className="flex items-center gap-3 py-1 cursor-pointer group opacity-80 hover:opacity-100 transition-opacity">
                                                {item.done ? <CheckCircle2 size={12} className="text-[#dc0014]" /> : <Circle size={12} className="text-gray-400 group-hover:text-gray-600" />}
                                                <span className={`text-xs ${item.done ? 'text-gray-400 line-through' : 'text-gray-500'}`}>{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                {event.tasks && event.tasks.length > 0 ? (
                                    event.tasks.map(task => (
                                        <div key={task.id} onClick={() => toggleEventTask(event.id, task.id)} className="flex items-center gap-5 p-5 rounded-2xl bg-gray-50 border border-gray-200 cursor-pointer hover:border-[#dc0014] transition-all group">
                                            {task.done ? <CheckCircle2 className="text-[#dc0014]" size={26} /> : <Circle className="text-gray-300 group-hover:text-gray-400" size={26} />}
                                            <span className={`text-lg font-bold ${task.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{task.label}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl">
                                        <div>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-2">Estimado</p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between"><span className="text-xs text-gray-400 font-medium">Coste</span> <span className="text-black font-bold text-lg">{event.budgetedCost !== undefined ? event.budgetedCost : calculateReactiveCost(event.duration, 80, undefined, (event.assignees?.length || 1))}€</span></div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-[#dc0014] font-bold uppercase tracking-widest mb-2">Real</p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-gray-400 font-medium">Coste</span>
                                                    <span className="text-[#dc0014] font-bold text-lg">
                                                        {event.realCost || calculateReactiveCost(event.duration, budget.hourlyRate || 20, event.realCost, (event.assignees?.length || 1))}€
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {event.notifications && event.notifications.length > 0 && (
                                            <div className="col-span-2 pt-4 border-t border-gray-200 mt-2">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Bell size={12} /> Alarmas</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {event.notifications.map(n => (
                                                        <span key={n.id} className="text-[10px] font-bold text-white border border-[#dc0014] px-3 py-1 rounded-md bg-[#dc0014]">
                                                            {n.timeBefore} {n.unit === 'minutes' ? 'min' : n.unit === 'hours' ? 'h' : 'd'} antes
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {event.createdBy && (
                    <div className="px-8 md:px-10 pb-10">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] shadow-sm">
                            {event.createdBy.photoURL ? (
                                <img src={event.createdBy.photoURL} alt={event.createdBy.displayName} className="w-8 h-8 rounded-full border border-gray-200" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px] font-black uppercase">
                                    {event.createdBy.displayName.charAt(0)}
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-0.5">Creado por</p>
                                <p className="text-xs text-black font-black uppercase tracking-wider">{event.createdBy.displayName}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-0.5">Fecha alta</p>
                                <p className="text-xs text-gray-600 font-bold">
                                    {event.createdAt ? new Date(event.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50/50 rounded-b-[2.5rem]">
                    {isEditing ? (
                        <>
                            <button onClick={onSave} className="px-6 py-2 bg-[#dc0014] text-white font-bold uppercase text-xs rounded-xl hover:scale-105 transition-transform flex items-center gap-2 border-none outline-none shadow-lg"><Save size={14} /> Guardar</button>
                            <button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-white text-gray-700 font-bold uppercase text-xs rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">Cancelar</button>
                            <button onClick={() => { if (confirm('\u00bfEliminar esta actividad?')) { deleteEvent(editForm.id || event.id); onClose(); } }} className="p-2 bg-red-50 text-red-500 rounded-xl border border-red-100 hover:bg-red-500 hover:text-white transition-colors ml-auto"><Trash2 size={16} /></button>
                        </>
                    ) : (
                        <button onClick={() => { if (confirm('\u00bfEliminar esta actividad?')) { deleteEvent(event.id); onClose(); } }} className="p-2 text-gray-400 hover:text-red-500 transition-colors ml-auto hover:bg-red-50 rounded-lg" title="Eliminar actividad"><Trash2 size={18} /></button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
