
import React, { useState } from 'react';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import type { User } from '../types';
import { saveUserPreferences } from '../services/auth';

interface GenrePreferenceModalProps {
  isOpen: boolean;
  user: User | null;
  onCompleted: (selectedGenres: string[]) => void;
}

const AVAILABLE_GENRES = [
  'Drama Korea', 'Drama China', 'Dorama Jepang', 'Anime', 'Action', 'Sci-Fi', 'Romance', 'Horror', 'Comedy', 'Thriller', 'Animation', 'Adventure'
];

export const GenrePreferenceModal: React.FC<GenrePreferenceModalProps> = ({
  isOpen,
  user,
  onCompleted,
}) => {
  const [selected, setSelected] = useState<string[]>(user?.genres || ['Drama Korea', 'Anime']);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const toggleGenre = (genre: string) => {
    if (selected.includes(genre)) {
      setSelected(selected.filter(g => g !== genre));
    } else {
      setSelected([...selected, genre]);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await saveUserPreferences(user.email, selected);
      onCompleted(selected);
    } catch (e) {
      onCompleted(selected);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#181818] border border-white/10 rounded-xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded bg-[#E50914] text-white flex items-center justify-center mx-auto mb-1">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Pilih Genre Favorit Anda
          </h2>
          <p className="text-xs text-gray-400">
            Pilih tontonan kesukaanmu agar beranda RuangSinema dipersonalisasi khusus untukmu.
          </p>
        </div>

        {/* Genre Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AVAILABLE_GENRES.map((genre) => {
            const isSelected = selected.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={`p-3 rounded text-xs font-bold transition-all flex items-center justify-between border ${
                  isSelected
                    ? 'bg-[#E50914] text-white border-[#E50914] shadow-md'
                    : 'bg-[#222222] text-gray-300 border-white/5 hover:border-white/20'
                }`}
              >
                <span>{genre}</span>
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={loading || selected.length === 0}
          className="w-full py-3 rounded bg-[#E50914] hover:bg-[#F40612] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all"
        >
          <span>Simpan & Masuk ke RuangSinema</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
