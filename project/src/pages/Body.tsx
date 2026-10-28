import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Sheet } from '../components/Sheet';
import { TrendChart } from '../components/TrendChart';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { clampWeight, formatShort, formatWeight, todayKey } from '../utils/format';

export function Body() {
  const weightLog = useWorkoutStore((state) => state.weightLog);
  const deleteWeightEntry = useWorkoutStore((state) => state.deleteWeightEntry);
  const [open, setOpen] = useState(false);

  const latest = weightLog[weightLog.length - 1];
  const previous = weightLog[weightLog.length - 2];
  const delta = latest && previous ? Math.round((latest.weightLbs - previous.weightLbs) * 10) / 10 : null;

  return (
    <div>
      <ScreenHeader tag="WEIGHT" title="Body" />
      {latest ? (
        <div className="mt-3">
          <p className="font-condensed text-[72px] font-black leading-[0.85] tracking-[-1px]">
            {formatWeight(latest.weightLbs)}
            <span className="ml-1 text-[18px] font-bold tracking-[1px] text-[#777]">LB</span>
          </p>
          <p className="mt-2 text-[12px] font-bold uppercase tracking-[1px] text-[#777]">
            {formatShort(latest.date)}
            {delta !== null && delta !== 0 ? ` · ${delta > 0 ? '+' : '−'}${formatWeight(Math.abs(delta))} lb` : ''}
          </p>
          <TrendChart points={weightLog.map((entry) => ({ label: formatShort(entry.date), value: entry.weightLbs }))} />
        </div>
      ) : (
        <p className="mt-8 font-condensed text-[22px] font-bold uppercase tracking-[1px] text-[#888]">No weigh-ins yet</p>
      )}

      <button type="button" className="btn-lime mt-6" onClick={() => setOpen(true)}>
        + Log weight
      </button>

      {weightLog.length > 0 && (
        <ul className="mt-4 border-t border-[#1f1f1f]">
          {[...weightLog].reverse().map((entry) => (
            <li key={entry.id} className="flex items-center justify-between border-b border-[#1f1f1f] py-3">
              <span className="font-condensed text-[16px] font-bold tracking-[1px] text-[#888]">{formatShort(entry.date).toUpperCase()}</span>
              <span className="font-condensed text-[28px] font-extrabold leading-none">
                {formatWeight(entry.weightLbs)}
                <span className="ml-1 text-[12px] font-bold tracking-[1px] text-[#777]">LB</span>
              </span>
              <button
                type="button"
                aria-label={`Delete weigh-in ${entry.date}`}
                className="font-condensed text-[14px] font-bold uppercase tracking-[1px] text-[#666]"
                onClick={() => deleteWeightEntry(entry.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <LogWeight onClose={() => setOpen(false)} initial={latest?.weightLbs ?? 180} />}
    </div>
  );
}

function LogWeight({ onClose, initial }: { onClose: () => void; initial: number }) {
  const addWeightEntry = useWorkoutStore((state) => state.addWeightEntry);
  const [weight, setWeight] = useState(initial);
  const [raw, setRaw] = useState(formatWeight(initial));
  const [date, setDate] = useState(todayKey());

  const commit = (value: number) => {
    const next = clampWeight(value);
    setWeight(next);
    setRaw(formatWeight(next));
  };

  const save = () => {
    const value = clampWeight(weight);
    if (value <= 0 || !date) return;
    addWeightEntry({ id: crypto.randomUUID(), date, weightLbs: value });
    onClose();
  };

  return (
    <Sheet title="LOG WEIGHT" onClose={onClose}>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          aria-label="Decrease weight"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] font-condensed text-[36px] font-bold"
          onClick={() => commit(weight - 0.5)}
        >
          −
        </button>
        <input
          inputMode="decimal"
          aria-label="Body weight in pounds"
          value={raw}
          onChange={(event) => {
            const text = event.target.value.replace(/[^0-9.]/g, '');
            setRaw(text);
            const value = Number(text);
            if (Number.isFinite(value)) setWeight(value);
          }}
          onFocus={(event) => event.target.select()}
          className="h-16 w-full bg-transparent text-center font-condensed text-[64px] font-black leading-none outline-none"
        />
        <button
          type="button"
          aria-label="Increase weight"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] font-condensed text-[36px] font-bold"
          onClick={() => commit(weight + 0.5)}
        >
          +
        </button>
      </div>
      <label className="mt-4 block">
        <span className="font-condensed text-[12px] font-bold tracking-[1.2px] text-[#777]">DATE</span>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="mt-1 h-12 w-full bg-transparent font-condensed text-[22px] font-bold uppercase outline-none"
        />
      </label>
      <button type="button" className="btn-lime mt-4" onClick={save} disabled={clampWeight(weight) <= 0 || !date}>
        Save
      </button>
    </Sheet>
  );
}
