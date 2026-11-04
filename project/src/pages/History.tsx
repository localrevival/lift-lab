import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { Sheet } from '../components/Sheet';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { formatClock, formatTag, formatVolume, formatWeight } from '../utils/format';
import { liftLabel, movedLbs, setCounts } from '../utils/workout';

export function History() {
  const workouts = useWorkoutStore((state) => state.workouts);
  const deleteWorkout = useWorkoutStore((state) => state.deleteWorkout);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const sorted = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <ScreenHeader tag="LOG" title="History" />
      {sorted.length === 0 ? (
        <div className="mt-8">
          <p className="font-condensed text-[22px] font-bold uppercase tracking-[1px] text-[#888]">No sessions yet</p>
          <p className="mt-2 max-w-[280px] text-[15px] font-semibold leading-snug text-[#777]">
            Finish a workout and it shows up here.
          </p>
          <Link to="/" className="btn-lime mt-6">
            Go to workout
          </Link>
        </div>
      ) : (
        <div className="mt-2">
          {sorted.map((workout) => {
            const counts = setCounts(workout.exercises);
            const open = openId === workout.id;
            return (
              <article key={workout.id} className="border-t border-[#1f1f1f] py-4">
                <button type="button" className="w-full text-left" onClick={() => setOpenId(open ? null : workout.id)} aria-expanded={open}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-condensed text-[14px] font-bold tracking-[1.5px] text-accent">{formatTag(workout.date)}</p>
                    <p className="font-condensed text-[16px] font-bold tabular-nums text-[#888]">{formatClock(workout.duration)}</p>
                  </div>
                  <h2 className="mt-1 font-condensed text-[32px] font-extrabold uppercase leading-none">{workout.name}</h2>
                  <p className="mt-1.5 text-[12px] font-bold uppercase tracking-[1px] text-[#777]">
                    {counts.done} of {counts.total} sets · {formatVolume(movedLbs(workout.exercises))} lb
                  </p>
                </button>
                {open && (
                  <div className="mt-3 border-t border-[#1f1f1f] pt-2">
                    {workout.exercises.map((exercise) => (
                      <div key={exercise.id} className="py-2">
                        <p className="font-condensed text-[18px] font-extrabold uppercase">{liftLabel(exercise.name, exercise.equipment)}</p>
                        {exercise.sets.map((set, index) => (
                          <div key={set.id} className="mt-1 flex items-baseline justify-between">
                            <span className="w-8 font-condensed text-[14px] font-bold text-[#666]">{String(index + 1).padStart(2, '0')}</span>
                            <span className={`font-condensed text-[26px] font-extrabold leading-none ${set.completed ? 'text-white' : 'text-[#444]'}`}>
                              {formatWeight(set.weight)}
                              <span className="ml-1 text-[12px] font-bold tracking-[1px] text-[#777]">LB</span>
                              <span className="mx-2 text-[18px] text-[#555]">×</span>
                              {set.reps}
                            </span>
                            <span className={`w-6 text-right font-bold ${set.completed ? 'text-accent' : 'text-[#333]'}`}>
                              {set.completed ? '✓' : '–'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <button type="button" className="btn-ghost mt-3 text-[#888]" onClick={() => setPendingDelete(workout.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {pendingDelete && (
        <Sheet title="DELETE WORKOUT" onClose={() => setPendingDelete(null)}>
          <p className="mt-3 text-[15px] font-semibold text-[#aaa]">This session leaves history and progress.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" className="btn-ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-lime"
              onClick={() => {
                deleteWorkout(pendingDelete);
                setPendingDelete(null);
                setOpenId(null);
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
