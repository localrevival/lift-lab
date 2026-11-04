import type { ActiveWorkout, LoggedSet, SessionExercise, Workout, WorkoutTemplate } from '../types/workout';
import { formatShort } from './format.ts';

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Chart and history label. Equipment keeps barbell and dumbbell on separate series. */
export function liftLabel(name: string, equipment?: string): string {
  const trimmed = name.trim();
  const gear = equipment?.trim();
  return gear ? `${trimmed} · ${gear}` : trimmed;
}

function liftKey(name: string, equipment?: string): string {
  return liftLabel(name, equipment).toLowerCase();
}

function isWorking(set: LoggedSet): boolean {
  return set.warmup !== true;
}

export function movedLbs(exercises: { sets: LoggedSet[] }[]): number {
  return exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.reduce((inner, set) => inner + (set.completed && isWorking(set) ? set.weight * set.reps : 0), 0),
    0
  );
}

export function setCounts(exercises: { sets: LoggedSet[] }[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const exercise of exercises) {
    const sets = exercise.sets.filter(isWorking);
    total += sets.length;
    done += sets.filter((set) => set.completed).length;
  }
  return { done, total };
}

/** First incomplete set, in exercise order. */
export function activeSetId(exercises: SessionExercise[]): string | null {
  for (const exercise of exercises) {
    const set = exercise.sets.find((item) => !item.completed);
    if (set) return set.id;
  }
  return null;
}

/** Last completed set for this lift, from finished workouts only. */
export function lastPerformance(
  workouts: Workout[],
  name: string,
  equipment?: string
): { weight: number; reps: number } | null {
  const key = liftKey(name, equipment);
  const sorted = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const workout of sorted) {
    const exercise = workout.exercises.find((item) => liftKey(item.name, item.equipment) === key);
    if (!exercise) continue;
    const done = [...exercise.sets].reverse().find((set) => set.completed && isWorking(set));
    if (done) return { weight: done.weight, reps: done.reps };
  }
  return null;
}

/** Weight on the first working set the last time this lift was logged. */
export function lastFirstWorkingWeight(workouts: Workout[], name: string, equipment?: string): number | null {
  const key = liftKey(name, equipment);
  const sorted = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const workout of sorted) {
    const exercise = workout.exercises.find((item) => liftKey(item.name, item.equipment) === key);
    if (!exercise) continue;
    const first = exercise.sets.find((set) => isWorking(set));
    if (first && first.weight > 0) return first.weight;
  }
  return null;
}

/** Percent of the first working weight, rounded to the nearest 5 lb. 0 when there is no history. */
export function warmupLoad(pct: number, firstWorkingLbs: number | null): number {
  if (firstWorkingLbs == null || firstWorkingLbs <= 0 || !(pct > 0)) return 0;
  return Math.max(0, Math.round((firstWorkingLbs * pct) / 100 / 5) * 5);
}

export function sessionFromTemplate(template: WorkoutTemplate, workouts: Workout[]): ActiveWorkout {
  return {
    id: crypto.randomUUID(),
    templateId: template.id,
    name: template.name,
    startedAt: new Date().toISOString(),
    exercises: template.exercises.map((exercise) => {
      const last = lastPerformance(workouts, exercise.name, exercise.equipment);
      const weight = last?.weight ?? exercise.weight;
      const firstWorking = lastFirstWorkingWeight(workouts, exercise.name, exercise.equipment);
      const count = Math.max(1, exercise.sets);
      const warmups = (exercise.warmups ?? []).map((plan) => ({
        id: crypto.randomUUID(),
        weight: warmupLoad(plan.pct, firstWorking),
        reps: plan.reps,
        completed: false,
        warmup: true,
      }));
      return {
        id: crypto.randomUUID(),
        name: exercise.name,
        ...(exercise.equipment ? { equipment: exercise.equipment } : {}),
        plannedSets: count,
        plannedReps: exercise.reps,
        sets: [
          ...warmups,
          ...Array.from({ length: count }, () => ({
            id: crypto.randomUUID(),
            weight,
            reps: exercise.reps,
            completed: false,
          })),
        ],
      };
    }),
  };
}

export function latestWorkoutFor(template: WorkoutTemplate, workouts: Workout[]): Workout | undefined {
  return workouts
    .filter((workout) => (workout.templateId ? workout.templateId === template.id : sameName(workout.name, template.name)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

/** Lifts that have at least one completed set with a weight. */
export function loggedLiftNames(workouts: Workout[]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const sorted = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const workout of sorted) {
    for (const exercise of workout.exercises) {
      const key = liftKey(exercise.name, exercise.equipment);
      if (!key || seen.has(key)) continue;
      const hit = exercise.sets.some((set) => isWorking(set) && set.completed && set.weight > 0);
      if (!hit) continue;
      seen.add(key);
      names.push(liftLabel(exercise.name, exercise.equipment));
    }
  }
  return names.sort((a, b) => a.localeCompare(b));
}

export interface BestPoint {
  date: string;
  label: string;
  weight: number;
}

/** Best completed weight for one lift, one point per calendar day. */
export function bestWeightSeries(workouts: Workout[], name: string): BestPoint[] {
  const byDay = new Map<string, BestPoint>();
  for (const workout of workouts) {
    const exercise = workout.exercises.find((item) => liftKey(item.name, item.equipment) === name.trim().toLowerCase());
    if (!exercise) continue;
    const best = exercise.sets
      .filter((set) => isWorking(set) && set.completed)
      .reduce((max, set) => Math.max(max, set.weight), 0);
    if (best <= 0) continue;
    const day = workout.date.slice(0, 10);
    const prev = byDay.get(day);
    if (!prev || best > prev.weight) {
      byDay.set(day, { date: workout.date, label: formatShort(workout.date), weight: best });
    }
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}
