import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
                barGap={10}
                barCategoryGap="25%"
            >
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#000', fontSize: 13, fontWeight: 700, fontFamily: 'Open Sans, sans-serif' }}
                    dy={20}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#666', fontSize: 10, fontWeight: 700, fontFamily: 'Open Sans, sans-serif' }}
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
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'Open Sans, sans-serif' }}
                    formatter={(value: number) => [`${value.toLocaleString()}€`, '']}
                />
                <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', fontWeight: 600, fontFamily: 'Open Sans, sans-serif' }}
                />

                {/* Estimado: Red (Brand) */}
                <Bar
                    name="Estimado"
                    dataKey="Estimado"
                    radius={[12, 12, 0, 0]}
                    barSize={displayMode === 'accumulated' ? 60 : 30}
                    fill="#dc0014"
                />

                {/* Real: Stacked (Gray Shades as requested) */}
                {/* Production: Dark Base */}
                <Bar
                    name="Producción"
                    dataKey="RealProduction"
                    stackId="real"
                    barSize={displayMode === 'accumulated' ? 60 : 30}
                    fill="#4b5563" // Dark Gray
                />
                {/* Time: Light Top */}
                <Bar
                    name="Tiempo"
                    dataKey="RealTime"
                    stackId="real"
                    radius={[12, 12, 0, 0]}
                    barSize={displayMode === 'accumulated' ? 60 : 30}
                    fill="#9ca3af" // Light Gray
                />
            </BarChart>
        </ResponsiveContainer>
    );
};
