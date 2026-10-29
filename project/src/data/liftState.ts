import type {
  ActiveWorkout,
  LoggedSet,
  RoutineExercise,
  SessionExercise,
  WeightEntry,
  Workout,
  WorkoutExercise,
  WorkoutTemplate,
} from '../types/workout';

/** Everything that lives in local storage. Sync ships `syncPayload` and leaves the live session here. */
export interface LiftData {
  templates: WorkoutTemplate[];
  workouts: Workout[];
  activeWorkout: ActiveWorkout | null;
  weightLog: WeightEntry[];
}

export const emptyLiftData = (): LiftData => ({
  templates: [],
  workouts: [],
  activeWorkout: null,
  weightLog: [],
});

/**
 * The slice sync reads and writes.
 * The in-progress session stays on the device until the workout is finished.
 */
export function syncPayload(data: LiftData): Pick<LiftData, 'templates' | 'workouts' | 'weightLog'> {
  return {
    templates: data.templates,
    workouts: data.workouts,
    weightLog: data.weightLog,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function sanitizeSet(value: unknown): LoggedSet | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  return {
    id: value.id,
    weight: Math.max(0, num(value.weight)),
    reps: Math.max(0, Math.round(num(value.reps))),
    completed: value.completed === true,
  };
}

function sanitizeRoutineExercise(value: unknown): RoutineExercise | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return null;
  const name = value.name.trim();
  if (!name) return null;
  return {
    id: value.id,
    name,
    sets: Math.max(1, Math.round(num(value.sets, 1))),
    reps: Math.max(1, Math.round(num(value.reps, 1))),
    weight: Math.max(0, num(value.weight)),
  };
}

function sanitizeTemplate(value: unknown): WorkoutTemplate | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || !Array.isArray(value.exercises)) {
    return null;
  }
  const name = value.name.trim();
  if (!name) return null;
  const exercises = value.exercises.map(sanitizeRoutineExercise).filter((item): item is RoutineExercise => item !== null);
  if (exercises.length === 0) return null;
  return { id: value.id, name, exercises };
}

function sanitizeWorkoutExercise(value: unknown): WorkoutExercise | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || !Array.isArray(value.sets)) {
    return null;
  }
  const name = value.name.trim();
  if (!name) return null;
  const sets = value.sets.map(sanitizeSet).filter((item): item is LoggedSet => item !== null);
  return { id: value.id, name, sets };
}

function sanitizeSessionExercise(value: unknown): SessionExercise | null {
  const base = sanitizeWorkoutExercise(value);
  if (!base || !isRecord(value)) return null;
  return {
    ...base,
    plannedSets: Math.max(1, Math.round(num(value.plannedSets, base.sets.length || 1))),
    plannedReps: Math.max(1, Math.round(num(value.plannedReps, base.sets[0]?.reps || 1))),
  };
}

function sanitizeWorkout(value: unknown): Workout | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.date !== 'string') {
    return null;
  }
  if (!Array.isArray(value.exercises)) return null;
  const exercises = value.exercises.map(sanitizeWorkoutExercise).filter((item): item is WorkoutExercise => item !== null);
  if (exercises.length === 0) return null;
  return {
    id: value.id,
    name: value.name.trim() || 'Workout',
    templateId: typeof value.templateId === 'string' ? value.templateId : undefined,
    date: value.date,
    duration: Math.max(0, Math.round(num(value.duration))),
    exercises,
  };
}

function sanitizeActive(value: unknown): ActiveWorkout | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.startedAt !== 'string') {
    return null;
  }
  if (typeof value.templateId !== 'string' || !Array.isArray(value.exercises)) return null;
  const exercises = value.exercises.map(sanitizeSessionExercise).filter((item): item is SessionExercise => item !== null);
  if (exercises.length === 0) return null;
  return {
    id: value.id,
    templateId: value.templateId,
    name: value.name.trim() || 'Workout',
    startedAt: value.startedAt,
    exercises,
  };
}

function sanitizeWeight(value: unknown): WeightEntry | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.date !== 'string') return null;
  const weightLbs = num(value.weightLbs, Number.NaN);
  if (!Number.isFinite(weightLbs) || weightLbs <= 0) return null;
  return { id: value.id, date: value.date.slice(0, 10), weightLbs };
}

/** Drop anything that isn't the current shape so a bad write can't blank the app. */
export function sanitizeLiftData(value: unknown): LiftData {
  const record = isRecord(value) ? value : {};
  const templates = Array.isArray(record.templates)
    ? record.templates.map(sanitizeTemplate).filter((item): item is WorkoutTemplate => item !== null)
    : [];
  const workouts = Array.isArray(record.workouts)
    ? record.workouts.map(sanitizeWorkout).filter((item): item is Workout => item !== null)
    : [];
  const weightLog = Array.isArray(record.weightLog)
    ? record.weightLog
        .map(sanitizeWeight)
        .filter((item): item is WeightEntry => item !== null)
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];
  return {
    templates,
    workouts,
    activeWorkout: sanitizeActive(record.activeWorkout),
    weightLog,
  };
}
