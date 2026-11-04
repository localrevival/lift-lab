import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { startSync, stopSync, submitPasscode, useSyncStore } from '../sync/client';

export function PasscodeGate({ children }: { children: ReactNode }) {
  const phase = useSyncStore((state) => state.phase);
  const gateError = useSyncStore((state) => state.gateError);
  const [passcode, setPasscode] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'open') return undefined;
    startSync();
    return () => stopSync();
  }, [phase]);

  const error = localError ?? (phase === 'locked' ? gateError : null);

  if (phase === 'open') return children;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!passcode) {
      setLocalError('Enter the passcode');
      return;
    }
    setBusy(true);
    setLocalError(null);
    const result = await submitPasscode(passcode);
    setBusy(false);
    if (result === 'unauthorized') setLocalError('Wrong passcode');
    if (result === 'unreachable') setLocalError("Can't reach the server. Try again.");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-center bg-black px-[18px] text-white">
      <p className="font-condensed text-[14px] font-bold tracking-[2px] text-accent">LIFT LAB</p>
      <h1 className="mt-1 font-condensed text-[58px] font-black uppercase leading-[0.9] tracking-[-0.5px]">Passcode</h1>
      <p className="mt-4 max-w-[300px] text-[15px] font-semibold leading-snug text-[#777]">
        One code for your laptop and your phone. Enter it once on this device.
      </p>
      <form onSubmit={onSubmit} className="mt-8">
        <label className="block">
          <span className="font-condensed text-[13px] font-bold tracking-[1.5px] text-[#777]">PASSCODE</span>
          <input
            type="password"
            name="passcode"
            value={passcode}
            onChange={(event) => {
              setPasscode(event.target.value);
              setLocalError(null);
              if (useSyncStore.getState().gateError) useSyncStore.setState({ gateError: null });
            }}
            autoFocus
            autoComplete="current-password"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            className="mt-1 w-full border-b border-[#333] bg-transparent py-2 font-condensed text-[40px] font-black tracking-[2px] outline-none"
          />
        </label>
        {error && (
          <p className="mt-3 text-[14px] font-semibold text-[#ff5a5a]" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-lime mt-6" disabled={busy}>
          {busy ? 'Checking' : 'Continue'}
        </button>
      </form>
    </main>
  );
}
