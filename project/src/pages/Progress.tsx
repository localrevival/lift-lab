import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { TrendChart } from '../components/TrendChart';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { formatShort, formatWeight } from '../utils/format';
import { bestWeightSeries, loggedLiftNames } from '../utils/workout';

export function Progress() {
  const workouts = useWorkoutStore((state) => state.workouts);
  const names = loggedLiftNames(workouts);
  const [selected, setSelected] = useState<string | null>(null);
  const name = selected && names.some((item) => item.toLowerCase() === selected.toLowerCase()) ? selected : names[0];
  const series = name ? bestWeightSeries(workouts, name) : [];
  const latest = series[series.length - 1];
  const peak = series.reduce((max, point) => Math.max(max, point.weight), 0);

  return (
    <div>
      <ScreenHeader tag="LIFTS" title="Progress" />
      {names.length === 0 || !name || !latest ? (
        <div className="mt-8">
          <p className="font-condensed text-[22px] font-bold uppercase tracking-[1px] text-[#888]">No lifts yet</p>
          <p className="mt-2 max-w-[280px] text-[15px] font-semibold leading-snug text-[#777]">
            Best weight for each lift shows up after you log a workout.
          </p>
          <Link to="/" className="btn-lime mt-6">
            Go to workout
          </Link>
        </div>
      ) : (
        <div className="mt-3">
          <div className="-mx-[18px] flex gap-2 overflow-x-auto px-[18px] pb-1">
            {names.map((item) => {
              const on = item.toLowerCase() === name.toLowerCase();
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSelected(item)}
                  className={`shrink-0 rounded-md px-3 py-2 font-condensed text-[16px] font-bold uppercase tracking-[1px] ${
                    on ? 'bg-accent text-black' : 'border border-[#333] text-[#888]'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <p className="mt-5 font-condensed text-[14px] font-bold tracking-[2px] text-accent">BEST</p>
          <p className="mt-1 font-condensed text-[72px] font-black leading-[0.85] tracking-[-1px]">
            {formatWeight(latest.weight)}
            <span className="ml-1 text-[18px] font-bold tracking-[1px] text-[#777]">LB</span>
          </p>
          <p className="mt-2 text-[12px] font-bold uppercase tracking-[1px] text-[#777]">
            {formatShort(latest.date)}
            {peak > latest.weight ? ` · peak ${formatWeight(peak)} lb` : ''}
          </p>
          <TrendChart points={series.map((point) => ({ label: point.label, value: point.weight }))} />
        </div>
      )}
    </div>
  );
}
