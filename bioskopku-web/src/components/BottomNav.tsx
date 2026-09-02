
import React from 'react';
import { Home, Compass, Bookmark, User as UserIcon } from 'lucide-react';
import type { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  savedCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, savedCount = 0 }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Beranda', icon: Home },
    { id: 'search' as TabType, label: 'Eksplorasi', icon: Compass },
    { id: 'library' as TabType, label: 'Daftar', icon: Bookmark, badge: savedCount },
    { id: 'profile' as TabType, label: 'Profil', icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#141414]/95 backdrop-blur-md border-t border-white/10 px-4 py-2 flex items-center justify-around md:hidden">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`relative flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
              isActive ? 'text-[#E50914]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-bold">{tab.label}</span>
            {Boolean(tab.badge && tab.badge > 0) && (
              <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-[#E50914] text-white text-[9px] font-black flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
