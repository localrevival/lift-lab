import { NavLink, Outlet } from 'react-router-dom';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { IconBody, IconHistory, IconProgress, IconWorkout } from './icons';

const tabs = [
  { to: '/', label: 'Workout', icon: IconWorkout },
  { to: '/history', label: 'History', icon: IconHistory },
  { to: '/progress', label: 'Progress', icon: IconProgress },
  { to: '/body', label: 'Body', icon: IconBody },
];

export function Layout() {
  const live = useWorkoutStore((state) => state.activeWorkout !== null);

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="pb-tab pt-safe mx-auto w-full max-w-[480px] px-[18px]">
        <Outlet />
      </main>
      <nav className="tab-bar fixed inset-x-0 bottom-0 z-40 border-t border-[#222] bg-black" aria-label="Primary">
        <div className="mx-auto flex h-16 max-w-[480px] items-start justify-around pt-2.5">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex w-[72px] flex-col items-center gap-1 font-condensed text-[13px] font-bold uppercase tracking-[1.2px] ${
                  isActive ? 'text-accent' : 'text-[#555]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-[26px] w-[26px]" />
                  <span>{label}</span>
                  {to === '/' && live && !isActive && (
                    <span className="absolute right-4 top-0 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
