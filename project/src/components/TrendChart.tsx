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
          <CartesianGrid stroke="#1a1a1a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#888', fontSize: 11, fontFamily: 'Barlow' }}
            axisLine={{ stroke: '#222' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)]}
            tick={{ fill: '#888', fontSize: 11, fontFamily: 'Barlow' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: '#333' }}
            contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff' }}
            labelStyle={{ color: '#888', fontFamily: 'Barlow' }}
            itemStyle={{ color: '#C6FF00', fontFamily: 'Barlow Condensed', fontWeight: 800 }}
            formatter={(value) => [`${formatWeight(Number(value))} LB`, 'BEST']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#C6FF00"
            strokeWidth={3}
            dot={{ r: 4, fill: '#C6FF00', stroke: '#000', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#C6FF00', stroke: '#000' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
