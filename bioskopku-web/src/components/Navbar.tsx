import React, { useState, useEffect } from 'react';
import { 
  Home, Film, Tv, Layers, Tag, Globe, Search, 
  User as UserIcon, Download, X, LogOut, ChevronDown, Sparkles
} from 'lucide-react';
import type { TabType, User } from '../types';

interface NavbarProps {
  activeTab: TabType;
  selectedCategory?: string;
  onChangeTab: (tab: TabType) => void;
  onSearchQuery?: (q: string) => void;
  savedCount?: number;
  user?: User | null;
  onLogout?: () => void;
  onSelectCategory?: (cat: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  selectedCategory = 'home',
  onChangeTab, 
  onSearchQuery,
  savedCount = 0,
  user,
  onLogout,
  onSelectCategory,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onChangeTab('search');
      if (onSearchQuery) onSearchQuery(searchInput.trim());
      setIsSearchOpen(false);
    }
  };

  const navCategories = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'movie', label: 'Movies', icon: Film },
    { id: 'series', label: 'TV Series', icon: Tv },
    { id: 'indo', label: 'Film Indo', icon: Sparkles },
    { id: 'kdrama', label: 'Drakor', icon: Globe },
    { id: 'dracin', label: 'Dracin', icon: Globe },
    { id: 'anime', label: 'Anime', icon: Globe },
    { id: 'library', label: 'Library', icon: Layers, badge: savedCount },
    { id: 'genres', label: 'Genres', icon: Tag },
  ];

  const handleCategoryClick = (id: string) => {
    if (onSelectCategory) {
      onSelectCategory(id);
    } else {
      if (id === 'home') onChangeTab('home');
      else if (id === 'library') onChangeTab('library');
      else onChangeTab('search');
    }
  };

  const isCategoryActive = (id: string) => {
    if (id === 'home') {
      return activeTab === 'home' || selectedCategory === 'home' || selectedCategory === 'all';
    }
    if (id === 'library') {
      return activeTab === 'library' || selectedCategory === 'library';
    }
    if (id === 'genres') {
      return activeTab === 'search' && (!selectedCategory || selectedCategory === 'genres');
    }
    return selectedCategory === id;
  };

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      isScrolled 
        ? 'bg-[#08080a]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl' 
        : 'bg-gradient-to-b from-[#08080a] via-[#08080a]/90 to-transparent backdrop-blur-md border-b border-white/5'
    }`}>
      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
        
        {/* Left: Brand Logo (Angled Kinetic Cyber Badge) */}
        <div 
          onClick={() => handleCategoryClick('home')}
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
        >
          <div className="relative transform -rotate-2 group-hover:rotate-0 transition-transform duration-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF1E27] to-[#B30006] p-0.5 shadow-lg shadow-[#FF1E27]/40">
              <div className="w-full h-full bg-[#0d0d12] rounded-[10px] flex items-center justify-center border border-white/10">
                <span className="font-display text-xl text-[#D4FF00] tracking-wider font-black -skew-x-6">//</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center text-2xl sm:text-3xl font-display tracking-wider uppercase leading-none">
              <span className="text-white drop-shadow">RUANG</span>
              <span className="text-[#FF1E27] ml-0.5 drop-shadow">SINEMA</span>
              <span className="w-2 h-2 rounded-full bg-[#D4FF00] ml-1 mb-1 animate-ping" />
            </div>
            <span className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase -mt-1 hidden sm:block">
              Bold Cinema Stream · 60 FPS
            </span>
          </div>
        </div>

        {/* Right: UNIFIED CONTROL DOCK (No More Floating Elements!) */}
        <div className="flex items-center bg-[#121217]/90 border border-white/10 rounded-xl p-1 shadow-xl backdrop-blur-md">
          
          {/* 1. Search Box / Trigger */}
          {isSearchOpen ? (
            <form onSubmit={handleSearchSubmit} className="relative flex items-center animate-in fade-in">
              <input 
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari judul, drakor, genre..."
                autoFocus
                className="w-48 sm:w-64 px-3 py-1.5 pl-8 rounded-lg bg-[#1a1a24] border border-[#D4FF00] text-white text-xs placeholder-zinc-400 focus:outline-none shadow-inner"
              />
              <Search className="w-3.5 h-3.5 text-[#D4FF00] absolute left-2.5 pointer-events-none" />
              <button 
                type="button" 
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-2.5 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all"
              title="Cari Film"
            >
              <Search className="w-3.5 h-3.5 text-[#D4FF00]" />
              <span className="hidden md:inline font-mono text-[11px]">SEARCH</span>
            </button>
          )}

          {/* Hairline Separator */}
          <div className="w-px h-5 bg-white/10 mx-1 hidden sm:block" />

          {/* 2. Download APK Action */}
          <a
            href="/ruangsinema.apk"
            download="RuangSinema.apk"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-300 hover:text-[#D4FF00] hover:bg-white/5 transition-all"
            title="Download APK Android"
          >
            <Download className="w-3.5 h-3.5 text-[#D4FF00]" />
            <span className="hidden sm:inline font-mono text-[11px]">APK</span>
          </a>

          {/* Hairline Separator */}
          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* 3. User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsAccountOpen(!isAccountOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-xs font-bold text-white transition-all"
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#FF1E27] to-[#D4FF00] p-0.5">
                <div className="w-full h-full bg-[#08080a] rounded-[4px] flex items-center justify-center text-white text-[11px] font-black">
                  {user?.name ? user.name[0].toUpperCase() : <UserIcon className="w-3 h-3 text-[#D4FF00]" />}
                </div>
              </div>
              <span className="hidden lg:inline max-w-[90px] truncate text-[11px] font-mono">{user?.name || 'VIP'}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {isAccountOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#121217] border border-white/15 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2.5 border-b border-white/10 space-y-0.5">
                  <p className="text-xs font-black text-white truncate">{user?.name || 'Member VIP'}</p>
                  <p className="text-[10px] text-[#D4FF00] font-mono uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00]" />
                    VIP Streamer Active
                  </p>
                </div>
                <button
                  onClick={() => {
                    onChangeTab('profile');
                    setIsAccountOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-zinc-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#D4FF00]" />
                  <span>Akun & Keamanan 2FA</span>
                </button>
                {onLogout && (
                  <button
                    onClick={() => {
                      onLogout();
                      setIsAccountOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 border-t border-white/10"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar Akun</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Sub-Nav: UNDERLINE KINETIC TABS (Goodbye Uniform Pills!) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar flex items-center gap-1 sm:gap-2 border-t border-white/5">
        {navCategories.map((item) => {
          const active = isCategoryActive(item.id);
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleCategoryClick(item.id)}
              className={`group relative flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap shrink-0 ${
                active
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <IconComp className={`w-3.5 h-3.5 transition-colors ${active ? 'text-[#D4FF00]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
              <span className="font-mono text-[11px] sm:text-xs font-bold">{item.label}</span>
              
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black ${
                  active ? 'bg-[#D4FF00] text-black font-black' : 'bg-[#FF1E27] text-white'
                }`}>
                  {item.badge}
                </span>
              )}

              {/* Glowing Active Underline Indicator with Slanted End */}
              {active && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-[#FF1E27] via-[#D4FF00] to-[#D4FF00] shadow-[0_0_12px_#D4FF00]" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
