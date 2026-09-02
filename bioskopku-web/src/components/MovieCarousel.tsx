
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Movie, MovieDetails } from '../types';
import { MovieCard } from './MovieCard';

interface MovieCarouselProps {
  title: string;
  icon?: any;
  movies: (Movie | MovieDetails)[];
  onSelectMovie: (movie: Movie | MovieDetails) => void;
  onSeeAll?: () => void;
}

export const MovieCarousel: React.FC<MovieCarouselProps> = ({
  title,
  movies,
  onSelectMovie,
  onSeeAll,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -520 : 520;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="space-y-2.5 px-4 sm:px-6 lg:px-8">
      {/* Row Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#E50914] rounded-full" />
          <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="text-xs font-bold text-[#E50914] hover:underline"
            >
              Jelajahi Semua &gt;
            </button>
          )}

          {/* Navigation Arrows */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => handleScroll('left')}
              className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3.5 overflow-x-auto no-scrollbar scroll-smooth pb-3 pt-1"
      >
        {movies.map((movie) => (
          <MovieCard
            key={movie._id}
            movie={movie}
            onClick={onSelectMovie}
            layout="portrait"
            showRating={true}
          />
        ))}
      </div>
    </section>
  );
};
