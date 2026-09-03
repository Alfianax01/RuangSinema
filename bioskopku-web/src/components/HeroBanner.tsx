import React, { useState, useEffect } from 'react';
import { Play, Star, Info } from 'lucide-react';
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
    }, 8000);
    return () => clearInterval(timer);
  }, [movies.length]);

  if (!movies || movies.length === 0) return null;
  const current = movies[currentIndex] || movies[0];
  const isSeries = current.type === 'series';

  return (
    <div className="relative w-full h-[580px] sm:h-[680px] lg:h-[760px] overflow-hidden bg-[#08080a] select-none -mt-16 sm:-mt-18">
      
      {/* Background Poster with Subtle Zoom Motion */}
      <div
        key={current._id}
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-105 animate-in fade-in"
        style={{
          backgroundImage: `url('${current.backdropImg || current.posterImg}')`,
        }}
      />

      {/* Asymmetrical High-Impact Angular Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#08080a] via-[#08080a]/80 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#08080a]/90 via-[#08080a]/40 to-transparent" />

      {/* Diagonal Cyber Grid & Film Strip Accent Lines */}
      <div className="absolute right-0 top-1/4 w-96 h-96 bg-[#FF1E27]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 bottom-10 w-72 h-72 bg-[#D4FF00]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-end px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20 space-y-4">
        
        {/* Top Kicker: Electric Cyber Lime Angled Badge */}
        <div className="flex items-center gap-2.5">
          <div className="skew-tag bg-[#D4FF00] px-3 py-1 shadow-md shadow-[#D4FF00]/30">
            <span className="skew-tag-content font-mono font-black text-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
              EXCLUSIVE PREMIERE
            </span>
          </div>

          <div className="skew-tag bg-white/10 px-2.5 py-1 border border-white/15">
            <span className="skew-tag-content font-mono font-bold text-white text-[10px] sm:text-xs uppercase tracking-wider">
              {isSeries ? 'TV SERIES' : 'MOVIE'}
            </span>
          </div>

          <div className="skew-tag bg-[#FF1E27]/20 border border-[#FF1E27]/40 px-2.5 py-1">
            <span className="skew-tag-content font-mono font-bold text-[#FF1E27] text-[10px] sm:text-xs tracking-wider">
              60 FPS HD
            </span>
          </div>
        </div>

        {/* Massive Condensed Headline Font (Extreme Contrast) */}
        <div className="space-y-1">
          <h1 className="font-display text-5xl sm:text-7xl lg:text-9xl uppercase tracking-wider leading-[0.88] text-white drop-shadow-2xl">
            {current.title}
          </h1>

          {/* Metadata Ribbon: Rating, Year, Duration, Audio */}
          <div className="flex items-center flex-wrap gap-2.5 text-xs font-mono pt-1 text-zinc-300">
            <div className="flex items-center gap-1 bg-[#D4FF00]/15 border border-[#D4FF00]/40 px-2 py-0.5 rounded text-[#D4FF00] font-black">
              <Star className="w-3.5 h-3.5 fill-[#D4FF00]" />
              <span>{current.rating || '8.8'}</span>
            </div>
            <span className="text-zinc-600 font-bold">/</span>
            <span className="text-white font-bold">{current.year || '2025'}</span>
            <span className="text-zinc-600 font-bold">/</span>
            <span className="text-zinc-300">{isSeries ? 'Multi-Episode' : current.duration || '2j 10m'}</span>
            <span className="text-zinc-600 font-bold">/</span>
            <span className="text-zinc-300">{current.genres?.slice(0, 3).join(' · ') || 'Action · Drama'}</span>
          </div>
        </div>

        {/* Synopsis */}
        <p className="text-xs sm:text-sm text-zinc-300 max-w-xl line-clamp-2 sm:line-clamp-3 leading-relaxed font-medium drop-shadow-md">
          {current.synopsis}
        </p>

        {/* Energetic CTAs: Pulse Glow & Micro-Interactions */}
        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={() => onSelectMovie(current)}
            className="group relative px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF1E27] via-[#FF2E38] to-[#D4FF00] text-black font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-3 shadow-2xl shadow-[#FF1E27]/40 animate-pulse-glow active:scale-95 transition-all"
          >
            <div className="w-6 h-6 rounded-full bg-black/90 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <Play className="w-3.5 h-3.5 fill-white stroke-none ml-0.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <span className="font-extrabold text-white group-hover:tracking-widest transition-all">
              Watch Now
            </span>
          </button>

          <button
            onClick={() => onSelectMovie(current)}
            className="px-6 py-3.5 rounded-xl bg-[#121217]/90 hover:bg-[#1a1a22] text-zinc-200 hover:text-white border border-white/10 hover:border-white/30 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
          >
            <Info className="w-4 h-4 text-zinc-400" />
            <span>Detail Sinema</span>
          </button>
        </div>

        {/* Slide Indicators: Angled Slash Bars (Goodbye Round Dots!) */}
        <div className="flex items-center gap-2 pt-2">
          {movies.slice(0, 6).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 transition-all duration-300 skew-tag ${
                currentIndex === idx
                  ? 'w-10 bg-[#D4FF00] shadow-[0_0_8px_#D4FF00]'
                  : 'w-4 bg-white/20 hover:bg-white/40'
              }`}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>

      </div>
    </div>
  );
};
