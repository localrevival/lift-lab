import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeLiftData } from '../data/liftState.ts';
import { PRESET_NOTES, PRESET_ROUTINES, withPresetWarmups } from '../data/presets.ts';
import type { LoggedSet, Workout, WorkoutTemplate } from '../types/workout.ts';
import {
  bestWeightSeries,
  lastFirstWorkingWeight,
  lastPerformance,
  loggedLiftNames,
  movedLbs,
  sessionFromTemplate,
  setCounts,
  warmupLoad,
} from './workout.ts';

const PREVIOUS_NOTES = 'All sets 0-1 reps in reserve (prefer 1). Rest 2+ min. Reps 5-10.';
const PAIR = [
  { reps: 10, pct: 50 },
  { reps: 5, pct: 75 },
];
const SINGLE = [{ reps: 8, pct: 60 }];

function logged(partial: Partial<LoggedSet> & Pick<LoggedSet, 'weight' | 'reps'>): LoggedSet {
  return {
    id: partial.id ?? crypto.randomUUID(),
    weight: partial.weight,
    reps: partial.reps,
    completed: partial.completed ?? true,
    ...(partial.warmup ? { warmup: true } : {}),
  };
}

function session(sets: LoggedSet[], name = 'Flat Press', equipment = 'Machine'): Workout {
  return {
    id: 'w1',
    name: 'Push',
    date: '2026-11-01T15:00:00.000Z',
    duration: 60,
    exercises: [{ id: 'e1', name, ...(equipment ? { equipment } : {}), sets }],
  };
}

test('presets use the warm-up percents and the new note', () => {
  const warmups = (routineId: string, exerciseId: string) =>
    PRESET_ROUTINES.find((item) => item.id === routineId)?.exercises.find((item) => item.id === exerciseId)?.warmups;
  assert.deepEqual(warmups('preset-pull', 'preset-pull-lat-pulldown'), PAIR);
  assert.deepEqual(warmups('preset-pull', 'preset-pull-chest-row'), PAIR);
  assert.equal(warmups('preset-pull', 'preset-pull-preacher'), undefined);
  assert.deepEqual(warmups('preset-push', 'preset-push-press'), PAIR);
  assert.deepEqual(warmups('preset-push', 'preset-push-ohp'), PAIR);
  assert.equal(warmups('preset-push', 'preset-push-lateral'), undefined);
  assert.deepEqual(warmups('preset-lower', 'preset-lower-extension'), PAIR);
  assert.deepEqual(warmups('preset-lower', 'preset-lower-curl'), PAIR);
  assert.deepEqual(warmups('preset-lower', 'preset-lower-squat'), SINGLE);
  assert.deepEqual(warmups('preset-lower', 'preset-lower-back'), SINGLE);
  assert.deepEqual(warmups('preset-lower', 'preset-lower-press'), SINGLE);
  assert.equal(warmups('preset-lower', 'preset-lower-sldl'), undefined);
  assert.equal(
    PRESET_ROUTINES.every((item) => item.notes === PRESET_NOTES),
    true,
  );
});

test('warm-ups are excluded from volume, set counts, bests, and working-weight prefill', () => {
  const sets = [logged({ id: 'w', weight: 300, reps: 10, warmup: true }), logged({ id: 'a', weight: 200, reps: 5 }), logged({ id: 'b', weight: 210, reps: 4 })];
  assert.equal(movedLbs([{ sets }]), 200 * 5 + 210 * 4);
  assert.deepEqual(setCounts([{ sets }]), { done: 2, total: 2 });

  const loggedWorkout = session(sets);
  assert.equal(lastPerformance([loggedWorkout], 'Flat Press', 'Machine')?.weight, 210);
  assert.equal(lastFirstWorkingWeight([loggedWorkout], 'Flat Press', 'Machine'), 200);
  assert.equal(bestWeightSeries([loggedWorkout], 'Flat Press · Machine')[0]?.weight, 210);
  assert.deepEqual(loggedLiftNames([loggedWorkout]), ['Flat Press · Machine']);

  const warmupOnly = session([logged({ weight: 300, reps: 10, warmup: true })]);
  assert.equal(lastPerformance([warmupOnly], 'Flat Press', 'Machine'), null);
  assert.deepEqual(loggedLiftNames([warmupOnly]), []);
  assert.deepEqual(bestWeightSeries([warmupOnly], 'Flat Press · Machine'), []);
  assert.equal(movedLbs(warmupOnly.exercises), 0);
});

test('warm-up weight is a percent of the first working set, nearest 5 lb', () => {
  assert.equal(warmupLoad(50, 135), 70);
  assert.equal(warmupLoad(75, 135), 100);
  assert.equal(warmupLoad(60, 135), 80);
  assert.equal(warmupLoad(60, 200), 120);
  assert.equal(warmupLoad(50, null), 0);
  assert.equal(warmupLoad(75, 0), 0);

  const history = session([
    logged({ weight: 100, reps: 10, warmup: true }),
    logged({ id: 'a', weight: 200, reps: 5 }),
    logged({ id: 'b', weight: 210, reps: 5 }),
  ]);
  const template: WorkoutTemplate = {
    id: 't',
    name: 'Push',
    exercises: [
      {
        id: 'e',
        name: 'Flat Press',
        equipment: 'Machine',
        sets: 2,
        reps: 5,
        weight: 45,
        warmups: PAIR,
      },
    ],
  };
  const rows = sessionFromTemplate(template, [history]).exercises[0].sets;
  assert.deepEqual(
    rows.map((row) => ({ weight: row.weight, reps: row.reps, warmup: row.warmup === true })),
    [
      { weight: 100, reps: 10, warmup: true },
      { weight: 150, reps: 5, warmup: true },
      { weight: 210, reps: 5, warmup: false },
      { weight: 210, reps: 5, warmup: false },
    ],
  );

  const fresh = sessionFromTemplate(template, []).exercises[0].sets;
  assert.equal(fresh[0].weight, 0);
  assert.equal(fresh[0].reps, 10);
  assert.equal(fresh[0].warmup, true);
  assert.equal(fresh[2].weight, 45);
  assert.equal(fresh[2].warmup, undefined);
});

