import { useEffect, useState } from 'react';
import type { ActiveWorkout, LoggedSet } from '../types/workout';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { formatClock, formatTag, formatVolume, formatWeight } from '../utils/format';
import { activeSetId, lastPerformance, liftLabel, movedLbs, setCounts } from '../utils/workout';
import { releaseWakeLock, requestWakeLock } from '../utils/wakeLock';
import { IconCheck, IconClock } from './icons';
import { Sheet } from './Sheet';

type EditTarget = { exerciseId: string; setId: string; field: 'weight' | 'reps' };

export function LiveWorkout({ session }: { session: ActiveWorkout }) {
  const workouts = useWorkoutStore((state) => state.workouts);
  const updateSet = useWorkoutStore((state) => state.updateSet);
  const toggleSet = useWorkoutStore((state) => state.toggleSet);
  const addSet = useWorkoutStore((state) => state.addSet);
  const finishWorkout = useWorkoutStore((state) => state.finishWorkout);
  const discardWorkout = useWorkoutStore((state) => state.discardWorkout);

  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    void requestWakeLock();
    return () => {
      window.clearInterval(id);
      void releaseWakeLock();
    };
  }, []);

  const elapsed = Math.max(0, Math.round((now - new Date(session.startedAt).getTime()) / 1000));
  const { done, total } = setCounts(session.exercises);
  const volume = movedLbs(session.exercises);
  const currentId = activeSetId(session.exercises);
  const allDone = total > 0 && done === total;
  const pct = total > 0 ? (done / total) * 100 : 0;

  const editingSet = editing
    ? session.exercises.find((exercise) => exercise.id === editing.exerciseId)?.sets.find((set) => set.id === editing.setId)
    : undefined;

  return (
    <div>
      <header>
        <div className="flex items-center justify-between">
          <p className="font-condensed text-[14px] font-bold tracking-[2px] text-accent">{formatTag(session.startedAt)}</p>
          <p className="flex items-center gap-1.5 font-condensed text-[18px] font-bold tracking-[1px]">
            <IconClock />
            <span className="tabular-nums">{formatClock(elapsed)}</span>
          </p>
        </div>
        <h1 className="mt-1 font-condensed text-[58px] font-black uppercase leading-[0.9] tracking-[-0.5px]">{session.name}</h1>
        <div
          className="mt-3.5 h-1.5 overflow-hidden rounded-[3px] bg-[#1a1a1a]"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Sets completed"
        >
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[12px] font-bold uppercase tracking-[1px] text-[#888]">
          <span>
            {done} of {total} sets
          </span>
          <span>{formatVolume(volume)} lbs moved</span>
        </div>
      </header>

      <div className="mt-3">
        {session.exercises.map((exercise) => {
          const exerciseDone = exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);
          const started = exercise.sets.some((set) => set.completed) || exercise.sets.some((set) => set.id === currentId);
          const last = lastPerformance(workouts, exercise.name, exercise.equipment);
          const label = liftLabel(exercise.name, exercise.equipment);
          const meta = exerciseDone
            ? 'DONE ✓'
            : started && last
              ? `LAST ${formatWeight(last.weight)}×${last.reps}`
              : `${exercise.plannedSets} × ${exercise.plannedReps}`;
          const showAdd = exercise.sets.some((set) => set.id === currentId) || (currentId === null && exercise === session.exercises[session.exercises.length - 1]);

          return (
            <section key={exercise.id} className="border-t border-[#1f1f1f] pb-1.5 pt-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="min-w-0 font-condensed text-[26px] font-extrabold uppercase leading-none tracking-[0.3px]">
                  {label}
                </h2>
                <p className="shrink-0 font-sans text-[12px] font-bold uppercase tracking-[1px] text-[#777]">{meta}</p>
              </div>
              {exercise.sets.map((set, index) => (
                <SetRow
                  key={set.id}
                  index={index}
                  set={set}
                  exerciseName={label}
                  active={set.id === currentId}
                  dim={currentId !== null && !set.completed && set.id !== currentId && isAfter(session, currentId, set.id)}
                  onToggle={() => toggleSet(exercise.id, set.id)}
                  onEdit={(field) => setEditing({ exerciseId: exercise.id, setId: set.id, field })}
                />
              ))}
              {showAdd && (
                <button type="button" className="btn-lime mb-2 mt-2.5" onClick={() => addSet(exercise.id)}>
                  + Add set
                </button>
              )}
            </section>
          );
        })}
      </div>

      <div className="h-[76px]" />
      <div className="above-tab pointer-events-none fixed inset-x-0 z-30">
        <div className="pointer-events-auto mx-auto w-full max-w-[480px] px-[18px] pb-2">
          <button
            type="button"
            className={allDone ? 'btn-lime' : 'btn-line'}
            onClick={() => setConfirming(true)}
          >
            Finish
          </button>
        </div>
      </div>

      {editing && editingSet && (
        <SetEditor
          field={editing.field}
          set={editingSet}
          onChange={(patch) => updateSet(editing.exerciseId, editing.setId, patch)}
          onClose={() => setEditing(null)}
        />
      )}

      {confirming && (
        <Sheet title={done > 0 ? 'FINISH' : 'NOTHING LOGGED'} onClose={() => setConfirming(false)}>
          <p className="mt-3 font-condensed text-[28px] font-extrabold uppercase leading-none">
            {done} of {total} sets
          </p>
          <p className="mt-2 text-[13px] font-bold uppercase tracking-[1px] text-[#888]">
            {formatVolume(volume)} lb · {formatClock(elapsed)}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            {done > 0 && (
              <button type="button" className="btn-lime" onClick={() => finishWorkout()}>
                Save workout
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={() => discardWorkout()}>
              Discard
            </button>
            <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>
              Keep going
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function isAfter(session: ActiveWorkout, currentId: string, setId: string): boolean {
  const order = session.exercises.flatMap((exercise) => exercise.sets.map((set) => set.id));
  return order.indexOf(setId) > order.indexOf(currentId);
}

function SetRow({
  index,
  set,
  exerciseName,
  active,
  dim,
  onToggle,
  onEdit,
}: {
  index: number;
  set: LoggedSet;
  exerciseName: string;
  active: boolean;
  dim: boolean;
  onToggle: () => void;
  onEdit: (field: 'weight' | 'reps') => void;
}) {
  const numberTone = dim ? 'text-[#444]' : 'text-white';
  const unitTone = dim ? 'text-[#444]' : 'text-[#777]';
  return (
    <div
      className={`grid h-14 grid-cols-[30px_minmax(0,1.25fr)_22px_minmax(0,0.7fr)_52px] items-center gap-1.5 ${
        active ? '-mx-[18px] border-l-4 border-accent bg-[#111] px-[14px]' : ''
      }`}
      aria-current={active ? 'step' : undefined}
    >
      <span className={`font-condensed text-[16px] font-bold ${active ? 'text-accent' : 'text-[#666]'}`}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <button
        type="button"
        onClick={() => onEdit('weight')}
        aria-label={`${exerciseName} set ${index + 1} weight, ${formatWeight(set.weight)} pounds`}
        className={`flex h-full items-baseline justify-end whitespace-nowrap font-condensed text-[38px] font-extrabold leading-none ${numberTone}`}
      >
        {formatWeight(set.weight)}
        <span className={`ml-[3px] align-baseline text-[14px] font-bold tracking-[1px] ${unitTone}`}>LB</span>
      </button>
      <span className="text-center font-condensed text-[22px] font-bold text-[#555]">×</span>
      <button
        type="button"
        onClick={() => onEdit('reps')}
        aria-label={`${exerciseName} set ${index + 1} reps, ${set.reps}`}
        className={`flex h-full items-baseline justify-start font-condensed text-[38px] font-extrabold leading-none ${numberTone}`}
      >
        {set.reps}
      </button>
      <button
        type="button"
        role="checkbox"
        aria-checked={set.completed}
        aria-label={set.completed ? `Mark ${exerciseName} set ${index + 1} not done` : `Mark ${exerciseName} set ${index + 1} done`}
        onClick={onToggle}
        className={`flex h-12 w-12 items-center justify-center justify-self-end rounded-lg border-[2.5px] ${
          set.completed ? 'border-accent bg-accent' : active ? 'border-accent bg-transparent' : 'border-[#333] bg-transparent'
        }`}
      >
        {set.completed && <IconCheck />}
      </button>
    </div>
  );
}

function SetEditor({
  field,
  set,
  onChange,
  onClose,
}: {
  field: 'weight' | 'reps';
  set: LoggedSet;
  onChange: (patch: { weight?: number; reps?: number }) => void;
  onClose: () => void;
}) {
  const current = field === 'weight' ? set.weight : set.reps;
  const [raw, setRaw] = useState(formatWeight(current));
  const step = field === 'weight' ? 5 : 1;

  const commit = (value: number) => {
    const next = field === 'weight' ? value : Math.round(value);
    onChange(field === 'weight' ? { weight: next } : { reps: next });
    setRaw(field === 'weight' ? formatWeight(next) : String(Math.round(next)));
  };

  const applyRaw = (text: string) => {
    setRaw(text);
    if (text === '') return;
    const value = Number(text);
    if (!Number.isFinite(value)) return;
    onChange(field === 'weight' ? { weight: value } : { reps: value });
  };

  return (
    <Sheet title={field === 'weight' ? 'WEIGHT' : 'REPS'} onClose={onClose}>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          aria-label="Decrease"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] font-condensed text-[36px] font-bold"
          onClick={() => commit(Math.max(0, current - step))}
        >
          −
        </button>
        <input
          inputMode="decimal"
          aria-label={field === 'weight' ? 'Weight in pounds' : 'Reps'}
          value={raw}
          onChange={(event) => applyRaw(event.target.value.replace(/[^0-9.]/g, ''))}
          onFocus={(event) => event.target.select()}
          className="h-16 w-full bg-transparent text-center font-condensed text-[64px] font-black leading-none outline-none"
        />
        <button
          type="button"
          aria-label="Increase"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] font-condensed text-[36px] font-bold"
          onClick={() => commit(current + step)}
        >
          +
        </button>
      </div>
      <p className="mt-2 text-center text-[12px] font-bold uppercase tracking-[1px] text-[#777]">
        {field === 'weight' ? 'Pounds · steps of 5' : 'Reps'}
      </p>
      <button type="button" className="btn-lime mt-5" onClick={onClose}>
        Done
      </button>
    </Sheet>
  );
}
