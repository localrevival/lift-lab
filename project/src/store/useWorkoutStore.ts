import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { emptyLiftData, sanitizeLiftData, syncPayload, type LiftData } from '../data/liftState';
import type { WeightEntry, WorkoutTemplate } from '../types/workout';
import { clampReps, clampWeight } from '../utils/format';
import { sessionFromTemplate } from '../utils/workout';

interface LiftStore extends LiftData {
  addTemplate: (template: WorkoutTemplate) => void;
  updateTemplate: (template: WorkoutTemplate) => void;
  deleteTemplate: (id: string) => void;
  startWorkout: (templateId: string) => void;
  updateSet: (exerciseId: string, setId: string, patch: { weight?: number; reps?: number }) => void;
  toggleSet: (exerciseId: string, setId: string) => void;
  addSet: (exerciseId: string) => void;
  finishWorkout: () => void;
  discardWorkout: () => void;
  deleteWorkout: (id: string) => void;
  addWeightEntry: (entry: WeightEntry) => void;
  deleteWeightEntry: (id: string) => void;
}

export { syncPayload };

export const useWorkoutStore = create<LiftStore>()(
  persist(
    (set) => ({
      ...emptyLiftData(),
      addTemplate: (template) => set((state) => ({ templates: [...state.templates, template] })),
      updateTemplate: (template) =>
        set((state) => ({
          templates: state.templates.map((item) => (item.id === template.id ? template : item)),
        })),
      deleteTemplate: (id) => set((state) => ({ templates: state.templates.filter((item) => item.id !== id) })),
      startWorkout: (templateId) =>
        set((state) => {
          if (state.activeWorkout) return state;
          const template = state.templates.find((item) => item.id === templateId);
          if (!template) return state;
          return { activeWorkout: sessionFromTemplate(template, state.workouts) };
        }),
      updateSet: (exerciseId, setId, patch) =>
        set((state) => {
          const active = state.activeWorkout;
          if (!active) return state;
          return {
            activeWorkout: {
              ...active,
              exercises: active.exercises.map((exercise) =>
                exercise.id !== exerciseId
                  ? exercise
                  : {
                      ...exercise,
                      sets: exercise.sets.map((item) =>
                        item.id !== setId
                          ? item
                          : {
                              ...item,
                              weight: patch.weight === undefined ? item.weight : clampWeight(patch.weight),
                              reps: patch.reps === undefined ? item.reps : clampReps(patch.reps),
                            }
                      ),
                    }
              ),
            },
          };
        }),
      toggleSet: (exerciseId, setId) =>
        set((state) => {
          const active = state.activeWorkout;
          if (!active) return state;
          return {
            activeWorkout: {
              ...active,
              exercises: active.exercises.map((exercise) =>
                exercise.id !== exerciseId
                  ? exercise
                  : {
                      ...exercise,
                      sets: exercise.sets.map((item) =>
                        item.id === setId ? { ...item, completed: !item.completed } : item
                      ),
                    }
              ),
            },
          };
        }),
      addSet: (exerciseId) =>
        set((state) => {
          const active = state.activeWorkout;
          if (!active) return state;
          return {
            activeWorkout: {
              ...active,
              exercises: active.exercises.map((exercise) => {
                if (exercise.id !== exerciseId) return exercise;
                const previous = exercise.sets[exercise.sets.length - 1];
                return {
                  ...exercise,
                  sets: [
                    ...exercise.sets,
                    {
                      id: crypto.randomUUID(),
                      weight: previous?.weight ?? 0,
                      reps: previous?.reps ?? exercise.plannedReps,
                      completed: false,
                    },
                  ],
                };
              }),
            },
          };
        }),
      finishWorkout: () =>
        set((state) => {
          const active = state.activeWorkout;
          if (!active) return state;
          const anyDone = active.exercises.some((exercise) => exercise.sets.some((item) => item.completed));
          if (!anyDone) return { activeWorkout: null };
          const started = new Date(active.startedAt).getTime();
          return {
            activeWorkout: null,
            workouts: [
              ...state.workouts,
              {
                id: active.id,
                name: active.name,
                templateId: active.templateId,
                date: active.startedAt,
                duration: Math.max(0, Math.round((Date.now() - started) / 1000)),
                exercises: active.exercises.map((exercise) => ({
                  id: exercise.id,
                  name: exercise.name,
                  ...(exercise.equipment ? { equipment: exercise.equipment } : {}),
                  sets: exercise.sets.map((item) => ({ ...item })),
                })),
              },
            ],
          };
        }),
      discardWorkout: () => set({ activeWorkout: null }),
      deleteWorkout: (id) => set((state) => ({ workouts: state.workouts.filter((item) => item.id !== id) })),
      addWeightEntry: (entry) =>
        set((state) => {
          const day = entry.date.slice(0, 10);
          const rest = state.weightLog.filter((item) => item.date.slice(0, 10) !== day);
          return {
            weightLog: [...rest, { ...entry, date: day }].sort((a, b) => a.date.localeCompare(b.date)),
          };
        }),
      deleteWeightEntry: (id) => set((state) => ({ weightLog: state.weightLog.filter((item) => item.id !== id) })),
    }),
    {
      name: 'lift-lab',
      // Catalog is bundled in exerciseLibrary.ts, so a version bump is not required to ship new lifts.
      version: 1,
      partialize: (state) => ({
        templates: state.templates,
        workouts: state.workouts,
        activeWorkout: state.activeWorkout,
        weightLog: state.weightLog,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...sanitizeLiftData(persisted),
      }),
    }
  )
);
