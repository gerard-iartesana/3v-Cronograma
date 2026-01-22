
import { MarketingEvent } from '../types';

export const expandRecurringEvents = (
    events: MarketingEvent[],
    viewStart: Date,
    viewEnd: Date
): MarketingEvent[] => {
    const result: MarketingEvent[] = [];

    events.forEach(event => {
        // Determine the effective end of this event instance (for check against view)
        const eventEndForCheck = event.endDate ? new Date(event.endDate) : new Date(event.date);

        // If NOT recurring
        if (!event.recurrence) {
            // Check overlap with view range
            // Event starts before ViewEnd AND Event ends after ViewStart
            const eventStart = new Date(event.date);
            if (eventStart <= viewEnd && eventEndForCheck >= viewStart) {
                result.push(event);
            }
            return;
        }

        // IS recurring
        const { frequency, interval = 1, endDate: recurrenceEndStr, daysOfWeek } = event.recurrence;
        const recurrenceEnd = recurrenceEndStr ? new Date(recurrenceEndStr) : null;

        let currentDate = new Date(event.date);
        // Calculate duration to shift endDate if needed
        let durationMs = 0;
        if (event.endDate) {
            durationMs = new Date(event.endDate).getTime() - new Date(event.date).getTime();
        }

        // Safety
        let iterations = 0;
        const MAX_ITERATIONS = 5000;

        // For weekly with daysOfWeek, we behave a bit differently:
        // We treat the "start date" as the anchor week, but the actual occurrences happen on the specific days of that week (and subsequent intervals).
        // However, simplest logic is: iterate by day, check if matches frequency rule.
        // BUT efficient logic for 'daily'/'monthly'/'yearly' is hopping by interval.
        // For 'weekly' with 'daysOfWeek', we hop by week (interval) but generate multiple instances per week.

        // Let's normalize strategy:
        // If frequency is weekly AND daysOfWeek has entries:
        //   Jump week by week according to interval.
        //   Inside each week, iterate through daysOfWeek to create instances.

        if (frequency === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
            // Adjust currentDate to start of the week (Sunday?) or keep as is? 
            // Typically recurrence starts FROM the event date. 
            // Let's assume the event.date is just the anchor. 
            // We will start iterating from the week of event.date.

            let cursorDate = new Date(currentDate);
            // Align cursor to Sunday (or start of week) to make day calculation easier? 
            // Or just iterate: while loop week hops.

            // Let's keep it simple: Jump week by week from the anchor date
            // But we need to ensure we don't double count if event.date is one of the days.
            // Actually, often "Custom Recurrence" UIs imply: "Weekly on Mon, Wed starting Jan 1st".
            // If Jan 1st is Monday, it happens then. If Jan 1st is Tuesday, first occurence is Wed.

            // Strategy:
            // 1. Start from the anchor date's week.
            // 2. Loop weeks (jumping by interval*7 days).
            // 3. In each week, check the specific days.

            // Find the adjacent Sunday (start of week) for the anchor date?
            // Let's just iterate logical weeks.

            const anchorDay = cursorDate.getDay();
            // Just brute force day-by-day is safer but slower? No, jumping weeks is better.

            // Let's just align cursor to the *Sunday* of that week to simplify strict day mapping
            const dayOffset = cursorDate.getDay();
            const weekStart = new Date(cursorDate);
            weekStart.setDate(weekStart.getDate() - dayOffset);
            // weekStart is now Sunday of the start week.
            // Note: this might put weekStart BEFORE event.date. We must filter out dates < event.date.

            while (true) {
                // Check this week's candidates
                for (const dayIndex of daysOfWeek) {
                    const instanceDate = new Date(weekStart);
                    instanceDate.setDate(weekStart.getDate() + dayIndex);

                    // Restore the original time of day from event.date
                    instanceDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);

                    // Validations:
                    // 1. Must be >= original start date (recurrence doesn't go back in time before start)
                    if (instanceDate < currentDate) continue;

                    // 2. Must be <= recurrence end
                    if (recurrenceEnd && instanceDate > recurrenceEnd) {
                        // If this day is past end, future days/weeks definitely are too? 
                        // Not necessarily (if unsorted daysOfWeek), but generally yes.
                        // But strictly: just continue or break inner? Break inner if we assume sorted, continue otherwise.
                        // The outer loop break handles global end.
                        continue;
                    }

                    // 3. Must be <= viewEnd (optimization: stop entirely if start of week > viewEnd?)
                    // Handled by outer break.

                    // 4. Overlap Check with View
                    const instanceEnd = new Date(instanceDate.getTime() + durationMs);
                    if (instanceDate <= viewEnd && instanceEnd >= viewStart) {
                        // Add it
                        result.push({
                            ...event,
                            id: `${event.id}_${instanceDate.getTime()}`,
                            masterId: event.id,
                            date: instanceDate.toISOString(),
                            endDate: event.endDate ? instanceEnd.toISOString() : undefined,
                        });
                    }
                }

                // Advance week
                weekStart.setDate(weekStart.getDate() + (7 * interval));

                iterations++;
                if (iterations > MAX_ITERATIONS) break;

                // Loop break conditions
                if (weekStart > viewEnd && (!recurrenceEnd || weekStart > recurrenceEnd)) break;
                if (recurrenceEnd && weekStart > recurrenceEnd) break;
            }

        } else {
            // Standard single-date-jump recurrence (Weekly without specific days implies "Same day of week")
            while (true) {
                // Break conditions
                if (currentDate > viewEnd) break; // Passed view
                if (recurrenceEnd && currentDate > recurrenceEnd) break; // Passed recurrence limit

                const currentInstanceEnd = new Date(currentDate.getTime() + durationMs);

                if (currentInstanceEnd >= viewStart) {
                    // It's visible (at least partially)
                    result.push({
                        ...event,
                        id: `${event.id}_${currentDate.getTime()}`,
                        masterId: event.id,
                        date: currentDate.toISOString(),
                        endDate: event.endDate ? currentInstanceEnd.toISOString() : undefined,
                    });
                }

                // Advance
                const nextDate = new Date(currentDate);
                switch (frequency) {
                    case 'daily':
                        nextDate.setDate(nextDate.getDate() + interval);
                        break;
                    case 'weekly':
                        nextDate.setDate(nextDate.getDate() + (7 * interval));
                        break;
                    case 'monthly':
                        nextDate.setMonth(nextDate.getMonth() + interval);
                        break;
                    case 'yearly':
                        nextDate.setFullYear(nextDate.getFullYear() + interval);
                        break;
                }
                currentDate = nextDate;

                iterations++;
                if (iterations > MAX_ITERATIONS) break;
            }
        }
    });

    return result;
};
