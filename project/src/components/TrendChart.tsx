import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatWeight } from '../utils/format';

export interface TrendPoint {
  label: string;
  value: number;
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) return null;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(5, (max - min) * 0.25);

  return (
    <div className="mt-4 h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="var(--input)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#8E8E93', fontSize: 11, fontFamily: 'Inter' }}
            axisLine={{ stroke: '#2E2E2E' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)]}
            tick={{ fill: '#8E8E93', fontSize: 11, fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: '#2E2E2E' }}
            contentStyle={{ background: '#242424', border: '1px solid #2E2E2E', borderRadius: 10, color: '#F5F5F5' }}
            labelStyle={{ color: '#8E8E93', fontFamily: 'Inter' }}
            itemStyle={{ color: '#2F80ED', fontFamily: 'Inter', fontWeight: 600 }}
            formatter={(value) => [`${formatWeight(Number(value))} LB`, 'BEST']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2F80ED"
            strokeWidth={3}
            dot={{ r: 4, fill: '#2F80ED', stroke: '#242424', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#2F80ED', stroke: '#242424' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
