/** A logged set. Weight is pounds. */
export interface LoggedSet {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
}

/** One lift inside a saved routine. */
export interface RoutineExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  /** Starting weight in pounds. The live session prefers the last logged weight. */
  weight: number;
  /** Library option chosen for this lift, when the list has one. */
  equipment?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

/** One lift inside a finished or in-progress session. */
export interface SessionExercise {
  id: string;
  name: string;
  equipment?: string;
  plannedSets: number;
  plannedReps: number;
  sets: LoggedSet[];
}

/** In-progress session. Stays on this device until it is finished. */
export interface ActiveWorkout {
  id: string;
  templateId: string;
  name: string;
  startedAt: string;
  exercises: SessionExercise[];
}

export interface WorkoutExercise {
  id: string;
  name: string;
  equipment?: string;
  sets: LoggedSet[];
}

export interface Workout {
  id: string;
  name: string;
  templateId?: string;
  /** ISO timestamp of when the session started. */
  date: string;
  /** Elapsed seconds. */
  duration: number;
  exercises: WorkoutExercise[];
}

/** One body-weight measurement. `date` is YYYY-MM-DD. Weight is pounds. */
export interface WeightEntry {
  id: string;
  date: string;
  weightLbs: number;
}
