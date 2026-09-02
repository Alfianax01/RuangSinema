
import React, { useState, useEffect } from 'react';
import { Play, Star } from 'lucide-react';
import type { MovieDetails, Movie } from '../types';

interface HeroBannerProps {
  movies: MovieDetails[];
  onSelectMovie: (movie: Movie | MovieDetails) => void;
  onWatchTrailer?: (movie: MovieDetails) => void;
  onToggleSave?: (movie: MovieDetails) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  movies,
  onSelectMovie,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!movies.length) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [movies.length]);

  if (!movies || movies.length === 0) return null;
  const current = movies[currentIndex] || movies[0];

  const isSeries = current.type === 'series';

  return (
    <div className="relative w-full h-[520px] sm:h-[620px] lg:h-[700px] overflow-hidden bg-[#141414] -mt-16 sm:-mt-18 select-none">
      
      {/* Cinematic Ultra-Wide Backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-100"
        style={{
          backgroundImage: `url('${current.backdropImg || current.posterImg}')`,
        }}
      />

      {/* IDLIX Signature Multi-Layer Dark Vignettes */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/70 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent" />

      {/* Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-end px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 space-y-3 sm:space-y-4 max-w-4xl">
        
        {/* Category Pill: MOVIE / SERIES */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-[#E50914] text-white font-black text-[10px] sm:text-[11px] tracking-wider uppercase shadow-md">
            {isSeries ? 'SERIES' : 'MOVIE'}
          </span>
        </div>

        {/* Italic Tagline */}
        <p className="text-xs sm:text-sm text-gray-300 italic font-serif">
          {(current as any).tagline ? `"${(current as any).tagline}"` : 'Nikmati tayangan favorit Anda dengan subtitle Indonesia terlengkap.'}
        </p>

        {/* Stylized Large Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-xl uppercase">
          {current.title}
        </h1>

        {/* Metadata Line: Star, Year, Duration, Genres */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-semibold text-gray-300">
          <div className="flex items-center gap-1 text-[#F5C518] font-black">
            <Star className="w-3.5 h-3.5 fill-[#F5C518]" />
            <span>{current.rating || '8.2'}</span>
          </div>
          <span>·</span>
          <span className="text-white font-bold">{current.year || '2024'}</span>
          <span>·</span>
          <span>{isSeries ? 'TV Series' : current.duration || '1h 45m'}</span>
          <span>·</span>
          <span className="text-gray-300">
            {current.genres?.slice(0, 3).join(', ') || 'Action, Adventure'}
          </span>
        </div>

        {/* Synopsis */}
        <p className="text-xs sm:text-sm text-gray-300 max-w-2xl line-clamp-2 sm:line-clamp-3 leading-relaxed font-normal drop-shadow">
          {current.synopsis}
        </p>

        {/* Action Button: Watch Now */}
        <div className="pt-2">
          <button
            onClick={() => onSelectMovie(current)}
            className="px-7 py-3 rounded-lg bg-[#E50914] hover:bg-[#F40612] text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-[#E50914]/40 active:scale-95 transition-all"
          >
            <Play className="w-4.5 h-4.5 fill-white stroke-none ml-0.5" />
            <span>Watch Now</span>
          </button>
        </div>

        {/* IDLIX Slider Indicator (Pill Bar + Dots) */}
        {movies.length > 1 && (
          <div className="flex items-center gap-1.5 pt-4">
            {movies.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  idx === currentIndex 
                    ? 'w-7 bg-[#E50914]' 
                    : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
