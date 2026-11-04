import { useEffect, useState } from 'react';
import { findLibraryExercise } from '../data/exerciseLibrary';
import type { RoutineExercise, WarmupPlan, WorkoutTemplate } from '../types/workout';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { clampReps, clampWeight } from '../utils/format';
import { LiftPicker } from './LiftPicker';

function blankExercise(): RoutineExercise {
  return { id: crypto.randomUUID(), name: '', sets: 3, reps: 8, weight: 0 };
}

function cleanWarmups(warmups: WarmupPlan[] | undefined): WarmupPlan[] | undefined {
  if (!warmups?.length) return undefined;
  return warmups.map((item) => ({
    reps: Math.max(1, Math.round(item.reps || 1)),
    pct: Math.max(1, Math.min(100, Math.round(item.pct || 1))),
  }));
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
  const [pickerFor, setPickerFor] = useState<string | 'add' | null>(null);

  useEffect(() => {
    if (!open) return;
    setPickerFor(null);
    setName(template?.name ?? '');
    setExercises(
      template
        ? template.exercises.map((exercise) => ({
            ...exercise,
            ...(exercise.warmups ? { warmups: exercise.warmups.map((item) => ({ ...item })) } : {}),
          }))
        : [blankExercise()],
    );
  }, [open, template]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pickerFor) onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, pickerFor]);

  if (!open) return null;

  const valid = name.trim().length > 0 && exercises.length > 0 && exercises.every((exercise) => exercise.name.trim());

  const update = (id: string, patch: Partial<RoutineExercise>) => {
    setExercises((list) => list.map((exercise) => (exercise.id === id ? { ...exercise, ...patch } : exercise)));
  };

  const patchWarmup = (exerciseId: string, index: number, patch: Partial<WarmupPlan>) => {
    setExercises((list) =>
      list.map((exercise) => {
        if (exercise.id !== exerciseId || !exercise.warmups) return exercise;
        return {
          ...exercise,
          warmups: exercise.warmups.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
        };
      }),
    );
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
    const cleaned: RoutineExercise[] = exercises.map((exercise) => {
      const equipment = exercise.equipment?.trim();
      const warmups = cleanWarmups(exercise.warmups);
      return {
        id: exercise.id,
        name: exercise.name.trim(),
        sets: Math.max(1, Math.round(exercise.sets || 1)),
        reps: Math.max(1, clampReps(exercise.reps || 1)),
        weight: clampWeight(exercise.weight || 0),
        ...(equipment ? { equipment } : {}),
        ...(warmups ? { warmups } : {}),
      };
    });
    if (template) {
      updateTemplate({ ...template, name: name.trim(), exercises: cleaned });
    } else {
      addTemplate({ id: crypto.randomUUID(), name: name.trim(), exercises: cleaned });
    }
    onClose();
  };

  const applyPick = (pick: { name: string; equipment?: string }) => {
    const equipment = pick.equipment?.trim() || undefined;
    if (pickerFor && pickerFor !== 'add') {
      update(pickerFor, { name: pick.name, equipment });
    } else if (pick.name) {
      setExercises((list) => {
        const next = { ...blankExercise(), name: pick.name, ...(equipment ? { equipment } : {}) };
        if (list.length === 1 && !list[0].name.trim()) return [next];
        return [...list, next];
      });
    } else {
      setExercises((list) => (list.some((item) => !item.name.trim()) ? list : [...list, blankExercise()]));
    }
    setPickerFor(null);
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
        {template?.notes ? (
          <p className="mt-3 text-[14px] font-semibold leading-snug text-[#aaa]">{template.notes}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-4 pb-4">
          {exercises.map((exercise, index) => (
            <fieldset key={exercise.id} className="border-t border-[#1f1f1f] pt-4">
              <legend className="font-condensed text-[13px] font-bold tracking-[1.5px] text-[#777]">LIFT {String(index + 1).padStart(2, '0')}</legend>
              <input
                value={exercise.name}
                onChange={(event) => {
                  const nextName = event.target.value;
                  const match = findLibraryExercise(nextName);
                  const gear = exercise.equipment;
                  const still = Boolean(
                    gear && match?.equipment.some((option) => option.toLowerCase() === gear.toLowerCase())
                  );
                  update(exercise.id, { name: nextName, equipment: still ? gear : undefined });
                }}
                placeholder="BENCH PRESS"
                autoComplete="off"
                autoCapitalize="words"
                aria-label={`Lift ${index + 1} name`}
                className="mt-2 w-full bg-transparent font-condensed text-[28px] font-extrabold uppercase leading-none outline-none placeholder:text-[#333]"
              />
              {exercise.equipment ? (
                <p className="mt-1 font-condensed text-[14px] font-bold uppercase tracking-[1px] text-accent">{exercise.equipment}</p>
              ) : null}
              <button type="button" className="btn-ghost mt-3" onClick={() => setPickerFor(exercise.id)}>
                Pick lift
              </button>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Stepper label="Sets" value={exercise.sets} min={1} step={1} onChange={(sets) => update(exercise.id, { sets })} />
                <Stepper label="Reps" value={exercise.reps} min={1} step={1} onChange={(reps) => update(exercise.id, { reps })} />
                <Stepper label="Lb" value={exercise.weight} min={0} step={5} onChange={(weight) => update(exercise.id, { weight })} />
              </div>
              {(exercise.warmups ?? []).map((warmup, warmupIndex) => (
                <div key={`${exercise.id}-w-${warmupIndex}`} className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-condensed text-[13px] font-bold tracking-[1.2px] text-[#777]">WARM-UP {warmupIndex + 1}</span>
                    <button
                      type="button"
                      className="font-condensed text-[13px] font-bold uppercase tracking-[1px] text-[#888]"
                      onClick={() =>
                        update(exercise.id, {
                          warmups: (exercise.warmups ?? []).filter((_, itemIndex) => itemIndex !== warmupIndex),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Stepper
                      label="Reps"
                      name={`Warm-up ${warmupIndex + 1} reps`}
                      value={warmup.reps}
                      min={1}
                      step={1}
                      onChange={(reps) => patchWarmup(exercise.id, warmupIndex, { reps })}
                    />
                    <Stepper
                      label="%"
                      name={`Warm-up ${warmupIndex + 1} percent`}
                      value={warmup.pct}
                      min={1}
                      max={100}
                      step={5}
                      onChange={(pct) => patchWarmup(exercise.id, warmupIndex, { pct })}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn-ghost mt-3"
                onClick={() => update(exercise.id, { warmups: [...(exercise.warmups ?? []), { reps: 5, pct: 50 }] })}
              >
                + Warm-up
              </button>
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
          <button type="button" className="btn-line" onClick={() => setPickerFor('add')}>
            + Add lift
          </button>
        </div>

        <div className="sticky bottom-0 mt-auto bg-black py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <button type="submit" className="btn-lime" disabled={!valid}>
            Save routine
          </button>
        </div>
      </form>
      <LiftPicker open={pickerFor !== null} onClose={() => setPickerFor(null)} onPick={applyPick} />
    </div>
  );
}

function Stepper({
  label,
  name,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  name?: string;
  value: number;
  min: number;
  max?: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const called = name ?? label;
  const show = (next: number) => (Number.isInteger(next) ? String(next) : String(Math.round(next * 10) / 10));
  const [raw, setRaw] = useState(show(value));

  const clamp = (next: number) => {
    const capped = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, next));
    return Math.round(capped * 10) / 10;
  };

  const setValue = (next: number) => {
    const clamped = clamp(next);
    onChange(clamped);
    setRaw(show(clamped));
  };

  return (
    <div>
      <span className="font-condensed text-[12px] font-bold tracking-[1.2px] text-[#777]">{label.toUpperCase()}</span>
      <div className="mt-1 flex items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease ${called}`}
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-md bg-[#1a1a1a] font-condensed text-[22px] font-bold"
          onClick={() => setValue(value - step)}
        >
          −
        </button>
        <input
          inputMode="decimal"
          aria-label={called}
          value={raw}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            const text = event.target.value;
            setRaw(text);
            if (/^\d+(\.\d+)?$/.test(text)) {
              const clamped = clamp(Number(text));
              onChange(clamped);
              if (clamped !== Number(text)) setRaw(show(clamped));
            }
          }}
          className="h-11 w-full min-w-0 bg-transparent text-center font-condensed text-[22px] font-extrabold outline-none"
        />
        <button
          type="button"
          aria-label={`Increase ${called}`}
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-md bg-[#1a1a1a] font-condensed text-[22px] font-bold"
          onClick={() => setValue(value + step)}
        >
          +
        </button>
      </div>
    </div>
  );
}
