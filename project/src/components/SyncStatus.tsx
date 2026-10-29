import { useSyncStore, type SyncStatus as SyncStatusName } from '../sync/client';

const LABEL: Record<Exclude<SyncStatusName, 'idle'>, string> = {
  syncing: 'SYNC',
  saved: 'SAVED',
  offline: 'OFFLINE',
};

export function SyncStatus() {
  const status = useSyncStore((state) => state.status);
  if (status === 'idle') return null;
  const quiet = status === 'offline';
  return (
    <p
      role="status"
      aria-live="polite"
      className={`flex items-center gap-1.5 font-condensed text-[11px] font-bold tracking-[1.6px] ${quiet ? 'text-[#666]' : 'text-accent'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${quiet ? 'bg-[#555]' : 'bg-accent'}`} aria-hidden />
      {LABEL[status]}
    </p>
  );
}
