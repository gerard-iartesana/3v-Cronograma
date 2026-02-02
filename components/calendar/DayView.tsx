import React from 'react';
import { motion } from 'framer-motion';
import { MarketingEvent } from '../../types';
import { parseDurationToMinutes, formatDuration } from '../../utils/cost';

interface DayViewProps {
    filteredEvents: MarketingEvent[];
    updateEvent: (id: string, updates: Partial<MarketingEvent>) => void;
    onOpenEvent: (event: MarketingEvent) => void;
    getEventStyle: (event: MarketingEvent) => any;
    dragControls: any;
    setResizing: (val: any) => void;
}

export const DayView: React.FC<DayViewProps> = ({
    filteredEvents,
    updateEvent,
    onOpenEvent,
    getEventStyle,
    dragControls,
    setResizing
}) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const layoutEvents = React.useMemo(() => {
        if (!filteredEvents.length) return [];

        const sorted = [...filteredEvents].sort((a, b) => {
            const startA = new Date(a.date).getTime();
            const startB = new Date(b.date).getTime();
            if (startA !== startB) return startA - startB;
            return parseDurationToMinutes(b.duration) - parseDurationToMinutes(a.duration);
        });

        const columns: MarketingEvent[][] = [];
        const eventLayout: Record<string, { column: number, totalColumns: number }> = {};

        // Helper to find overlapping groups
        const groups: MarketingEvent[][] = [];
        let currentGroup: MarketingEvent[] = [];
        let groupEnd = 0;

        sorted.forEach(event => {
            const start = new Date(event.date).getTime();
            const end = start + parseDurationToMinutes(event.duration) * 60000;

            if (start >= groupEnd && currentGroup.length > 0) {
                groups.push(currentGroup);
                currentGroup = [];
                groupEnd = 0;
            }

            currentGroup.push(event);
            groupEnd = Math.max(groupEnd, end);
        });
        if (currentGroup.length > 0) groups.push(currentGroup);

        groups.forEach(group => {
            const groupColumns: MarketingEvent[][] = [];
            group.forEach(event => {
                let placed = false;
                for (let i = 0; i < groupColumns.length; i++) {
                    const lastEventInCol = groupColumns[i][groupColumns[i].length - 1];
                    const lastEnd = new Date(lastEventInCol.date).getTime() + parseDurationToMinutes(lastEventInCol.duration) * 60000;
                    if (new Date(event.date).getTime() >= lastEnd) {
                        groupColumns[i].push(event);
                        eventLayout[event.id] = { column: i, totalColumns: 0 }; // Will update total later
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    groupColumns.push([event]);
                    eventLayout[event.id] = { column: groupColumns.length - 1, totalColumns: 0 };
                }
            });

            group.forEach(event => {
                eventLayout[event.id].totalColumns = groupColumns.length;
            });
        });

        return sorted.map(event => ({
            ...event,
            ...eventLayout[event.id]
        }));
    }, [filteredEvents]);

    return (
        <div className="flex flex-col bg-neutral-900 border border-neutral-800 rounded-[1.5rem] overflow-hidden">
            <div className="relative h-[1200px] w-full overflow-y-auto custom-scrollbar">
                {hours.map(h => (
                    <div key={h} className="absolute w-full border-t border-neutral-800 flex items-start" style={{ top: `${h * 50}px`, height: '50px' }}>
                        <span className="text-[10px] font-bold text-gray-500 p-2 w-12 text-right">{h}:00</span>
                    </div>
                ))}
                {layoutEvents.map(event => {
                    const date = new Date(event.date);
                    const startMinutes = date.getHours() * 60 + date.getMinutes();
                    const duration = parseDurationToMinutes(event.duration);
                    const { column, totalColumns } = event;

                    // Calculate width and left based on columns
                    const widthPercent = 100 / (totalColumns || 1);
                    const leftOffset = (column || 0) * widthPercent;

                    return (
                        <motion.div
                            key={event.id}
                            drag dragSnapToOrigin
                            dragListener={false}
                            dragControls={dragControls}
                            onDragEnd={(e, info) => {
                                const hourOffset = Math.round(info.offset.y / 50);
                                if (hourOffset !== 0) {
                                    const newDate = new Date(event.date);
                                    newDate.setHours(newDate.getHours() + hourOffset);
                                    updateEvent(event.id, { date: newDate.toISOString() });
                                }
                            }}
                            onTap={() => onOpenEvent(event)}
                            className="absolute rounded-xl border p-0 transition-all hover:z-10 shadow-xl group/event overflow-hidden"
                            style={{
                                top: `${(startMinutes / 60) * 50}px`,
                                height: `${(duration / 60) * 50}px`,
                                left: `calc(4rem + (100% - 5rem) * ${leftOffset / 100})`,
                                width: `calc((100% - 5rem) * ${widthPercent / 100} - 4px)`,
                                ...getEventStyle(event)
                            }}
                        >
                            <div
                                className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-30 flex items-center justify-center hover:bg-white/10 transition-colors"
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setResizing({
                                        id: event.id,
                                        type: 'top',
                                        initialY: e.clientY,
                                        initialDate: event.date,
                                        initialDuration: duration
                                    });
                                }}
                            />

                            <div
                                className="absolute top-1 bottom-1 left-0 right-0 z-20 cursor-grab active:cursor-grabbing px-3 flex flex-col justify-center overflow-hidden"
                                onPointerDown={(e) => {
                                    dragControls.start(e);
                                }}
                            >
                                <h4 className="font-bold text-white text-[10px] lg:text-xs truncate leading-none cursor-pointer hover:text-white shrink-0">{event.title}</h4>
                                {duration >= 45 && totalColumns === 1 && event.description && (
                                    <p className="text-[10px] text-gray-400 line-clamp-1 opacity-70 leading-none mt-0.5">{event.description}</p>
                                )}
                            </div>

                            <div
                                className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize z-30 flex items-center justify-center hover:bg-white/10 transition-colors"
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setResizing({
                                        id: event.id,
                                        type: 'bottom',
                                        initialY: e.clientY,
                                        initialDate: event.date,
                                        initialDuration: duration
                                    });
                                }}
                            />
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
