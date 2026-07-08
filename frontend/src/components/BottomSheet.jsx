import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function BottomSheet({ open, onClose, title, subtitle, children, tall = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 flex flex-col rounded-t-[28px] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)] ${
          tall ? 'h-[min(88dvh,720px)]' : 'h-[min(72dvh,560px)]'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex shrink-0 flex-col items-center border-b border-stone-100 px-4 pb-3 pt-3">
          <div className="mb-3 h-1 w-10 rounded-full bg-stone-300" aria-hidden="true" />
          <div className="flex w-full items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-stone-900">{title}</h2>
              {subtitle && (
                <p className="mt-0.5 text-xs font-medium text-stone-500">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
