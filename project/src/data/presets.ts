import { findLibraryExercise } from './exerciseLibrary';
import type { RoutineExercise, WorkoutTemplate } from '../types/workout';

/** Shown on each preset. The model stores one rep number, so the 5-10 range lives here. */
export const PRESET_NOTES = 'All sets 0-1 reps in reserve (prefer 1). Rest 2+ min. Reps 5-10.';

const PRESET_REPS = 5;

function lift(id: string, name: string, sets: number, equipment?: string): RoutineExercise {
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
  };
}

function routine(id: string, name: string, exercises: RoutineExercise[]): WorkoutTemplate {
  return { id, name, notes: PRESET_NOTES, exercises };
}

/** Stable ids so a synced edit stays the same routine. */
export const PRESET_ROUTINES: WorkoutTemplate[] = [
  routine('preset-pull', 'Pull', [
    lift('preset-pull-lat-pulldown', 'Wide Grip Lat Pull-Down', 2),
    lift('preset-pull-chest-row', 'Chest Supported Machine Row', 2, 'Neutral'),
    lift('preset-pull-single-arm-lat', 'Single Arm Lat Pull-Down/Row', 2),
    lift('preset-pull-tbar', 'Chest Supported T-Bar Row', 2, 'Pronated'),
    lift('preset-pull-rear-delt', 'Rear Delt Fly / Crossover', 3, 'Machine'),
    lift('preset-pull-preacher', 'Single Arm Preacher Curls', 2, 'Cable'),
    lift('preset-pull-curl', 'Seated Dumbbell Curls', 2, 'Hammer'),
  ]),
  routine('preset-push', 'Push', [
    lift('preset-push-press', 'Flat Press', 2, 'Machine'),
    lift('preset-push-low-fly', 'Seated Low-to-High Cable Fly', 2),
    lift('preset-push-pec-fly', 'Fly', 2, 'Machine'),
    lift('preset-push-ohp', 'Seated OHP', 2, 'Machine'),
    lift('preset-push-lateral', 'Lateral Raises', 2, 'Cable'),
    lift('preset-push-pushdown', 'Single Arm Tricep Push-Downs', 2, 'Cable'),
    lift('preset-push-extension', 'Overhead Tricep Extension', 2),
  ]),
  routine('preset-lower', 'Lower', [
    lift('preset-lower-extension', 'Leg Extensions', 3),
    lift('preset-lower-curl', 'Seated Leg Curls', 3),
    lift('preset-lower-squat', 'Squats', 2, 'Pendulum'),
    lift('preset-lower-sldl', 'SLDLs', 2),
    lift('preset-lower-back', '45° Extensions', 2),
    lift('preset-lower-press', 'Leg Press', 2),
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
    exercises: item.exercises.map((exercise) => ({ ...exercise })),
  }));
  return {
    ...data,
    presetsSeeded: true,
    templates: [...missing, ...data.templates],
  };
}