test('migration adds preset warm-ups once and leaves other edits alone', () => {
  const pull = PRESET_ROUTINES.find((item) => item.id === 'preset-pull');
  assert.ok(pull);
  const saved: WorkoutTemplate = {
    id: pull.id,
    name: 'Pull day',
    notes: PREVIOUS_NOTES,
    exercises: [
      ...pull.exercises.map((exercise) => {
        const next = { ...exercise };
        delete next.warmups;
        if (exercise.id !== 'preset-pull-lat-pulldown') return next;
        return { ...next, sets: 4, reps: 6, weight: 120, name: 'Lat pulldown' };
      }),
      { id: 'custom', name: 'Face Pull', sets: 2, reps: 12, weight: 40 },
    ],
  };
  const curl = saved.exercises.find((item) => item.id === 'preset-pull-curl');
  assert.ok(curl);
  curl.warmups = [{ reps: 3, pct: 40 }];

  const once = withPresetWarmups({
    templates: [saved, { id: 'mine', name: 'Arms', notes: 'Keep this', exercises: [{ id: 'a', name: 'Curl', sets: 1, reps: 8, weight: 25 }] }],
    presetWarmupsSeeded: false,
  });
  const lat = once.templates[0].exercises.find((item) => item.id === 'preset-pull-lat-pulldown');
  const row = once.templates[0].exercises.find((item) => item.id === 'preset-pull-chest-row');
  assert.deepEqual(lat?.warmups, PAIR);
  assert.equal(lat?.sets, 4);
  assert.equal(lat?.reps, 6);
  assert.equal(lat?.weight, 120);
  assert.equal(lat?.name, 'Lat pulldown');
  assert.deepEqual(row?.warmups, PAIR);
  assert.equal(row?.equipment, 'Neutral');
  assert.equal(row?.sets, 2);
  assert.deepEqual(
    once.templates[0].exercises.find((item) => item.id === 'preset-pull-curl')?.warmups,
    [{ reps: 3, pct: 40 }],
  );
  assert.equal(once.templates[0].exercises.find((item) => item.id === 'custom')?.warmups, undefined);
  assert.equal(once.templates[0].name, 'Pull day');
  assert.equal(once.templates[0].notes, PRESET_NOTES);
  assert.equal(once.templates[1].notes, 'Keep this');
  assert.equal(once.templates[1].exercises[0].warmups, undefined);
  assert.equal(once.presetWarmupsSeeded, true);

  const custom = withPresetWarmups({
    templates: [{ ...saved, notes: 'My own note' }],
    presetWarmupsSeeded: false,
  });
  assert.equal(custom.templates[0].notes, 'My own note');

  const filled = withPresetWarmups({ ...once, presetWarmupsSeeded: false });
  assert.equal(filled.templates[0].exercises.find((item) => item.id === 'preset-pull-lat-pulldown')?.warmups?.length, 2);

  const cleared = {
    ...once,
    templates: once.templates.map((template, index) =>
      index === 0
        ? {
            ...template,
            exercises: template.exercises.map((exercise) =>
              exercise.id === 'preset-pull-lat-pulldown' ? { ...exercise, warmups: undefined } : exercise,
            ),
          }
        : template,
    ),
  };
  const twice = withPresetWarmups(cleared);
  assert.equal(twice, cleared);
  assert.equal(twice.templates[0].exercises.find((item) => item.id === 'preset-pull-lat-pulldown')?.warmups, undefined);
});

test('sanitize keeps warm-up plans and the logged warm-up flag', () => {
  const clean = sanitizeLiftData({
    presetWarmupsSeeded: true,
    templates: [
      {
        id: 't',
        name: 'Push',
        exercises: [
          {
            id: 'e',
            name: 'Press',
            sets: 2,
            reps: 5,
            weight: 0,
            warmups: [
              { reps: 10, pct: 50 },
              { reps: 0, pct: 20 },
              { reps: 5, pct: 150 },
            ],
          },
        ],
      },
    ],
    workouts: [
      {
        id: 'w',
        name: 'Push',
        date: '2026-11-01T00:00:00.000Z',
        duration: 1,
        exercises: [
          {
            id: 'e',
            name: 'Press',
            sets: [
              { id: 'a', weight: 50, reps: 10, completed: true, warmup: true },
              { id: 'b', weight: 100, reps: 5, completed: true },
            ],
          },
        ],
      },
    ],
  });
  assert.deepEqual(clean.templates[0].exercises[0].warmups, [{ reps: 10, pct: 50 }]);
  assert.equal(clean.workouts[0].exercises[0].sets[0].warmup, true);
  assert.equal(clean.workouts[0].exercises[0].sets[1].warmup, undefined);
  assert.equal(clean.presetWarmupsSeeded, true);
});
