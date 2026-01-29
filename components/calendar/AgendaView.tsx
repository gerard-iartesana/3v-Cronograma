import React from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
import { MarketingEvent } from '../../types';

interface AgendaViewProps {
    filteredEvents: MarketingEvent[];
    agendaDensity: number;
    tagColors?: Record<string, string>;
    onOpenEvent: (event: MarketingEvent) => void;
    getEventStyle: (event: MarketingEvent) => any;
}

const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const AgendaView: React.FC<AgendaViewProps> = ({
    filteredEvents,
    agendaDensity,
    tagColors,
    onOpenEvent,
    getEventStyle
}) => {
    const gridClasses = agendaDensity === 0
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";

    const processedEvents = (() => {
        const list: any[] = [];
        filteredEvents.forEach(e => {
            if (e.type === 'campaign' && e.endDate) {
                list.push({ ...e, _agendaType: 'campaign_start' });
                list.push({ ...e, date: e.endDate, id: e.id + '_end', _agendaType: 'campaign_end' });
            } else {
                list.push(e);
            }
        });
        return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    })();

    const formatEventDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) { return dateStr; }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={gridClasses}>
            {processedEvents.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-neutral-800 rounded-[2rem]">
                    <CalendarIcon size={48} className="mb-4 opacity-30" />
                    <p className="text-sm font-bold text-gray-400">No hay actividades</p>
                </div>
            ) : (
                processedEvents.map(event => {
                    if (event.type === 'holiday') {
                        return (
                            <motion.div key={event.id} className="bg-neutral-900 border border-neutral-800 rounded-[1.25rem] p-4 flex items-center gap-4 opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                                <div className="flex flex-col items-center justify-center min-w-[3rem] border-r border-neutral-800 pr-4">
                                    <span className="text-xl font-bold text-gray-400 leading-none">{new Date(event.date).getDate()}</span>
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mt-1">{daysOfWeek[new Date(event.date).getDay() === 0 ? 6 : new Date(event.date).getDay() - 1].substring(0, 3)}</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide leading-tight">{event.title}</h3>
                            </motion.div>
                        );
                    }

                    if (event._agendaType) {
                        const isStart = event._agendaType === 'campaign_start';
                        const color = getEventStyle(event).color;
                        return (
                            <motion.div key={event.id} className="bg-neutral-900 border border-neutral-800 rounded-[1.25rem] p-4 flex items-center gap-4 group hover:border-neutral-700 transition-all border-l-4 shadow-sm" style={{ borderLeftColor: color }}>
                                <div className="flex flex-col items-center justify-center min-w-[3rem] border-r border-neutral-800 pr-4">
                                    <span className="text-xl font-black text-white leading-none">{new Date(event.date).getDate()}</span>
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mt-1">{daysOfWeek[new Date(event.date).getDay() === 0 ? 6 : new Date(event.date).getDay() - 1].substring(0, 3)}</span>
                                </div>
                                <div className="flex-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest mb-1 block opacity-70" style={{ color }}>
                                        {isStart ? 'Inicio de Campaña' : 'Fin de Campaña'}
                                    </span>
                                    <h3 className="text-sm font-bold text-gray-300 leading-tight">{event.title}</h3>
                                </div>
                            </motion.div>
                        );
                    }

                    const style = getEventStyle(event);

                    return (
                        <motion.div
                            key={event.id}
                            className={`bg-neutral-900 border border-neutral-800 rounded-[1.25rem] transition-all group hover:border-white/30 shadow-sm ${agendaDensity === 0 ? 'flex items-center gap-4 p-4' : 'flex flex-col h-full pt-4 pb-5 px-5'}`}
                            style={{ borderColor: `${style.color}33`, backgroundColor: '#171717' }}
                        >
                            {agendaDensity === 0 ? (
                                <div className="flex items-center gap-4 w-full cursor-pointer" onClick={() => onOpenEvent(event)}>
                                    <div className="flex flex-col items-center justify-center min-w-[4rem] border-r border-neutral-800 pr-4">
                                        <span className="text-3xl font-bold text-gray-200 leading-none">{new Date(event.date).getDate()}</span>
                                        <span className="text-[12px] font-black uppercase tracking-wider text-gray-500 mt-1">{daysOfWeek[new Date(event.date).getDay() === 0 ? 6 : new Date(event.date).getDay() - 1].substring(0, 3)}</span>
                                    </div>
                                    <div className="flex-1">
                                        {event.tags && event.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-1">
                                                {event.tags.filter(t => tagColors?.[t]).map(t => (
                                                    <span key={t} className="px-1.5 py-0.5 rounded-md border border-neutral-800 text-[7px] font-black uppercase tracking-widest bg-neutral-800" style={{ color: tagColors![t], borderColor: `${tagColors![t]}33` }}>{t}</span>
                                                ))}
                                            </div>
                                        )}
                                        <h3 className="text-sm font-bold text-gray-200 leading-tight line-clamp-2 group-hover:text-white transition-colors">{event.title}</h3>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1 pr-4">
                                            <span className="text-[14px] font-black uppercase tracking-[0.2em]" style={{ color: style.color }}>
                                                {formatEventDate(event.date)}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                {event.duration && <div className="flex items-center gap-1 text-gray-500"><Clock size={12} /><span className="text-[11px] font-black uppercase tracking-wider">{event.duration}</span></div>}
                                            </div>
                                        </div>
                                        {event.completed && <CheckCircle2 size={16} style={{ color: style.color }} />}
                                    </div>
                                    <div className="mb-2">
                                        {event.tags && event.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {event.tags.filter(t => tagColors?.[t]).map(t => (
                                                    <span key={t} className="px-1.5 py-0.5 rounded-md border border-neutral-800 text-[7px] font-black uppercase tracking-widest bg-neutral-800" style={{ color: tagColors![t], borderColor: `${tagColors![t]}33` }}>{t}</span>
                                                ))}
                                            </div>
                                        )}
                                        <h3 className="text-xl font-bold text-white mb-2 cursor-pointer hover:text-white transition-all line-clamp-2" onClick={() => onOpenEvent(event)}>{event.title}</h3>
                                    </div>
                                    <p className="text-gray-400 text-xs mb-4 font-medium flex-1 line-clamp-3">{event.description}</p>
                                </>
                            )}
                        </motion.div>
                    );
                })
            )}
        </motion.div>
    );
};
