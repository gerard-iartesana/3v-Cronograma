import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MarketingEvent, Project } from '../../types';
import { AlertCircle } from 'lucide-react';

interface MonthViewProps {
    viewDate: Date;
    filteredEvents: MarketingEvent[];
    allEvents: MarketingEvent[]; // For campaigns
    filter: string[];
    tagColors?: Record<string, string>;
    updateEvent: (id: string, updates: Partial<MarketingEvent>) => void;
    onOpenEvent: (event: MarketingEvent) => void;
    getEventStyle: (event: MarketingEvent) => any;
    onSelectCampaign: (campaign: any) => void;
    selectedCampaignId?: string;
    projects: Project[];
}

const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const MonthView: React.FC<MonthViewProps> = ({
    viewDate,
    filteredEvents,
    allEvents,
    filter,
    tagColors,
    updateEvent,
    onOpenEvent,
    getEventStyle,
    onSelectCampaign,
    selectedCampaignId,
    projects
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const prevMonthDays = new Date(year, month, 0).getDate();

    const grid = [];
    for (let i = adjustedFirstDay - 1; i >= 0; i--) grid.push({ day: prevMonthDays - i, month: month - 1, year, currentMonth: false });
    for (let i = 1; i <= daysInMonth; i++) grid.push({ day: i, month: month, year, currentMonth: true });
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) grid.push({ day: i, month: month + 1, year, currentMonth: false });

    const isSameDay = (d1: Date, d2: Date) =>
        d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

    return (
        <div className="bg-white border border-gray-200 rounded-[1.5rem] overflow-hidden shadow-xl">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {daysOfWeek.map(day => (<div key={day} className="py-2 text-center"> <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{day}</span> </div>))}
            </div>
            <div className="grid grid-cols-7">
                {grid.map((dt, idx) => {
                    const dateObj = new Date(dt.year, dt.month, dt.day);
                    const allDayEvents = filteredEvents.filter(e => isSameDay(new Date(e.date), dateObj));
                    const regularEvents = allDayEvents.filter(e => e.type !== 'campaign' && e.type !== 'holiday');
                    const holidays = allDayEvents.filter(e => e.type === 'holiday');

                    const activeCampaigns = allEvents.filter(e => {
                        if (e.type !== 'campaign' || !e.endDate) return false;
                        // Respect filters
                        if (!filter.includes('TODO') && !filter.includes('Campaña') && !e.tags.some(t => filter.includes(t))) return false;
                        const start = new Date(e.date);
                        const end = new Date(e.endDate);
                        start.setHours(0, 0, 0, 0);
                        end.setHours(23, 59, 59, 999);
                        return dateObj >= start && dateObj <= end;
                    });

                    const isToday = isSameDay(new Date(), dateObj);

                    const deadlines = projects.filter(p => p.deadline && isSameDay(new Date(p.deadline), dateObj));

                    return (
                        <div
                            key={idx}
                            data-date={dateObj.toISOString()}
                            className={`min-h-[120px] p-2 border-r border-b border-gray-100 transition-all hover:bg-gray-50 ${!dt.currentMonth ? 'bg-gray-50/50' : ''} relative group`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span className={`text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-md ${isToday ? 'bg-[#dc0014] text-white shadow-md' : dt.currentMonth ? 'text-gray-900' : 'text-gray-300'}`}>{dt.day}</span>
                                    {holidays.map(h => (
                                        <span key={h.id} title={h.title} className="text-[8px] font-bold text-gray-400 uppercase tracking-tight leading-tight bg-gray-100/50 px-1 rounded-sm whitespace-normal text-center">
                                            {h.title}
                                        </span>
                                    ))}
                                    {deadlines.map(p => (
                                        <div key={p.id} title={p.title} className="flex items-start gap-1 bg-red-50 border border-red-100 px-1.5 py-1 rounded-md shadow-sm mt-0.5 w-full">
                                            <AlertCircle size={10} className="text-red-500 flex-shrink-0 mt-0.5" />
                                            <span className="text-[9px] font-black text-red-600 uppercase tracking-tight whitespace-normal leading-tight break-words">
                                                {p.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Campaigns */}
                            {activeCampaigns.map((camp, cIdx) => {
                                const start = new Date(camp.date);
                                start.setHours(0, 0, 0, 0);
                                const end = new Date(camp.endDate!);
                                end.setHours(23, 59, 59, 999);

                                const isStart = isSameDay(dateObj, start);
                                const isEnd = isSameDay(dateObj, end);

                                const campaignTagColor = tagColors?.['Campaña'];
                                const finalColor = campaignTagColor || getEventStyle(camp).color;

                                return (
                                    <div
                                        key={camp.id}
                                        className={`absolute h-0.5 z-20 cursor-pointer hover:brightness-150 transition-all ${isStart ? 'rounded-l-full' : ''} ${isEnd ? 'rounded-r-full' : ''}`}
                                        style={{
                                            backgroundColor: finalColor,
                                            bottom: `${2 + cIdx * 4}px`,
                                            left: isStart ? '8px' : '0px',
                                            right: isEnd ? '8px' : '0px'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectCampaign({ id: camp.id, title: camp.title, start: camp.date, end: camp.endDate!, x: e.clientX, y: e.clientY, color: finalColor });
                                        }}
                                    />
                                );
                            })}

                            <div className="space-y-1">
                                {regularEvents.map(event => (
                                    <motion.div
                                        key={event.id}
                                        drag
                                        dragSnapToOrigin
                                        onDragStart={() => setIsDragging(true)}
                                        onDragEnd={(e, info) => {
                                            const x = info.point.x;
                                            const y = info.point.y;
                                            const elements = document.elementsFromPoint(x, y);
                                            const dayCell = elements.find(el => el.hasAttribute('data-date'));
                                            const newDateStr = dayCell?.getAttribute('data-date');
                                            if (newDateStr) {
                                                const newDate = new Date(newDateStr);
                                                const oldDate = new Date(event.date);
                                                newDate.setHours(oldDate.getHours(), oldDate.getMinutes());
                                                updateEvent(event.id, { date: newDate.toISOString() });
                                            }
                                            setTimeout(() => setIsDragging(false), 100);
                                        }}
                                        onTap={() => {
                                            if (!isDragging) onOpenEvent(event);
                                        }}
                                        className="px-2 pt-0.5 pb-1 relative rounded-md border transition-all z-10 hover:z-20 cursor-grab active:cursor-grabbing h-auto min-h-[1.5rem] shadow-sm hover:shadow-md"
                                        style={{ ...getEventStyle(event), color: getEventStyle(event).color }}
                                    >
                                        <div className="flex flex-wrap gap-0.5 mb-0.5 mt-0.5">
                                            {event.tags
                                                .filter(tag => tagColors?.[tag])
                                                .map((tag, tIdx) => (
                                                    <span
                                                        key={tIdx}
                                                        className="text-[6px] uppercase font-black px-1 rounded-[2px] bg-black/5 text-black/60 border border-black/5 whitespace-nowrap"
                                                        style={tagColors?.[tag] ? { color: tagColors[tag], borderColor: `${tagColors[tag]}33`, backgroundColor: `${tagColors[tag]}1a` } : {}}
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                        </div>
                                        <span className="text-[10px] font-semibold leading-tight inline-block pb-1 cursor-pointer hover:opacity-80 transition-opacity break-words whitespace-normal pointer-events-none w-full" style={{ color: 'inherit' }}>{event.title}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
