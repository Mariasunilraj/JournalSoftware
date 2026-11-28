import React from 'react';
import {
  Home,
  LayoutGrid,
  CalendarDays,
  Sparkles,
  Database,
} from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const items = [
    {
      id: 'trades',
      label: 'Home',
      icon: Home,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutGrid,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: CalendarDays,
    },
    {
      id: 'diary',
      label: 'Diary',
      icon: Sparkles,
    },
    {
      id: 'data',
      label: 'Backup',
      icon: Database,
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0d0e]/95 backdrop-blur-xl border-t border-neutral-800/80 text-white no-print pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-5 px-2 pt-1.5 pb-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center min-h-[48px] py-1 px-1 transition-all duration-150 active:scale-95 group"
              aria-label={item.label}
            >
              {/* Active Item: Circular bright neon green background with black icon */}
              {isActive ? (
                <div className="w-10 h-10 rounded-full bg-[#00e676] text-black flex items-center justify-center font-bold shadow-[0_0_14px_rgba(0,230,118,0.45)] mb-0.5 transition-transform">
                  <Icon className="w-5 h-5 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-10 h-10 flex items-center justify-center text-neutral-400 group-hover:text-neutral-200 transition-colors mb-0.5">
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                </div>
              )}

              {/* Label */}
              <span
                className={`text-[10px] sm:text-[11px] tracking-tight truncate max-w-full font-semibold leading-none ${
                  isActive ? 'text-[#00e676] font-bold' : 'text-neutral-400'
                }`}
              >
                {item.label}
              </span>

              {/* Active Indicator Bar */}
              {isActive && (
                <span className="w-4 h-0.5 rounded-full bg-[#00e676] mt-1 shadow-[0_0_6px_#00e676]" />
              )}
            </button>
          );
        })}
      </div>

      {/* iOS Home Indicator Pill */}
      <div className="w-28 h-1 bg-neutral-700/60 rounded-full mx-auto mt-1 mb-1.5" />
    </nav>
  );
}
