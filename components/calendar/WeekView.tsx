import React from 'react';
import { motion } from 'framer-motion';
import { MarketingEvent } from '../../types';
import { parseDurationToMinutes } from '../../utils/cost';

interface WeekViewProps {
    viewDate: Date;
    filteredEvents: MarketingEvent[];
    tagColors?: Record<string, string>;
    updateEvent: (id: string, updates: Partial<MarketingEvent>) => void;
    onOpenEvent: (event: MarketingEvent) => void;
    getEventStyle: (event: MarketingEvent) => any;
    hideWeekends?: boolean;
}

const daysOfWeekList = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const WeekView: React.FC<WeekViewProps> = ({
    viewDate,
    filteredEvents,
    tagColors,
    updateEvent,
    onOpenEvent,
    getEventStyle,
    hideWeekends = false
}) => {
    const startOfWeek = new Date(viewDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
    }).filter(d => !hideWeekends || (d.getDay() !== 0 && d.getDay() !== 6));

    const isSameDay = (d1: Date, d2: Date) =>
        d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

    return (
        <div className={`grid grid-cols-1 ${hideWeekends ? 'md:grid-cols-5' : 'md:grid-cols-7'} gap-px bg-neutral-800 border border-neutral-800 rounded-[2rem] overflow-hidden shadow-xl`}>
            {weekDays.map((date, idx) => {
                const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.date), date));
                const isToday = isSameDay(new Date(), date);
                const dayLabel = hideWeekends ? daysOfWeekList[idx] : daysOfWeekList[idx]; // idx maps correctly after filter?
                // Actually, idx maps to weekDays. If hideWeekends is true, idx 0 is Mon, idx 4 is Fri.
                // daysOfWeekList[0] is 'Lun', so it works.

                return (
                    <div key={idx} data-date={date.toISOString()} className="bg-neutral-900 min-h-[500px] flex flex-col">
                        <div className="p-5 border-b border-neutral-800 bg-neutral-950 text-center">
                            <span className="block text-[11px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2">{daysOfWeekList[hideWeekends ? idx : idx]}</span>
                            <span className={`text-xl font-black inline-flex items-center justify-center w-10 h-10 rounded-xl ${isToday ? 'bg-white text-black border border-white shadow-md' : 'text-gray-500'}`}>{date.getDate()}</span>
                        </div>
                        <div className="flex-1 p-3 space-y-3">
                            {dayEvents.map(event => {
                                const startDate = new Date(event.date);
                                const durationMinutes = parseDurationToMinutes(event.duration);
                                const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
                                const timeStr = `${startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

                                return (
                                    <motion.div
                                        key={event.id}
                                        drag
                                        dragSnapToOrigin
                                        onDragEnd={(e, info) => {
                                            const x = info.point.x;
                                            const y = info.point.y;
                                            const elements = document.elementsFromPoint(x, y);
                                            const dayCol = elements.find(el => el.hasAttribute('data-date'));
                                            const newDateStr = dayCol?.getAttribute('data-date');
                                            if (newDateStr) {
                                                const newDate = new Date(newDateStr);
                                                const oldDate = new Date(event.date);
                                                newDate.setHours(oldDate.getHours(), oldDate.getMinutes());
                                                updateEvent(event.id, { date: newDate.toISOString() });
                                            }
                                        }}
                                        className="p-4 rounded-[1.5rem] border transition-all hover:shadow-lg z-10 hover:z-20 shadow-sm bg-neutral-900/50"
                                        style={getEventStyle(event)}
                                    >
                                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                                            {event.tags
                                                .filter(tag => tagColors?.[tag])
                                                .map((tag, tIdx) => (
                                                    <span
                                                        key={tIdx}
                                                        className="text-[8px] uppercase font-black px-2 py-0.5 rounded-full bg-white/5 text-white/70 border border-white/5"
                                                        style={tagColors?.[tag] ? { color: tagColors[tag], borderColor: `${tagColors[tag]}33`, backgroundColor: `${tagColors[tag]}1a` } : {}}
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                        </div>
                                        {event.type !== 'holiday' && (
                                            <div className="text-[12px] font-normal text-gray-400 uppercase tracking-widest mb-1.5 leading-none">{timeStr}</div>
                                        )}
                                        <div className="text-[15px] font-black leading-tight cursor-pointer hover:opacity-80 transition-colors" style={{ color: getEventStyle(event).color }} onClick={(e) => { e.stopPropagation(); onOpenEvent(event); }}>{event.title}</div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
