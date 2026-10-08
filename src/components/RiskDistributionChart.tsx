import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ScanReportData } from '../types';

interface RiskDistributionChartProps {
  report: ScanReportData;
}

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ report }) => {
  const total = report.totalVulnerabilitiesCount;

  // Define data for the visualization
  const isClean = total === 0;

  const rawData = [
    { name: 'Critical', value: report.criticalCount, color: '#dc2626', bgClass: 'bg-red-600', textClass: 'text-red-700' },
    { name: 'High', value: report.highCount, color: '#ea580c', bgClass: 'bg-orange-600', textClass: 'text-orange-700' },
    { name: 'Medium', value: report.mediumCount, color: '#d97706', bgClass: 'bg-amber-600', textClass: 'text-amber-700' },
    { name: 'Low', value: report.lowCount, color: '#64748b', bgClass: 'bg-slate-500', textClass: 'text-slate-700' },
  ];

  // For chart rendering: if 0 total, show 100% clean green segment
  const chartData = isClean
    ? [{ name: 'Clean', value: 1, color: '#10b981', bgClass: 'bg-emerald-500', textClass: 'text-emerald-700' }]
    : rawData.filter((item) => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      if (isClean) {
        return (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 px-2.5 py-1.5 rounded-lg shadow-lg text-[11px]">
            <span className="font-semibold text-emerald-700">100% Clean</span>
            <div className="text-[10px] text-slate-500">Zero threats detected</div>
          </div>
        );
      }
      const pct = Math.round((data.value / total) * 100);
      return (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 px-2.5 py-1.5 rounded-lg shadow-lg text-[11px]">
          <div className="font-semibold text-slate-900">{data.name} Risk</div>
          <div className="font-mono text-[10px] text-slate-600">
            {data.value} {data.value === 1 ? 'vulnerability' : 'vulnerabilities'} ({pct}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel rounded-3xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
          Risk Distribution Breakdown
        </span>
        <span className="text-[11px] font-mono text-slate-500">
          {isClean ? '0 threats' : `${total} total`}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Donut Chart with Recharts */}
        <div className="relative w-[124px] h-[124px] shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={52}
                paddingAngle={isClean ? 0 : 3}
                dataKey="value"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth={1.5}
                isAnimationActive={true}
                animationDuration={600}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Statistic Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="font-mono text-base font-bold text-slate-900 leading-none tabular-nums">
              {isClean ? '0' : total}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
              {isClean ? 'Threats' : 'Total'}
            </span>
          </div>
        </div>

        {/* Linear Distribution Breakdown List */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {rawData.map((item) => {
            const count = item.value;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div key={item.name} className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${item.bgClass} shrink-0`} />
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <div className="font-mono text-slate-500 tabular-nums">
                    <span className={`font-semibold ${count > 0 ? item.textClass : 'text-slate-400'}`}>
                      {count}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">({pct}%)</span>
                  </div>
                </div>

                {/* Micro Bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-white/80">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${item.bgClass}`}
                    style={{ width: `${pct}%`, opacity: count > 0 ? 1 : 0.2 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
