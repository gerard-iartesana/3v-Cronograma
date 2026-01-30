import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface MetricsChartProps {
    data: any[];
    displayMode: 'accumulated' | 'detailed';
}

export const MetricsChart: React.FC<MetricsChartProps> = ({ data, displayMode }) => {
    const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

    const handleLegendClick = (e: any) => {
        const { value } = e;
        setHiddenSeries(prev =>
            prev.includes(value)
                ? prev.filter(s => s !== value)
                : [...prev, value]
        );
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 60, right: 30, left: 20, bottom: 20 }}
                barGap={10}
                barCategoryGap="25%"
            >
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 13, fontWeight: 700, fontFamily: 'Open Sans, sans-serif' }}
                    dy={20}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 700, fontFamily: 'Open Sans, sans-serif' }}
                    tickFormatter={(val) => `${val}€`}
                />
                <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: '20px',
                        padding: '15px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'Open Sans, sans-serif' }}
                    formatter={(value: number) => [`${value.toLocaleString()}€`, '']}
                />
                <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', fontWeight: 600, fontFamily: 'Open Sans, sans-serif', color: '#9ca3af', cursor: 'pointer' }}
                    onClick={handleLegendClick}
                />

                {/* 1. Estimado (BSC Gray) */}
                <Bar
                    name="Estimado"
                    dataKey="Estimado"
                    hide={hiddenSeries.includes('Estimado')}
                    radius={[4, 4, 0, 0]}
                    barSize={displayMode === 'accumulated' ? 30 : 15}
                    fill="#6b7280"
                    animationDuration={300}
                />

                {/* 2. Producción (BSC Orange) */}
                <Bar
                    name="Producción"
                    dataKey="RealProduction"
                    hide={hiddenSeries.includes('Producción')}
                    radius={[4, 4, 0, 0]}
                    barSize={displayMode === 'accumulated' ? 30 : 15}
                    fill="#FF7D00"
                    animationDuration={300}
                />

                {/* 3. Tiempo (BSC Yellow) */}
                <Bar
                    name="Tiempo"
                    dataKey="RealTime"
                    hide={hiddenSeries.includes('Tiempo')}
                    radius={[4, 4, 0, 0]}
                    barSize={displayMode === 'accumulated' ? 30 : 15}
                    fill="#FFD000"
                    animationDuration={300}
                />
            </BarChart>
        </ResponsiveContainer>
    );
};
