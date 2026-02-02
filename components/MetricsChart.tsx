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
                barGap={0}
                barCategoryGap="15%"
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

                {/* Estimado Bar */}
                <Bar
                    name="Estimado"
                    dataKey="Estimado"
                    stackId={displayMode === 'accumulated' ? 'main' : 'A'}
                    barSize={displayMode === 'accumulated' ? 100 : 25}
                    fill="#9ca3af"
                />

                {/* Real Stacked Bars */}
                <Bar
                    name="Producción"
                    dataKey="RealProduction"
                    stackId={displayMode === 'accumulated' ? 'main' : 'B'}
                    barSize={displayMode === 'accumulated' ? 100 : 25}
                    fill="#dc0014"
                />
                <Bar
                    name="Tiempo"
                    dataKey="RealTime"
                    stackId={displayMode === 'accumulated' ? 'main' : 'C'}
                    barSize={displayMode === 'accumulated' ? 100 : 25}
                    fill="#ff4d4d"
                />
            </BarChart>
        </ResponsiveContainer>
    );
};
