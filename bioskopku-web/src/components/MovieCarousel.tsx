import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import type { Movie, MovieDetails } from '../types';
import { MovieCard } from './MovieCard';

interface MovieCarouselProps {
  title: string;
  subtitle?: string;
  icon?: any;
  movies: (Movie | MovieDetails)[];
  onSelectMovie: (movie: Movie | MovieDetails) => void;
  onSeeAll?: () => void;
  isRanked?: boolean;
}

export const MovieCarousel: React.FC<MovieCarouselProps> = ({
  title,
  subtitle,
  movies,
  onSelectMovie,
  onSeeAll,
  isRanked = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -580 : 580;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="space-y-3 px-4 sm:px-6 lg:px-8">
      {/* Row Header (Bold & Energic Heading) */}
      <div className="flex items-end justify-between border-b border-white/5 pb-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl text-[#D4FF00] font-black -skew-x-6">//</span>
            <h2 className="font-display text-2xl sm:text-3xl tracking-wider uppercase text-white leading-none">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-[11px] font-mono text-zinc-400 pl-5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="flex items-center gap-1 text-xs font-mono font-bold text-[#D4FF00] hover:text-white transition-colors"
            >
              <span>EXPLORE ALL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Navigation Arrows (Squared Sharp Cut) */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={() => handleScroll('left')}
              className="w-8 h-8 rounded-lg bg-[#121217] hover:bg-[#1a1a24] text-zinc-300 hover:text-white flex items-center justify-center border border-white/10 hover:border-[#D4FF00]/40 transition-all active:scale-95"
              title="Geser Kiri"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="w-8 h-8 rounded-lg bg-[#121217] hover:bg-[#1a1a24] text-zinc-300 hover:text-white flex items-center justify-center border border-white/10 hover:border-[#D4FF00]/40 transition-all active:scale-95"
              title="Geser Kanan"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel with Optional Giant Typographic Rank Numbers */}
      <div
        ref={scrollRef}
        className="flex items-center gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth pb-4 pt-1 snap-x snap-mandatory"
      >
        {movies.map((movie, index) => {
          const rankNum = (index + 1).toString().padStart(2, '0');

          return (
            <div 
              key={movie._id} 
              className={`flex items-end shrink-0 snap-start group ${isRanked ? 'relative' : ''}`}
            >
              {isRanked && (
                <div className="select-none pointer-events-none -mr-4 sm:-mr-6 z-0 pb-6">
                  <span className="font-display text-7xl sm:text-9xl font-black text-[#15151c] group-hover:text-[#D4FF00]/20 transition-colors drop-shadow-md leading-none">
                    {rankNum}
                  </span>
                </div>
              )}

              <div className="relative z-10">
                <MovieCard
                  movie={movie}
                  onClick={onSelectMovie}
                  layout={isRanked && index === 0 ? 'featured' : 'portrait'}
                  showRating={true}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
