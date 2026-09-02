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

  const navPills = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'movie', label: 'Movies', icon: Film },
    { id: 'series', label: 'TV Series', icon: Tv },
    { id: 'indo', label: 'Film Indo', icon: Sparkles },
    { id: 'kdrama', label: 'Drakor', icon: Globe },
    { id: 'dracin', label: 'Dracin', icon: Globe },
    { id: 'anime', label: 'Anime', icon: Globe },
    { id: 'library', label: 'Collections', icon: Layers, badge: savedCount },
    { id: 'genres', label: 'Genres', icon: Tag },
  ];

  const handlePillClick = (id: string) => {
    if (onSelectCategory) {
      onSelectCategory(id);
    } else {
      if (id === 'home') onChangeTab('home');
      else if (id === 'library') onChangeTab('library');
      else onChangeTab('search');
    }
  };

  const isPillActive = (id: string) => {
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
        ? 'bg-[#121212]/95 backdrop-blur-md border-b border-white/10 shadow-2xl' 
        : 'bg-gradient-to-b from-black/95 via-black/80 to-[#121212]/90 backdrop-blur-md border-b border-white/10'
    }`}>
      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand Logo */}
        <div 
          onClick={() => handlePillClick('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
        >
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#FF2E38] via-[#E50914] to-[#990008] p-0.5 shadow-lg shadow-[#E50914]/40 group-hover:shadow-[#E50914]/70 group-hover:scale-105 transition-all duration-300">
            <div className="w-full h-full bg-[#121212] rounded-[10px] flex items-center justify-center overflow-hidden">
              <svg viewBox="0 0 512 512" className="w-6 h-6 sm:w-6.5 sm:h-6.5 transform group-hover:rotate-6 transition-transform">
                <path d="M140 130 C140 110, 160 98, 178 108 L386 234 C404 245, 404 267, 386 278 L178 404 C160 414, 140 402, 140 382 Z" fill="#E50914"/>
                <path d="M165 145 L205 145 L185 205 L145 205 Z" fill="#FFFFFF" opacity="0.9"/>
                <path d="M225 145 L265 145 L245 205 L205 205 Z" fill="#FFFFFF" opacity="0.9"/>
                <path d="M285 145 L325 145 L305 205 L265 205 Z" fill="#FFFFFF" opacity="0.9"/>
                <polygon points="230,210 320,256 230,302" fill="#FFFFFF"/>
              </svg>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tighter text-[#E50914] uppercase drop-shadow leading-none">
              RUANG<span className="text-white">SINEMA</span>
            </span>
            <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase leading-none mt-0.5 hidden sm:block">
              CINEMA STREAMING
            </span>
          </div>
        </div>

        {/* Right: Search, Download App, and Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Search Bar */}
          {isSearchOpen ? (
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari film, drakor, artis..."
                autoFocus
                className="w-48 sm:w-72 px-3.5 py-1.5 pl-8 rounded-full bg-[#202020] border border-[#E50914] text-white text-xs placeholder-gray-400 focus:outline-none shadow-lg"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
              <button 
                type="button" 
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-2.5 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white text-xs font-bold transition-all border border-white/10"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cari Sinema</span>
            </button>
          )}

          {/* Download APK Button */}
          <a
            href="/ruangsinema.apk"
            download="RuangSinema.apk"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-black transition-all shadow-md active:scale-95"
            title="Download APK Android"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download App</span>
          </a>

          {/* Profile / Account Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsAccountOpen(!isAccountOpen)}
              className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-white transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-[#E50914] flex items-center justify-center text-white text-[11px] font-bold">
                {user?.name ? user.name[0].toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
              </div>
              <span className="hidden md:inline max-w-[100px] truncate">{user?.name || 'Member VIP'}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {isAccountOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#1c1c1c] border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2 border-b border-white/10">
                  <p className="text-xs font-black text-white truncate">{user?.name || 'Member VIP'}</p>
                  <p className="text-[10px] text-emerald-400 font-bold">👑 VIP Member Aktif</p>
                </div>
                <button
                  onClick={() => {
                    onChangeTab('profile');
                    setIsAccountOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Profil & Pengaturan</span>
                </button>
                {onLogout && (
                  <button
                    onClick={() => {
                      onLogout();
                      setIsAccountOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 border-t border-white/5"
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

      {/* Spacious Full-Width Horizontal Category Pill Bar (Active Highlight on EVERY single item) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto no-scrollbar flex items-center gap-2 border-t border-white/5">
        {navPills.map((pill) => {
          const active = isPillActive(pill.id);
          const IconComp = pill.icon;
          return (
            <button
              key={pill.id}
              onClick={() => handlePillClick(pill.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/40 scale-105 border border-[#E50914]'
                  : 'bg-[#1c1c1c] text-gray-300 hover:text-white hover:bg-[#282828] border border-white/10'
              }`}
            >
              <IconComp className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-gray-400'}`} />
              <span>{pill.label}</span>
              {pill.badge !== undefined && pill.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  active ? 'bg-white text-[#E50914]' : 'bg-[#E50914] text-white'
                }`}>
                  {pill.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
