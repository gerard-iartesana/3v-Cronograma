import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MetricsChartProps {
    data: any[];
    displayMode: 'accumulated' | 'detailed';
}

export const MetricsChart: React.FC<MetricsChartProps> = ({ data, displayMode }) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 60, right: 30, left: 20, bottom: 20 }}
                barGap={0}
                barCategoryGap="25%"
            >
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#000', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em' }}
                    dy={20}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#666', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(val) => `${val}€`}
                />
                <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                    contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '20px',
                        padding: '15px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                    }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value.toLocaleString()}€`, '']}
                />
                <Bar
                    dataKey="Estimado"
                    radius={[12, 12, 0, 0]}
                    barSize={displayMode === 'accumulated' ? 80 : 40}
                    fill="#9ca3af" // Explicit Gray Color
                />
                <Bar
                    dataKey="Real"
                    radius={[12, 12, 0, 0]}
                    barSize={displayMode === 'accumulated' ? 80 : 40}
                    fill="#dc0014" // Explicit Red Color
                />
            </BarChart>
        </ResponsiveContainer>
    );
};
