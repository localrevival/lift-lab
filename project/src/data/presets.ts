import { findLibraryExercise } from './exerciseLibrary.ts';
import type { RoutineExercise, WarmupPlan, WorkoutTemplate } from '../types/workout';

/** Shown on each preset. The model stores one rep number, so the 5-10 range lives here. */
export const PRESET_NOTES =
  "Warm-ups don't count. Working sets 0-1 reps in reserve (prefer 1), reps 5-10. Rest 60-90s between warm-ups, 2+ min between working sets.";

/** Notes shipped before warm-ups. The one-time migration replaces only this sentence. */
const PREVIOUS_PRESET_NOTES = 'All sets 0-1 reps in reserve (prefer 1). Rest 2+ min. Reps 5-10.';

const PRESET_REPS = 5;
const WARMUP_PAIR: WarmupPlan[] = [
  { reps: 10, pct: 50 },
  { reps: 5, pct: 75 },
];
const WARMUP_SINGLE: WarmupPlan[] = [{ reps: 8, pct: 60 }];

function lift(id: string, name: string, sets: number, equipment?: string, warmups?: WarmupPlan[]): RoutineExercise {
  const library = findLibraryExercise(name);
  if (!library) throw new Error(`preset lift is not in the library: ${name}`);
  if (equipment && !library.equipment.some((option) => option.toLowerCase() === equipment.toLowerCase())) {
    throw new Error(`preset equipment is not on ${name}: ${equipment}`);
  }
  return {
    id,
    name: library.name,
    sets,
    reps: PRESET_REPS,
    weight: 0,
    ...(equipment ? { equipment } : {}),
    ...(warmups ? { warmups: warmups.map((item) => ({ ...item })) } : {}),
  };
}

function routine(id: string, name: string, exercises: RoutineExercise[]): WorkoutTemplate {
  return { id, name, notes: PRESET_NOTES, exercises };
}

/** Stable ids so a synced edit stays the same routine. */
export const PRESET_ROUTINES: WorkoutTemplate[] = [
  routine('preset-pull', 'Pull', [
    lift('preset-pull-lat-pulldown', 'Wide Grip Lat Pull-Down', 2, undefined, WARMUP_PAIR),
    lift('preset-pull-chest-row', 'Chest Supported Machine Row', 2, 'Neutral', WARMUP_PAIR),
    lift('preset-pull-single-arm-lat', 'Single Arm Lat Pull-Down/Row', 2),
    lift('preset-pull-tbar', 'Chest Supported T-Bar Row', 2, 'Pronated'),
    lift('preset-pull-rear-delt', 'Rear Delt Fly / Crossover', 3, 'Machine'),
    lift('preset-pull-preacher', 'Single Arm Preacher Curls', 2, 'Cable'),
    lift('preset-pull-curl', 'Seated Dumbbell Curls', 2, 'Hammer'),
  ]),
  routine('preset-push', 'Push', [
    lift('preset-push-press', 'Flat Press', 2, 'Machine', WARMUP_PAIR),
    lift('preset-push-low-fly', 'Seated Low-to-High Cable Fly', 2),
    lift('preset-push-pec-fly', 'Fly', 2, 'Machine'),
    lift('preset-push-ohp', 'Seated OHP', 2, 'Machine', WARMUP_PAIR),
    lift('preset-push-lateral', 'Lateral Raises', 2, 'Cable'),
    lift('preset-push-pushdown', 'Single Arm Tricep Push-Downs', 2, 'Cable'),
    lift('preset-push-extension', 'Overhead Tricep Extension', 2),
  ]),
  routine('preset-lower', 'Lower', [
    lift('preset-lower-extension', 'Leg Extensions', 3, undefined, WARMUP_PAIR),
    lift('preset-lower-curl', 'Seated Leg Curls', 3, undefined, WARMUP_PAIR),
    lift('preset-lower-squat', 'Squats', 2, 'Pendulum', WARMUP_SINGLE),
    lift('preset-lower-sldl', 'SLDLs', 2),
    lift('preset-lower-back', '45° Extensions', 2, undefined, WARMUP_SINGLE),
    lift('preset-lower-press', 'Leg Press', 2, undefined, WARMUP_SINGLE),
    lift('preset-lower-calf', 'Calf Press on Leg Press', 2),
    lift('preset-lower-glute', 'Glute Bridges', 2, 'Machine'),
    lift('preset-lower-adduction', 'Adduction Machine', 3),
    lift('preset-lower-abs', 'Ab Crunch Machine', 2),
  ]),
];

/** Insert any missing preset, once. A true flag means he already had the chance to delete one. */
export function withPresetRoutines<T extends { templates: WorkoutTemplate[]; presetsSeeded: boolean }>(data: T): T {
  if (data.presetsSeeded) return data;
  const ids = new Set(data.templates.map((item) => item.id));
  const missing = PRESET_ROUTINES.filter((item) => !ids.has(item.id)).map((item) => ({
    ...item,
    exercises: item.exercises.map((exercise) => ({
      ...exercise,
      ...(exercise.warmups ? { warmups: exercise.warmups.map((set) => ({ ...set })) } : {}),
    })),
  }));
  return {
    ...data,
    presetsSeeded: true,
    templates: [...missing, ...data.templates],
  };
}

/**
 * Add preset warm-ups once, matched by routine id and lift id.
 * Lifts that already have warm-ups, and everything else he changed, stay put.
 */
export function withPresetWarmups<T extends { templates: WorkoutTemplate[]; presetWarmupsSeeded: boolean }>(data: T): T {
  if (data.presetWarmupsSeeded) return data;
  const templates = data.templates.map((template) => {
    const preset = PRESET_ROUTINES.find((item) => item.id === template.id);
    if (!preset) return template;
    let changed = false;
    const exercises = template.exercises.map((exercise) => {
      const match = preset.exercises.find((item) => item.id === exercise.id);
      if (!match?.warmups?.length || (exercise.warmups && exercise.warmups.length > 0)) return exercise;
      changed = true;
      return { ...exercise, warmups: match.warmups.map((item) => ({ ...item })) };
    });
    const notes = !template.notes || template.notes === PREVIOUS_PRESET_NOTES ? PRESET_NOTES : template.notes;
    if (!changed && notes === template.notes) return template;
    return { ...template, notes, exercises };
  });
  return { ...data, presetWarmupsSeeded: true, templates };
}
