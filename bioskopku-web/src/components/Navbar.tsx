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
    { id: 'home', label: 'BERANDA', icon: Home },
    { id: 'movie', label: 'FILM', icon: Film },
    { id: 'series', label: 'SERIES', icon: Tv },
    { id: 'indo', label: 'FILM INDO', icon: Sparkles },
    { id: 'kdrama', label: 'DRAKOR', icon: Globe },
    { id: 'dracin', label: 'DRACIN', icon: Globe },
    { id: 'anime', label: 'ANIME', icon: Globe },
    { id: 'library', label: 'DAFTAR SAYA', icon: Layers, badge: savedCount },
    { id: 'genres', label: 'KATEGORI', icon: Tag },
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
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 font-sans ${
      isScrolled 
        ? 'bg-[#0A0A0C]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl shadow-black/80' 
        : 'bg-gradient-to-b from-[#0A0A0C] via-[#0A0A0C]/90 to-transparent backdrop-blur-md border-b border-white/[0.04]'
    }`}>
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
        
        {/* Brand Identity: Clean, Action Poster Aesthetic */}
        <div 
          onClick={() => handleCategoryClick('home')}
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[3px] bg-[#FF2E2E] flex items-center justify-center font-display font-black text-xl sm:text-2xl text-white tracking-wider shadow-lg shadow-[#FF2E2E]/25 transition-transform group-hover:scale-105 duration-200">
            R
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-2xl sm:text-3xl tracking-[0.06em] text-white">
              RUANG<span className="text-[#FF2E2E]">SINEMA</span>
            </span>
            <span className="text-[9px] font-mono tracking-[0.25em] text-zinc-400 uppercase font-semibold">
              PREMIUM STREAMING
            </span>
          </div>
        </div>

        {/* Center: Desktop Navigation Bar with Clean 2px Active Underline */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navCategories.map((cat) => {
            const active = isCategoryActive(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`relative px-3 py-2 text-xs font-bold tracking-[0.04em] transition-colors flex items-center gap-1.5 ${
                  active ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>{cat.label}</span>
                {Boolean(cat.badge) && cat.badge! > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[#FF2E2E] text-white font-mono font-bold">
                    {cat.badge}
                  </span>
                )}
                {/* 2px Solid Accent Line Indicator (No bulky block) */}
                {active && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#FF2E2E] rounded-full shadow-sm shadow-[#FF2E2E]/60" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: User Actions Dock (Visually Grouped with Clean Dividers) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-[4px] p-1 shadow-inner">
            
            {/* Search Input / Button */}
            {isSearchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 px-2 py-0.5">
                <input
                  type="text"
                  placeholder="Cari film, serial..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoFocus
                  className="bg-transparent text-xs text-white focus:outline-none w-36 sm:w-48 placeholder-zinc-500 font-medium"
                />
                <button 
                  type="button" 
                  onClick={() => setIsSearchOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                title="Cari Film"
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-[3px] transition-all"
              >
                <Search className="w-4 h-4 text-zinc-400" />
                <span className="hidden md:inline text-zinc-400">Cari...</span>
              </button>
            )}

            {/* Subtle Vertical Hairline Divider */}
            <div className="h-4 w-[1px] bg-white/[0.12] mx-1" />

            {/* Download App Shortcut */}
            <a
              href="/app-release.apk"
              download
              title="Download Aplikasi Android"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-[3px] transition-all"
            >
              <Download className="w-4 h-4 text-[#FF2E2E]" />
              <span className="hidden xl:inline text-zinc-300">App</span>
            </a>

            {/* Subtle Vertical Hairline Divider */}
            <div className="h-4 w-[1px] bg-white/[0.12] mx-1" />

            {/* Profile Avatar & Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  if (user) {
                    setIsAccountOpen(!isAccountOpen);
                  } else {
                    onChangeTab('profile');
                  }
                }}
                className="flex items-center gap-2 px-2 py-1 hover:bg-white/[0.06] rounded-[3px] transition-all"
              >
                <div className="w-7 h-7 rounded-[3px] bg-[#1C1D22] border border-white/10 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                  {user ? (
                    <span className="text-[#FF2E2E] font-bold">{user.name.charAt(0).toUpperCase()}</span>
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </div>
                {user ? (
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                ) : (
                  <span className="text-xs font-bold text-white hidden sm:inline">Masuk</span>
                )}
              </button>

              {/* Account Dropdown */}
              {isAccountOpen && user && (
                <div className="absolute right-0 mt-2 w-52 bg-[#121318] border border-white/15 rounded-[4px] shadow-2xl p-2 z-50">
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[9px] font-mono uppercase px-1.5 py-0.2 bg-[#FF2E2E]/15 text-[#FF2E2E] border border-[#FF2E2E]/30 rounded-[2px] font-bold">
                      {user.role || 'VIP Member'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setIsAccountOpen(false);
                      onChangeTab('profile');
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 rounded-[2px] transition-colors"
                  >
                    Pengaturan Profil
                  </button>
                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsAccountOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-[#FF2E2E] hover:bg-[#FF2E2E]/10 rounded-[2px] transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Keluar
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Mobile Horizontal Category Rail */}
      <div className="lg:hidden w-full overflow-x-auto border-t border-white/[0.04] scrollbar-none px-4 py-2 bg-[#0A0A0C]/95">
        <div className="flex items-center gap-4 whitespace-nowrap min-w-max">
          {navCategories.map((cat) => {
            const active = isCategoryActive(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`text-xs font-bold tracking-[0.04em] pb-1 relative transition-colors ${
                  active ? 'text-white' : 'text-zinc-400'
                }`}
              >
                <span>{cat.label}</span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF2E2E] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
