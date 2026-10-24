import React from 'react';
import {
  BookOpen,
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  Database,
} from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, analytics }) {
  const items = [
    {
      id: 'trades',
      label: 'Journal',
      icon: BookOpen,
      badge: analytics?.totalTrades,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-t border-neutral-800 text-white no-print pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-5 px-2 py-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors duration-150 active:scale-95 relative ${
                isActive ? 'text-emerald-400 font-bold' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-emerald-400' : ''}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-emerald-500 text-black font-black text-[10px] px-1.5 rounded-full leading-tight">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] sm:text-xs mt-1 tracking-tight truncate max-w-full font-semibold">
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5 shadow-[0_0_6px_#00e676]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
