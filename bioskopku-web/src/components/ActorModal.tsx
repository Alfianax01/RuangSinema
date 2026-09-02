import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Film, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActorProfile, Movie } from '../types';
import { MovieCard } from './MovieCard';

interface ActorModalProps {
  actor: ActorProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
}

export const ActorModal: React.FC<ActorModalProps> = ({
  actor,
  isOpen,
  onClose,
  onSelectMovie,
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && carouselRef.current) {
      carouselRef.current.scrollLeft = 0;
    }
  }, [isOpen]);

  if (!isOpen || !actor) return null;

  const scrollSide = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return createPortal(
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg sm:max-w-xl bg-[#141414] border border-white/15 rounded-2xl shadow-2xl ring-1 ring-white/10 flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150"
      >
        
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#181818] via-[#1e1e1e] to-[#181818] shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-[#222222] border-2 border-[#E50914] shadow-xl shrink-0">
              <img
                src={actor.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.name)}&background=222222&color=fff&size=200`}
                alt={actor.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                  {actor.name}
                </h2>
                <span className="px-2 py-0.5 rounded bg-[#E50914] text-white font-black text-[9px] tracking-wider uppercase shadow">
                  {actor.knownFor || 'ACTING'}
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-2 text-[11px] text-gray-400 mt-0.5">
                {actor.birthday && <span>Lahir: {actor.birthday}</span>}
                {actor.placeOfBirth && <span>• {actor.placeOfBirth}</span>}
                <span className="text-[#E50914] font-bold">• {actor.filmography.length} Judul</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-[#E50914] text-gray-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-3.5">
          
          {/* Biography Box */}
          {actor.biography && actor.biography.length > 20 && (
            <div className="p-3 rounded-xl bg-[#1c1c1c] border border-white/5 text-[11px] text-gray-300 leading-relaxed line-clamp-2">
              {actor.biography}
            </div>
          )}

          {/* Filmography Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-[#E50914]" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  DAFTAR FILM & DRAMA ({actor.filmography.length} Judul):
                </h3>
              </div>

              {/* Left/Right Scroll Arrows */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scrollSide('left')}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-[#E50914] text-white flex items-center justify-center transition-all shadow-md active:scale-90"
                  title="Scroll Kiri"
                >
                  <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <button
                  onClick={() => scrollSide('right')}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-[#E50914] text-white flex items-center justify-center transition-all shadow-md active:scale-90"
                  title="Scroll Kanan"
                >
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {actor.filmography.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Belum ada judul film atau drama terdaftar untuk aktor ini.
              </div>
            ) : (
              <div 
                ref={carouselRef}
                className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1.5"
                style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
              >
                {actor.filmography.map((movie) => (
                  <div key={movie._id} className="w-28 sm:w-32 shrink-0">
                    <MovieCard
                      movie={movie}
                      layout="portrait"
                      showRating={true}
                      onClick={(m) => {
                        onClose();
                        onSelectMovie(m);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
};
