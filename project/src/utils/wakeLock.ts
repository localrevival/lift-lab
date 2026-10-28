interface WakeLockSentinel {
  release: () => Promise<void>;
  addEventListener: (type: string, listener: EventListener) => void;
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
};

let sentinel: WakeLockSentinel | null = null;
let holding = false;
let listening = false;

async function acquire(): Promise<void> {
  if (!holding || sentinel) return;
  try {
    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock) return;
    sentinel = await nav.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
      if (holding && document.visibilityState === 'visible') void acquire();
    });
  } catch {
    // The browser only grants this while the page is visible.
  }
}

function onVisibility(): void {
  if (document.visibilityState === 'visible') void acquire();
}

/** Keep the screen on for the duration of a live workout. */
export async function requestWakeLock(): Promise<void> {
  holding = true;
  if (!listening) {
    document.addEventListener('visibilitychange', onVisibility);
    listening = true;
  }
  await acquire();
}

export async function releaseWakeLock(): Promise<void> {
  holding = false;
  if (listening) {
    document.removeEventListener('visibilitychange', onVisibility);
    listening = false;
  }
  const current = sentinel;
  sentinel = null;
  try {
    await current?.release();
  } catch {
    // Already released by the browser.
  }
}
