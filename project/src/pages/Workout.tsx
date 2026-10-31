import { useState } from 'react';
import { LiveWorkout } from '../components/LiveWorkout';
import { RoutineEditor } from '../components/RoutineEditor';
import { ScreenHeader } from '../components/ScreenHeader';
import { Sheet } from '../components/Sheet';
import { useWorkoutStore } from '../store/useWorkoutStore';
import type { WorkoutTemplate } from '../types/workout';
import { formatTag } from '../utils/format';
import { latestWorkoutFor, liftLabel } from '../utils/workout';

export function Workout() {
  const templates = useWorkoutStore((state) => state.templates);
  const workouts = useWorkoutStore((state) => state.workouts);
  const active = useWorkoutStore((state) => state.activeWorkout);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);
  const deleteTemplate = useWorkoutStore((state) => state.deleteTemplate);
  const [editor, setEditor] = useState<WorkoutTemplate | null | 'new'>(null);
  const [pendingDelete, setPendingDelete] = useState<WorkoutTemplate | null>(null);

  if (active) return <LiveWorkout session={active} />;

  return (
    <div>
      <ScreenHeader tag="LIFT LAB" title="Workout" />
      {templates.length === 0 ? (
        <div className="mt-8">
          <p className="font-condensed text-[22px] font-bold uppercase tracking-[1px] text-[#888]">No routines yet</p>
          <p className="mt-2 max-w-[280px] text-[15px] font-semibold leading-snug text-[#777]">
            Add the lifts you repeat. Each set is weight and reps.
          </p>
          <button type="button" className="btn-lime mt-6" onClick={() => setEditor('new')}>
            + New routine
          </button>
        </div>
      ) : (
        <div className="mt-2">
          {templates.map((template) => {
            const last = latestWorkoutFor(template, workouts);
            const lifts = template.exercises.length;
            return (
              <article key={template.id} className="border-t border-[#1f1f1f] py-4">
                <h2 className="font-condensed text-[32px] font-extrabold uppercase leading-none">{template.name}</h2>
                <p className="mt-1.5 text-[12px] font-bold uppercase tracking-[1px] text-[#777]">
                  {lifts} {lifts === 1 ? 'lift' : 'lifts'}
                  {last ? ` · ${formatTag(last.date)}` : ''}
                </p>
                <ul className="mt-3">
                  {template.exercises.map((exercise) => (
                    <li key={exercise.id} className="flex items-baseline justify-between gap-3 py-1">
                      <span className="min-w-0 truncate font-condensed text-[18px] font-bold uppercase">{liftLabel(exercise.name, exercise.equipment)}</span>
                      <span className="shrink-0 text-[13px] font-bold tracking-[1px] text-[#777]">
                        {exercise.sets} × {exercise.reps}
                        {exercise.weight > 0 ? ` · ${exercise.weight}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn-lime mt-3" onClick={() => startWorkout(template.id)}>
                  Start
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setEditor(template)}>
                    Edit
                  </button>
                  <button type="button" className="btn-ghost text-[#888]" onClick={() => setPendingDelete(template)}>
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
          <button type="button" className="btn-line mt-2" onClick={() => setEditor('new')}>
            + New routine
          </button>
        </div>
      )}

      <RoutineEditor
        open={editor !== null}
        template={editor && editor !== 'new' ? editor : null}
        onClose={() => setEditor(null)}
      />

      {pendingDelete && (
        <Sheet title="DELETE ROUTINE" onClose={() => setPendingDelete(null)}>
          <p className="mt-3 font-condensed text-[28px] font-extrabold uppercase leading-none">{pendingDelete.name}</p>
          <p className="mt-2 text-[14px] font-semibold text-[#888]">Past workouts stay in history.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" className="btn-ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-lime"
              onClick={() => {
                deleteTemplate(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
