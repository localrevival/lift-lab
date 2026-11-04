import { useEffect, useState } from 'react';
import { EXERCISE_LIBRARY, MUSCLE_GROUPS, type LibraryExercise, type MuscleGroup } from '../data/exerciseLibrary';

export function LiftPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (pick: { name: string; equipment?: string }) => void;
}) {
  const [group, setGroup] = useState<MuscleGroup>(MUSCLE_GROUPS[0]);
  const [pending, setPending] = useState<LibraryExercise | null>(null);

  useEffect(() => {
    if (!open) return;
    setGroup(MUSCLE_GROUPS[0]);
    setPending(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (pending) setPending(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, pending]);

  if (!open) return null;

  const lifts = EXERCISE_LIBRARY.filter((item) => item.groups.includes(group));

  const choose = (lift: LibraryExercise) => {
    if (lift.equipment.length === 0) onPick({ name: lift.name });
    else setPending(lift);
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-[18px] pt-safe">
        <div className="flex h-14 items-center justify-between">
          <button type="button" onClick={onClose} className="font-condensed text-[16px] font-bold uppercase tracking-[1.2px] text-[#888]">
            Cancel
          </button>
          <p className="font-condensed text-[14px] font-bold tracking-[2px] text-accent">LIBRARY</p>
          <span className="w-16" />
        </div>
        <h1 className="font-condensed text-[48px] font-black uppercase leading-[0.9] tracking-[-0.5px]">
          {pending ? pending.name : 'Pick a lift'}
        </h1>

        {pending ? (
          <div className="mt-6 flex flex-col gap-2 pb-4">
            <p className="font-condensed text-[13px] font-bold tracking-[1.5px] text-[#777]">EQUIPMENT</p>
            {pending.equipment.map((option) => (
              <button
                key={option}
                type="button"
                className="btn-ghost h-14 text-[20px]"
                onClick={() => onPick({ name: pending.name, equipment: option })}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="-mx-[18px] mt-5 flex gap-2 overflow-x-auto px-[18px] pb-2">
              {MUSCLE_GROUPS.map((item) => {
                const on = item === group;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setGroup(item)}
                    className={`h-11 shrink-0 rounded-md px-4 font-condensed text-[16px] font-bold uppercase tracking-[0.6px] ${
                      on ? 'bg-accent text-black' : 'border border-[#333] text-[#888]'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 pb-4">
              {lifts.map((lift) => {
                const also = lift.groups.filter((item) => item !== group);
                return (
                  <button
                    key={lift.id}
                    type="button"
                    onClick={() => choose(lift)}
                    className="flex min-h-14 w-full flex-col justify-center border-t border-[#1f1f1f] py-3 text-left"
                  >
                    <span className="font-condensed text-[24px] font-extrabold uppercase leading-none">{lift.name}</span>
                    {also.length > 0 ? (
                      <span className="mt-1 text-[12px] font-bold uppercase tracking-[1px] text-[#777]">Also {also.join(', ')}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="sticky bottom-0 mt-auto bg-black py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {pending ? (
            <button type="button" className="btn-ghost" onClick={() => setPending(null)}>
              Back
            </button>
          ) : (
            <button type="button" className="btn-line" onClick={() => onPick({ name: '' })}>
              Type a custom lift
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
