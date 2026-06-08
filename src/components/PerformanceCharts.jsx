import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';

import { formatCHF } from '../utils/calculations';

const COLORS = [
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EF4444'
];

const tooltipStyle = {
  contentStyle: {
    background: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '8px',
    fontSize: '12px'
  },
  itemStyle: {
    color: '#e5e5e5'
  },
  labelStyle: {
    color: '#999'
  }
};

export default function PerformanceCharts({ analysis }) {
  if (!analysis) return null;

  const rendementData = [
    {
      name: 'Rdt. Brut',
      value: Number(analysis.rendement_brut || 0)
    },
    {
      name: 'Rdt. Net / FP',
      value: Number(analysis.rendement_net_fonds_propres || 0)
    },
    {
      name: 'Rdt. Dist. / FP',
      value: Number(analysis.revenu_distribue_fonds_propres || 0)
    }
  ];

  const financementData = [
    {
      name: 'Fonds propres',
      value: analysis.fonds_propres || 0
    },
    {
      name: 'Hypothèque',
      value: analysis.hypotheque || 0
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* Rendements */}
      <ChartCard title="Rendements (%)">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rendementData}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#999', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: '#999', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              {...tooltipStyle}
              formatter={(value) => `${Number(value).toFixed(2)} %`}
            />

            <Bar
              dataKey="value"
              radius={[8, 8, 0, 0]}
            >
              {rendementData.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i]}
                />
              ))}

              <LabelList
                dataKey="value"
                position="center"
                formatter={(value) =>
                  `${Number(value).toFixed(2)}%`
                }
                fill="#111111"
                fontSize={22}
                fontWeight={700}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Financement */}
      <ChartCard title="Financement">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={financementData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {financementData.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i]}
                />
              ))}
            </Pie>

            <Tooltip
              {...tooltipStyle}
              formatter={(v) => formatCHF(v)}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex justify-center gap-4 mt-2">
          {financementData.map((d, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs"
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: COLORS[i]
                }}
              />

              <span className="text-muted-foreground">
                {d.name}
              </span>
            </div>
          ))}
        </div>
      </ChartCard>

    </div>
  );
}

function ChartCard({
  title,
  children,
  className = ''
}) {
  return (
    <div
      className={`bg-card rounded-xl border border-border p-5 ${className}`}
    >
      <h4 className="text-xs font-medium text-muted-foreground mb-4">
        {title}
      </h4>

      {children}
    </div>
  );
}