
import React from 'react';
import { Mail, Sparkles, LogOut, CheckCircle } from 'lucide-react';
import type { User } from '../types';

interface ProfileScreenProps {
  user: User;
  onOpenGenrePreferences: () => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onOpenGenrePreferences,
  onLogout,
}) => {
  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-28 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Akun & Profil Saya
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Kelola profil dan preferensi tontonan Anda di RuangSinema.
        </p>
      </div>

      {/* User Card */}
      <div className="p-6 sm:p-8 rounded-xl bg-[#181818] border border-white/10 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-18 h-18 rounded bg-[#E50914] text-white font-black text-2xl flex items-center justify-center shadow-lg">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">{user.name}</h2>
              <span className="px-2 py-0.5 rounded bg-[#E50914] text-white text-[10px] font-black uppercase">
                {user.role || 'VIP MEMBER'}
              </span>
            </div>
            <p className="text-xs text-gray-400 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{user.email}</span>
            </p>
          </div>
        </div>

        {/* Database MySQL phpMyAdmin status */}
        <div className="p-3.5 rounded bg-[#242424] border border-white/5 flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <span className="text-[#E50914] text-base">💎</span>
            <span>Status Akun: <b>VIP Streaming Akses Penuh</b></span>
          </div>
          <span className="text-green-400 font-bold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Aktif
          </span>
        </div>

        {/* Genre Preferences */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E50914]" />
              <h3 className="text-sm font-bold text-white">Preferensi Genre Favorit</h3>
            </div>
            <button
              onClick={onOpenGenrePreferences}
              className="text-xs font-bold text-[#E50914] hover:underline"
            >
              Ubah Preferensi
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {user.genres && user.genres.length > 0 ? (
              user.genres.map((g, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[#222222] text-white border border-white/10"
                >
                  {g}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500 italic">Belum ada genre yang dipilih.</span>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onLogout}
            className="px-5 py-2.5 rounded bg-white/10 hover:bg-red-600 hover:text-white text-gray-300 text-xs font-bold flex items-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
