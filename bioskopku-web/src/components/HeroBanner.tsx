import React, { useState, useEffect } from 'react';
import { Play, Star, Info, ChevronRight, ChevronLeft } from 'lucide-react';
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

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % movies.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
  };

  return (
    <div className="relative w-full bg-[#0A0A0C] border-b border-white/[0.06] overflow-hidden select-none -mt-16 sm:-mt-18 pt-16 sm:pt-18">
      
      {/* Ambient Red Glow for Depth */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF2E2E]/[0.07] rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Main Container: Split Asymmetric Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[480px] sm:min-h-[540px]">
          
          {/* LEFT COLUMN: Narrative & Action (Width 5 cols on lg, stacks on mobile) */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center space-y-4 sm:space-y-5 order-2 lg:order-1">
            
            {/* Hierarchical Badge System: Only ONE Solid Badge */}
            <div className="flex items-center flex-wrap gap-2">
              {/* The ONLY Solid Badge: Maximum Importance */}
              <span className="bg-[#FF2E2E] text-white text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.15em] uppercase px-2.5 py-1 rounded-[3px] shadow-md shadow-[#FF2E2E]/25">
                EKSKLUSIF
              </span>

              {/* Secondary Outline Badges: 1px border, transparent bg, same 3px radius */}
              <span className="border border-white/20 bg-white/[0.04] text-zinc-200 text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider uppercase px-2.5 py-1 rounded-[3px]">
                {isSeries ? 'SERIAL TV' : 'FILM'}
              </span>

              <span className="border border-white/20 bg-white/[0.04] text-zinc-200 text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider uppercase px-2 py-1 rounded-[3px]">
                ULTRA HD
              </span>

              <span className="border border-white/20 bg-white/[0.04] text-zinc-200 text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider uppercase px-2 py-1 rounded-[3px]">
                SUB INDO
              </span>
            </div>

            {/* Title: Display Font with Calibrated Letter-Spacing for Multi-Word Readability */}
            <div className="space-y-2">
              <h1 className="font-display text-4xl sm:text-6xl lg:text-6xl xl:text-7xl uppercase text-white tracking-[0.04em] leading-[0.95] drop-shadow-xl">
                {current.title}
              </h1>

              {/* Clean Metadata Line */}
              <div className="flex items-center flex-wrap gap-2.5 text-xs font-mono text-zinc-400 pt-0.5">
                {/* Rating with same accent color outline */}
                <div className="flex items-center gap-1 text-[#FF2E2E] font-bold border border-[#FF2E2E]/30 bg-[#FF2E2E]/10 px-2 py-0.5 rounded-[3px]">
                  <Star className="w-3.5 h-3.5 fill-[#FF2E2E]" />
                  <span>{current.rating || '8.7'}</span>
                </div>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-200 font-semibold">{current.year || '2025'}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-300">{isSeries ? 'Multi-Episode' : (current.duration || '2j 15m')}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-300 truncate max-w-[200px]">
                  {current.genres?.slice(0, 2).join(', ') || 'Action'}
                </span>
              </div>
            </div>

            {/* Concise Synopsis with Controlled Line Clamping */}
            <p className="text-xs sm:text-sm text-zinc-300/90 leading-relaxed font-normal line-clamp-3 max-w-xl">
              {current.synopsis || 'Tonton tayangan perdana berkualitas tinggi dengan subtitle bahasa Indonesia resmi hanya di RuangSinema.'}
            </p>

            {/* Action Buttons: Unified Single Accent Palette */}
            <div className="flex items-center gap-3 pt-2">
              {/* Primary CTA Button: Solid Accent with Refined Hover */}
              <button
                onClick={() => onSelectMovie(current)}
                className="bg-[#FF2E2E] hover:bg-[#E52525] active:scale-[0.98] text-white font-bold text-xs sm:text-sm uppercase tracking-[0.06em] px-6 py-3 rounded-[3px] shadow-lg shadow-[#FF2E2E]/25 flex items-center gap-2.5 transition-all duration-200"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Nonton Sekarang</span>
              </button>

              {/* Secondary CTA: Outline Button */}
              <button
                onClick={() => onSelectMovie(current)}
                className="border border-white/20 hover:border-white/40 hover:bg-white/[0.06] active:scale-[0.98] text-zinc-200 hover:text-white font-semibold text-xs sm:text-sm tracking-wide px-5 py-3 rounded-[3px] flex items-center gap-2 transition-all duration-200"
              >
                <Info className="w-4 h-4 text-zinc-400" />
                <span>Info Detail</span>
              </button>
            </div>

            {/* Pagination and Slider Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] max-w-md">
              <div className="flex items-center gap-1.5">
                {movies.slice(0, 5).map((m, idx) => (
                  <button
                    key={m._id || idx}
                    onClick={() => setCurrentIndex(idx)}
                    title={`Slide ${idx + 1}`}
                    className={`h-1 transition-all duration-300 rounded-[1px] ${
                      idx === currentIndex 
                        ? 'w-7 bg-[#FF2E2E]' 
                        : 'w-2 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrev}
                  title="Sebelumnya"
                  className="w-7 h-7 rounded-[3px] border border-white/10 hover:border-white/30 bg-white/[0.03] hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  title="Selanjutnya"
                  className="w-7 h-7 rounded-[3px] border border-white/10 hover:border-white/30 bg-white/[0.03] hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Asymmetric Dynamic Poster / Still Art (Width 7 cols on lg) */}
          <div className="lg:col-span-6 xl:col-span-7 relative order-1 lg:order-2">
            <div 
              onClick={() => onSelectMovie(current)}
              className="group relative w-full h-[280px] sm:h-[400px] lg:h-[480px] rounded-[4px] overflow-hidden border border-white/10 cursor-pointer shadow-2xl bg-[#121318]"
            >
              {/* High-Resolution Key Art with Smooth Fade Transition */}
              <div
                key={current._id}
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                style={{
                  backgroundImage: `url('${current.backdropImg || current.posterImg}')`,
                }}
              />

              {/* Diagonal and Radial Dark Vignette for Cinematic Frame */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-transparent to-transparent opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0C]/80 via-transparent to-[#0A0A0C]/40 hidden lg:block" />

              {/* Action Vignette Accent Line */}
              <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-md border border-white/10 rounded-[3px] text-[10px] font-mono text-zinc-300 font-bold uppercase tracking-wider">
                Trending #{currentIndex + 1}
              </div>

              {/* Hover Overlay Play Icon */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-14 h-14 rounded-[3px] bg-[#FF2E2E] flex items-center justify-center shadow-xl shadow-[#FF2E2E]/40 transform group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
