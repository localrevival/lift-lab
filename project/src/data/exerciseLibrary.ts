/** DeanTTraining aesthetic list. Bundled, not stored, so existing devices pick it up on load. */

export const LIBRARY_SOURCE = 'DeanTTraining aesthetic list';

export const MUSCLE_GROUPS = [
  'Chest',
  'Lats',
  'Mid-Upper Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Traps',
  'Quads',
  'Hamstrings',
  'Adductors',
  'Glutes',
  'Calves',
  'Abs',
  'Obliques',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface LibraryExercise {
  id: string;
  name: string;
  groups: MuscleGroup[];
  equipment: string[];
  source: string;
}

function lift(name: string, groups: MuscleGroup[], equipment: string[] = []): LibraryExercise {
  return {
    id: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    name,
    groups,
    equipment,
    source: LIBRARY_SOURCE,
  };
}

/** One row per lift. The same name collapses to a single entry and unions groups and equipment. */
function mergeLibrary(rows: LibraryExercise[]): LibraryExercise[] {
  const byName = new Map<string, LibraryExercise>();
  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, row);
      continue;
    }
    const groups = [...existing.groups];
    for (const group of row.groups) {
      if (!groups.includes(group)) groups.push(group);
    }
    const equipment = [...existing.equipment];
    for (const item of row.equipment) {
      if (!equipment.some((option) => option.toLowerCase() === item.toLowerCase())) equipment.push(item);
    }
    byName.set(key, { ...existing, groups, equipment });
  }
  return [...byName.values()];
}

export const EXERCISE_LIBRARY: LibraryExercise[] = mergeLibrary([
  lift('Flat Press', ['Chest'], ['Machine', 'Cable', 'Smith', 'Barbell', 'Dumbbell']),
  lift('Incline Press', ['Chest'], ['Machine', 'Cable', 'Smith', 'Barbell', 'Dumbbell']),
  lift('Fly', ['Chest'], ['Machine', 'Cable']),
  lift('Wide Grip Lat Pull-Down', ['Lats'], ['Machine', 'Cable']),
  lift('Single Arm Lat Pull-Down/Row', ['Lats'], ['Machine', 'Cable']),
  lift('Wide Grip Pull-Ups', ['Lats'], ['Assisted', 'Bodyweight', 'Weighted']),
  lift('Chest Supported Row, elbows ~0°', ['Mid-Upper Back'], ['Machine', 'Cable', 'Dumbbell']),
  lift('Chest Supported Row, elbows ~45°', ['Mid-Upper Back'], ['Machine', 'Cable', 'Dumbbell']),
  lift('Chest Supported Row, elbows ~90°', ['Mid-Upper Back'], ['Machine', 'Cable', 'Dumbbell']),
  lift('Seated OHP', ['Shoulders'], ['Machine', 'Cable', 'Smith', 'Barbell', 'Dumbbell']),
  lift('Lateral Raises', ['Shoulders'], ['Cable', 'Machine', 'Dumbbell']),
  lift('Rear Delt Fly / Crossover', ['Shoulders'], ['Machine', 'Cable']),
  lift('Seated Dumbbell Curls', ['Biceps'], ['Supinated', 'Hammer']),
  lift('Preacher Curls', ['Biceps'], ['Machine', 'Cable']),
  lift('Behind-the-Back Cable Curls', ['Biceps']),
  lift('Dips', ['Triceps'], ['Machine', 'Assisted', 'Bodyweight', 'Weighted']),
  lift('Single Arm Tricep Push-Downs', ['Triceps'], ['Cable', 'Banded']),
  lift('Banded Smith JM Press', ['Triceps']),
  lift('Kelso Shrugs', ['Traps'], ['Machine', 'Smith', 'Dumbbell']),
  lift('Vertical Shrugs', ['Traps'], ['Machine', 'Smith', 'Barbell']),
  lift('Squats', ['Quads'], ['Pendulum', 'Hack', 'Smith', 'Heels Elevated', 'Belt', 'SSB', 'Barbell']),
  lift('Leg Extensions', ['Quads']),
  lift('Leg Press, feet low', ['Quads']),
  lift('Seated Leg Curls', ['Hamstrings']),
  lift('45° Extensions', ['Hamstrings', 'Glutes']),
  lift('SLDLs', ['Hamstrings'], ['Machine', 'Trap Bar', 'Barbell', 'Dumbbell']),
  lift('Adduction Machine', ['Adductors']),
  lift('Glute Bridges', ['Glutes'], ['Machine', 'Smith', 'Barbell']),
  lift('RDLs', ['Glutes'], ['Machine', 'Trap Bar', 'Barbell', 'Dumbbell']),
  lift('Leg Press, feet high', ['Glutes']),
  lift('Calf Press on Leg Press', ['Calves']),
  lift('Donkey Calf Raises', ['Calves'], ['Machine', 'Partner']),
  lift('Standing Calf Raises', ['Calves'], ['Machine', 'Smith']),
  lift('Seated Calf Raises', ['Calves'], ['Machine', 'Smith']),
  lift('Ab Crunch Machine', ['Abs']),
  lift('Weighted Decline Sit-Ups/Crunches', ['Abs']),
  lift('Cable Crunches', ['Abs']),
  lift('Machine Oblique Crunches', ['Obliques']),
  lift('Machine Torso Twists', ['Obliques']),
]);

export function findLibraryExercise(name: string): LibraryExercise | undefined {
  const key = name.trim().toLowerCase();
  if (!key) return undefined;
  return EXERCISE_LIBRARY.find((item) => item.name.toLowerCase() === key);
}
