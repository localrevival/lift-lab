import { useEffect, useState } from 'react';
import type { RoutineExercise, WorkoutTemplate } from '../types/workout';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { clampReps, clampWeight } from '../utils/format';

function blankExercise(): RoutineExercise {
  return { id: crypto.randomUUID(), name: '', sets: 3, reps: 8, weight: 0 };
}

export function RoutineEditor({
  open,
  template,
  onClose,
}: {
  open: boolean;
  template?: WorkoutTemplate | null;
  onClose: () => void;
}) {
  const addTemplate = useWorkoutStore((state) => state.addTemplate);
  const updateTemplate = useWorkoutStore((state) => state.updateTemplate);
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? '');
    setExercises(template ? template.exercises.map((exercise) => ({ ...exercise })) : [blankExercise()]);
  }, [open, template]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const valid = name.trim().length > 0 && exercises.length > 0 && exercises.every((exercise) => exercise.name.trim());

  const update = (id: string, patch: Partial<RoutineExercise>) => {
    setExercises((list) => list.map((exercise) => (exercise.id === id ? { ...exercise, ...patch } : exercise)));
  };

  const move = (index: number, direction: -1 | 1) => {
    setExercises((list) => {
      const next = index + direction;
      if (next < 0 || next >= list.length) return list;
      const copy = [...list];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  };

  const save = () => {
    if (!valid) return;
    const cleaned: RoutineExercise[] = exercises.map((exercise) => ({
      ...exercise,
      name: exercise.name.trim(),
      sets: Math.max(1, Math.round(exercise.sets || 1)),
      reps: Math.max(1, clampReps(exercise.reps || 1)),
      weight: clampWeight(exercise.weight || 0),
    }));
    if (template) {
      updateTemplate({ ...template, name: name.trim(), exercises: cleaned });
    } else {
      addTemplate({ id: crypto.randomUUID(), name: name.trim(), exercises: cleaned });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black">
      <form
        className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-[18px] pt-safe"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="flex h-14 items-center justify-between">
          <button type="button" onClick={onClose} className="font-condensed text-[16px] font-bold uppercase tracking-[1.2px] text-[#888]">
            Cancel
          </button>
          <p className="font-condensed text-[14px] font-bold tracking-[2px] text-accent">{template ? 'EDIT' : 'NEW'}</p>
          <span className="w-16" />
        </div>
        <h1 className="font-condensed text-[48px] font-black uppercase leading-[0.9] tracking-[-0.5px]">
          {template ? 'Edit routine' : 'New routine'}
        </h1>
        <label className="mt-6 block">
          <span className="font-condensed text-[13px] font-bold tracking-[1.5px] text-[#777]">NAME</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="PUSH DAY"
            autoComplete="off"
            autoCapitalize="characters"
            className="mt-1 w-full border-b border-[#333] bg-transparent py-2 font-condensed text-[40px] font-black uppercase leading-none outline-none placeholder:text-[#333]"
          />
        </label>

        <div className="mt-6 flex flex-col gap-4 pb-4">
          {exercises.map((exercise, index) => (
            <fieldset key={exercise.id} className="border-t border-[#1f1f1f] pt-4">
              <legend className="font-condensed text-[13px] font-bold tracking-[1.5px] text-[#777]">LIFT {String(index + 1).padStart(2, '0')}</legend>
              <input
                value={exercise.name}
                onChange={(event) => update(exercise.id, { name: event.target.value })}
                placeholder="BENCH PRESS"
                autoComplete="off"
                autoCapitalize="words"
                aria-label={`Lift ${index + 1} name`}
                className="mt-2 w-full bg-transparent font-condensed text-[28px] font-extrabold uppercase leading-none outline-none placeholder:text-[#333]"
              />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Stepper label="Sets" value={exercise.sets} min={1} step={1} onChange={(sets) => update(exercise.id, { sets })} />
                <Stepper label="Reps" value={exercise.reps} min={1} step={1} onChange={(reps) => update(exercise.id, { reps })} />
                <Stepper label="Lb" value={exercise.weight} min={0} step={5} onChange={(weight) => update(exercise.id, { weight })} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button type="button" className="btn-ghost" disabled={index === 0} onClick={() => move(index, -1)}>
                  Up
                </button>
                <button type="button" className="btn-ghost" disabled={index === exercises.length - 1} onClick={() => move(index, 1)}>
                  Down
                </button>
                <button
                  type="button"
                  className="btn-ghost text-[#888]"
                  onClick={() => setExercises((list) => list.filter((item) => item.id !== exercise.id))}
                >
                  Remove
                </button>
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            className="btn-line"
            onClick={() => setExercises((list) => [...list, blankExercise()])}
          >
            + Add lift
          </button>
        </div>

        <div className="sticky bottom-0 mt-auto bg-black py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <button type="submit" className="btn-lime" disabled={!valid}>
            Save routine
          </button>
        </div>
      </form>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const show = (next: number) => (Number.isInteger(next) ? String(next) : String(Math.round(next * 10) / 10));
  const [raw, setRaw] = useState(show(value));

  const setValue = (next: number) => {
    const clamped = Math.max(min, Math.round(next * 10) / 10);
    onChange(clamped);
    setRaw(show(clamped));
  };

  return (
    <div>
      <span className="font-condensed text-[12px] font-bold tracking-[1.2px] text-[#777]">{label.toUpperCase()}</span>
      <div className="mt-1 flex items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-md bg-[#1a1a1a] font-condensed text-[22px] font-bold"
          onClick={() => setValue(value - step)}
        >
          −
        </button>
        <input
          inputMode="decimal"
          aria-label={label}
          value={raw}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            const text = event.target.value;
            setRaw(text);
            if (/^\d+(\.\d+)?$/.test(text)) onChange(Math.max(min, Number(text)));
          }}
          className="h-11 w-full min-w-0 bg-transparent text-center font-condensed text-[22px] font-extrabold outline-none"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-md bg-[#1a1a1a] font-condensed text-[22px] font-bold"
          onClick={() => setValue(value + step)}
        >
          +
        </button>
      </div>
    </div>
  );
}
