import React from 'react';
import { Map, MessageCircle } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'map', label: 'Map', icon: Map },
  { id: 'assistant', label: 'Assistant', icon: MessageCircle },
];

export default function MobileNavBar({ active, onChange }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200/80 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-lg md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-stretch justify-around px-4">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`relative flex min-h-[48px] min-w-[80px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors ${
                isActive ? 'text-brand-600' : 'text-stone-500'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute inset-x-4 top-1.5 h-9 rounded-full bg-brand-50" aria-hidden="true" />
              )}
              <Icon className={`relative h-6 w-6 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              <span className={`relative text-[11px] font-semibold ${isActive ? 'font-bold' : ''}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
