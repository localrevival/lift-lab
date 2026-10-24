import { useEffect, type ReactNode } from 'react';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-label={title}
        className="sheet-pad w-full max-w-[480px] border-t border-[#222] bg-[#0c0c0c] px-[18px] pt-5"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="font-condensed text-[14px] font-bold tracking-[2px] text-accent">{title}</p>
        {children}
      </div>
    </div>
  );
}
