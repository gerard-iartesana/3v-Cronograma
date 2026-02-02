import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarketingEvent } from '../../types';
import { parseDurationToHours, formatDuration, parseDurationToMinutes, mixColors } from '../../utils/cost';

interface YearViewProps {
    viewDate: Date;
    filteredEvents: MarketingEvent[];
    tagColors?: Record<string, string>;
    onSelectDate: (date: Date) => void;
}

const monthsOfYear = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const YearView: React.FC<YearViewProps> = ({
    viewDate,
    filteredEvents,
    tagColors,
    onSelectDate
}) => {
    const [hoveredDay, setHoveredDay] = useState<{ date: Date, events: MarketingEvent[] } | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number } | null>(null);

    const year = viewDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i);

    const isSameDay = (d1: Date, d2: Date) =>
        d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

    const getEventColor = (event: MarketingEvent) => {
        const virtualTags = [...(event.tags || [])];
        if (event.type === 'holiday' && !virtualTags.includes('Festivo')) virtualTags.push('Festivo');
        if (event.type === 'campaign' && !virtualTags.includes('Campaña')) virtualTags.push('Campaña');

        const colorTags = virtualTags.filter(t => tagColors?.[t]);
        if (colorTags.length > 0) return mixColors(colorTags.map(t => tagColors![t]));
        return event.completed ? '#32FF7E' : '#ffffff';
    };

    return (
        <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {months.map(monthIdx => {
                    const monthDate = new Date(year, monthIdx, 1);
                    const firstDayOfMonth = new Date(year, monthIdx, 1);
                    const startingDay = firstDayOfMonth.getDay();
                    const adjustedStartingDay = startingDay === 0 ? 6 : startingDay - 1;
                    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

                    return (
                        <div key={monthIdx} className="bg-neutral-900 border border-neutral-800 p-4 rounded-[2rem] flex flex-col h-full min-h-[200px] transition-all hover:border-neutral-700 hover:bg-neutral-800 group/month shadow-md">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-4 text-center border-b border-neutral-800 pb-2 group-hover/month:text-white transition-colors">
                                {monthsOfYear[monthIdx]}
                            </h4>
                            <div className="grid grid-cols-7 gap-2 flex-1 content-start">
                                {Array.from({ length: adjustedStartingDay }).map((_, i) => (
                                    <div key={`empty-${i}`} className="aspect-square" />
                                ))}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const date = new Date(year, monthIdx, day);
                                    const isSameDayISO = (dISO: string, d2: Date) => {
                                        const d1 = new Date(dISO);
                                        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
                                    };
                                    const dayEvents = filteredEvents.filter(e => isSameDayISO(e.date, date));
                                    const totalHours = dayEvents.reduce((acc, e) => acc + (parseDurationToHours(e.duration) || 0), 0);

                                    if (dayEvents.length === 0) {
                                        return (
                                            <div
                                                key={day}
                                                className="aspect-square rounded-[4px] bg-neutral-800/50 cursor-pointer hover:bg-neutral-700/80 transition-colors border border-white/5"
                                                onClick={() => onSelectDate(date)}
                                            />
                                        );
                                    }

                                    const { r, g, b, totalWeight } = dayEvents.reduce((acc, e) => {
                                        const color = getEventColor(e);
                                        const weight = parseDurationToHours(e.duration) || 1;
                                        const h = color.startsWith('#') ? color.slice(1) : color;
                                        const bigint = parseInt(h, 16);
                                        return {
                                            r: acc.r + ((bigint >> 16) & 255) * weight,
                                            g: acc.g + ((bigint >> 8) & 255) * weight,
                                            b: acc.b + (bigint & 255) * weight,
                                            totalWeight: acc.totalWeight + weight
                                        };
                                    }, { r: 0, g: 0, b: 0, totalWeight: 0 });

                                    const rw = Math.round(r / totalWeight);
                                    const gw = Math.round(g / totalWeight);
                                    const bw = Math.round(b / totalWeight);
                                    const mixedDayColor = `#${((1 << 24) + (rw << 16) + (gw << 8) + bw).toString(16).slice(1)}`;

                                    const intensityBasis = Math.max(totalHours, dayEvents.length > 0 ? 2 : 0);
                                    const opacityScale = Math.min(1, Math.max(0.4, intensityBasis / 8));
                                    const opacityHex = Math.round(opacityScale * 255).toString(16).padStart(2, '0');

                                    return (
                                        <motion.div
                                            key={day}
                                            whileHover={{ scale: 1.4, zIndex: 50, borderRadius: '4px' }}
                                            className="aspect-square rounded-[4px] cursor-pointer transition-all relative z-10"
                                            style={{
                                                backgroundColor: `${mixedDayColor}${opacityHex}`,
                                                border: `1px solid ${mixedDayColor}66`,
                                                boxShadow: totalHours >= 2 ? `0 0 15px ${mixedDayColor}33` : 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                                                setHoveredDay({ date, events: dayEvents });
                                            }}
                                            onMouseLeave={() => {
                                                setHoveredDay(null);
                                                setTooltipPos(null);
                                            }}
                                            onClick={() => onSelectDate(date)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <AnimatePresence>
                {hoveredDay && tooltipPos && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: -10 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="fixed z-[1000] bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 p-5 rounded-[2rem] shadow-2xl pointer-events-none min-w-[300px] max-w-[400px]"
                        style={{
                            left: tooltipPos.x,
                            top: tooltipPos.y,
                            transform: 'translate(-50%, -100%)'
                        }}
                    >
                        <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4 border-b border-neutral-800 pb-3 flex justify-between items-center">
                            <span>{hoveredDay.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>
                            <span className="text-white bg-white/10 px-2.5 py-1 rounded-full">{formatDuration(hoveredDay.events.reduce((acc, e) => acc + parseDurationToMinutes(e.duration), 0))}</span>
                        </div>
                        <div className="space-y-4">
                            {hoveredDay.events.slice(0, 6).map(e => (
                                <div key={e.id} className="text-[13px] font-bold text-gray-200 flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor] mt-1.5" style={{ backgroundColor: getEventColor(e), color: getEventColor(e) }} />
                                        <span className="leading-tight">{e.title}</span>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0 mt-0.5">
                                        {e.tags.filter(t => tagColors?.[t]).map(t => (
                                            <span
                                                key={t}
                                                className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-black/5"
                                                style={{
                                                    color: tagColors![t],
                                                    backgroundColor: `${tagColors![t]}1a`,
                                                    borderColor: `${tagColors![t]}33`
                                                }}
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {hoveredDay.events.length > 6 && (
                                <div className="text-[10px] text-gray-500 font-black uppercase mt-3 pt-3 border-t border-neutral-800 flex justify-center">
                                    +{hoveredDay.events.length - 6} actividades adicionales
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
