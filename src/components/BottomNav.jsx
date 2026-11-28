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
      label: 'Data',
      icon: Database,
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[rgba(10,12,16,0.68)] backdrop-blur-2xl backdrop-saturate-150 border-t border-white/[0.12] text-white no-print pb-safe shadow-[0_-10px_35px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.12)]">
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
              {/* Active Item: Circular bright neon green glass gradient background */}
              {isActive ? (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00c853] via-[#00e676] to-[#00ff7f] text-black flex items-center justify-center font-bold shadow-[0_0_18px_rgba(0,255,102,0.5),inset_0_1px_2px_rgba(255,255,255,0.5)] mb-0.5 transition-transform scale-105">
                  <Icon className="w-5 h-5 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 group-hover:text-neutral-100 group-hover:bg-white/[0.05] group-active:bg-white/[0.1] transition-all mb-0.5">
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                </div>
              )}

              {/* Label */}
              <span
                className={`text-[10px] sm:text-[11px] tracking-tight truncate max-w-full font-semibold leading-none transition-colors ${
                  isActive ? 'text-[#00e676] font-bold drop-shadow-[0_0_8px_rgba(0,230,118,0.5)]' : 'text-neutral-400'
                }`}
              >
                {item.label}
              </span>

              {/* Active Indicator Bar */}
              {isActive && (
                <span className="w-4 h-0.5 rounded-full bg-[#00e676] mt-1 shadow-[0_0_8px_#00e676]" />
              )}
            </button>
          );
        })}
      </div>

      {/* iOS Home Indicator Pill */}
      <div className="w-28 h-1 bg-white/20 rounded-full mx-auto mt-1 mb-1.5" />
    </nav>
  );
}
