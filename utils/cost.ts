export const parseDurationToHours = (durationStr?: string): number => {
    if (!durationStr) return 0;
    const str = durationStr.toLowerCase().replace(/,/g, '.').trim();

    // Check for HH:MM format
    const hhmm = str.match(/^(\d+):(\d+)$/);
    if (hhmm) {
        return parseInt(hhmm[1]) + (parseInt(hhmm[2]) / 60);
    }

    let totalHours = 0;
    const hrs = (str.match(/(\d+\.?\d*)\s*(h|hor|hr|hora|horas)/g) || []) as string[];
    hrs.forEach(h => { const n = h.match(/\d+\.?\d*/); if (n) totalHours += parseFloat(n[0]); });

    const mins = (str.match(/(\d+\.?\d*)\s*(m|min|minuto|minutos)/g) || []) as string[];
    mins.forEach(m => { const n = m.match(/\d+\.?\d*/); if (n) totalHours += parseFloat(n[0]) / 60; });

    if (totalHours === 0) {
        const nums = str.match(/\d+\.?\d*/g);
        // If it's just a number, assume it's hours
        if (nums && nums.length === 1) totalHours = parseFloat(nums[0]);
    }
    return totalHours;
};

export const formatDuration = (totalMinutes: number): string => {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
};

export const parseDurationToMinutes = (durationStr?: string): number => {
    return Math.round(parseDurationToHours(durationStr) * 60);
};

export const calculateReactiveCost = (durationStr: string | undefined, currentRate: number, manualCost?: number, multiplier: number = 1, ignoreManual: boolean = false): number => {
    // Si hay un coste manual definido y no estamos forzando reactividad, lo respetamos.
    if (manualCost !== undefined && !ignoreManual) return manualCost;

    const hours = parseDurationToHours(durationStr);
    return Math.round(hours * currentRate * multiplier);
};

export const mixColors = (colors: string[]): string => {
    if (colors.length === 0) return '#00E5FF';
    if (colors.length === 1) return colors[0];
    let r = 0, g = 0, b = 0;
    colors.forEach(hex => {
        const h = hex.startsWith('#') ? hex.slice(1) : hex;
        const bigint = parseInt(h, 16);
        r += (bigint >> 16) & 255; g += (bigint >> 8) & 255; b += bigint & 255;
    });
    r = Math.round(r / colors.length); g = Math.round(g / colors.length); b = Math.round(b / colors.length);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

