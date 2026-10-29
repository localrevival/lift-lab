export type SyncAction = 'apply-server' | 'push-local' | 'idle';

export interface SyncDecisionInput {
  /** ISO time of the server row, or null when the table has no row. */
  serverUpdatedAt: string | null;
  /** True when the server has no row, or the blob has no routines, workouts, or weigh-ins. */
  serverEmpty: boolean;
  /** Milliseconds of the last local edit to syncable data. */
  localUpdatedAt: number;
  localEmpty: boolean;
  /** This device has edits the server has not acknowledged. */
  dirty: boolean;
  /** Server time this device last applied or pushed. Null until the first success. */
  acknowledgedAt: string | null;
}

/**
 * Last write wins.
 * An empty server takes the local blob. When both sides changed, the later
 * timestamp wins, and an equal timestamp keeps the server copy so two devices
 * don't bounce the same row forever.
 */
export function decideSync(input: SyncDecisionInput): SyncAction {
  if (input.serverUpdatedAt === null || input.serverEmpty) {
    return input.localEmpty && !input.dirty ? 'idle' : 'push-local';
  }

  if (!input.dirty && input.acknowledgedAt === input.serverUpdatedAt) {
    return 'idle';
  }

  const serverMs = Date.parse(input.serverUpdatedAt);
  if (Number.isNaN(serverMs)) {
    return input.localEmpty && !input.dirty ? 'idle' : 'push-local';
  }

  const acknowledgedMs = input.acknowledgedAt === null ? null : Date.parse(input.acknowledgedAt);
  const serverChanged =
    acknowledgedMs === null || Number.isNaN(acknowledgedMs) || serverMs > acknowledgedMs;

  if (input.dirty && serverChanged) {
    return input.localUpdatedAt > serverMs ? 'push-local' : 'apply-server';
  }
  if (serverChanged) return 'apply-server';
  if (input.dirty) return 'push-local';
  return 'idle';
}

/** True when a blob has nothing worth treating as someone else's training log. */
export function payloadIsEmpty(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return true;
  const record = data as Record<string, unknown>;
  const count = (key: string) => (Array.isArray(record[key]) ? record[key].length : 0);
  return count('templates') + count('workouts') + count('weightLog') === 0;
}

/** Best local clock for data that existed before sync. Undated routines stay at 0. */
export function contentUpdatedAt(data: {
  workouts: readonly { date: string }[];
  weightLog: readonly { date: string }[];
}): number {
  let latest = 0;
  for (const workout of data.workouts) {
    const time = Date.parse(workout.date);
    if (Number.isFinite(time)) latest = Math.max(latest, time);
  }
  for (const entry of data.weightLog) {
    const time = Date.parse(entry.date);
    if (Number.isFinite(time)) latest = Math.max(latest, time);
  }
  return latest;
}
