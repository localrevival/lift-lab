import type { ReactNode } from 'react';

export function ScreenHeader({ tag, title, children }: { tag: string; title: string; children?: ReactNode }) {
  return (
    <header className="pb-2">
      <div className="flex items-center justify-between gap-3">
        <p className="font-condensed text-[14px] font-bold tracking-[2px] text-accent">{tag}</p>
        {children}
      </div>
      <h1 className="mt-1 font-condensed text-[58px] font-black uppercase leading-[0.9] tracking-[-0.5px]">{title}</h1>
    </header>
  );
}
