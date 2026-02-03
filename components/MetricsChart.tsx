import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface MetricsChartProps {
    data: any[];
    displayMode: 'accumulated' | 'detailed';
    tagColors?: Record<string, string>;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({ data, displayMode, tagColors }) => {
    const [hiddenSeries, setHiddenSeries] = React.useState<string[]>([]);

    const handleLegendClick = (e: any) => {
        const { dataKey } = e;
        setHiddenSeries(prev =>
            prev.includes(dataKey)
                ? prev.filter(key => key !== dataKey)
                : [...prev, dataKey]
        );
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                key={displayMode} // Force re-render on mode change
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
                    wrapperStyle={{ fontSize: '11px', fontWeight: 600, fontFamily: 'Open Sans, sans-serif', cursor: 'pointer' }}
                    onClick={handleLegendClick}
                    formatter={(value, entry: any) => {
                        const { dataKey } = entry;
                        const isHidden = hiddenSeries.includes(dataKey);
                        return <span style={{ color: value, opacity: isHidden ? 0.3 : 1 }}>{value}</span>;
                    }}
                />

                {/* Estimado Bar */}
                <Bar
                    name="Estimado"
                    dataKey="Estimado"
                    stackId="A"
                    barSize={displayMode === 'accumulated' ? 60 : 25}
                    fill="#9ca3af" // Default color for Legend
                    hide={hiddenSeries.includes('Estimado')}
                >
                    {displayMode === 'detailed' && data.map((entry, index) => (
                        <Cell key={`cell-est-${index}`} fill={tagColors?.[entry.name] || '#9ca3af'} fillOpacity={0.3} />
                    ))}
                </Bar>

                {/* Real Stacked Bars */}
                <Bar
                    name="Producción"
                    dataKey="RealProduction"
                    stackId="B"
                    barSize={displayMode === 'accumulated' ? 60 : 25}
                    fill="#dc0014" // Default color for Legend
                    hide={hiddenSeries.includes('RealProduction')}
                >
                    {displayMode === 'detailed' && data.map((entry, index) => (
                        <Cell key={`cell-prod-${index}`} fill={tagColors?.[entry.name] || '#dc0014'} />
                    ))}
                </Bar>
                <Bar
                    name="Tiempo"
                    dataKey="RealTime"
                    stackId="C"
                    barSize={displayMode === 'accumulated' ? 60 : 25}
                    fill="#ff4d4d" // Default color for Legend
                    hide={hiddenSeries.includes('RealTime')}
                >
                    {displayMode === 'detailed' && data.map((entry, index) => (
                        <Cell key={`cell-time-${index}`} fill={tagColors?.[entry.name] || '#ff4d4d'} fillOpacity={0.6} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};
