
import React, { memo } from 'react';
import { Star, Play } from 'lucide-react';
import type { Movie, MovieDetails } from '../types';

interface MovieCardProps {
  movie: Movie | MovieDetails;
  onClick: (movie: Movie | MovieDetails) => void;
  layout?: 'portrait' | 'compact' | 'grid';
  showRating?: boolean;
}

const MovieCardComponent: React.FC<MovieCardProps> = ({ 
  movie, 
  onClick, 
  layout = 'portrait',
  showRating = true 
}) => {
  const isGrid = layout === 'grid';
  const widthClass = isGrid ? 'w-full' : 'w-36 sm:w-44 lg:w-48 shrink-0';
  const heightClass = isGrid ? 'aspect-[2/3]' : 'h-52 sm:h-64 lg:h-72';

  const isSeries = movie.type === 'series';
  const isComingSoon = (movie as MovieDetails).isComingSoon;

  // Extract clean genres
  const genreList = (movie.genres && movie.genres.length > 0) 
    ? movie.genres.filter(g => g !== 'Film' && g !== 'Cinema').slice(0, 2)
    : ['Action', 'Drama'];

  return (
    <div 
      onClick={() => onClick(movie)}
      className={`${widthClass} movie-card-container group cursor-pointer select-none flex flex-col transition-transform duration-200 hover:scale-[1.03] hover:z-20`}
    >
      {/* Poster Box */}
      <div className={`relative ${heightClass} rounded-lg overflow-hidden bg-[#181818] shadow-md group-hover:shadow-2xl border border-white/[0.08] group-hover:border-[#E50914]/80 transition-all`}>
        <img 
          src={movie.posterImg || 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'} 
          alt={movie.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/500x750/181818/E50914?text=${encodeURIComponent(movie.title.substring(0, 20))}`;
          }}
        />

        {/* Netflix Subtle Dark Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20 opacity-70 group-hover:opacity-90 transition-opacity pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          {isComingSoon ? (
            <span className="px-1.5 py-0.5 rounded bg-[#E50914] text-white font-black text-[9px] uppercase tracking-wider shadow">
              SEGERA
            </span>
          ) : isSeries ? (
            <span className="px-1.5 py-0.5 rounded bg-[#E50914] text-white font-black text-[9px] uppercase tracking-wider shadow">
              SERIES
            </span>
          ) : (
            <span className="px-1 py-0.5 rounded bg-black/70 backdrop-blur-md text-gray-200 font-bold text-[9px]">
              {movie.qualityResolution || 'HD'}
            </span>
          )}

          {movie.year && (
            <span className="text-[10px] font-bold text-gray-200 drop-shadow">
              {movie.year}
            </span>
          )}
        </div>

        {/* Hover Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-4.5 h-4.5 fill-black stroke-none ml-0.5" />
          </div>
        </div>

        {/* Bottom Rating */}
        {showRating && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white border border-white/10 pointer-events-none">
            <Star className="w-3 h-3 text-[#F5C518] fill-[#F5C518]" />
            <span>{movie.rating || '8.0'}</span>
          </div>
        )}
      </div>

      {/* Title & Visible Genre Badges */}
      <div className="mt-2 px-0.5 space-y-1">
        <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#E50914] transition-colors truncate">
          {movie.title}
        </h3>
        
        {/* Genre Tags */}
        <div className="flex items-center gap-1 flex-wrap overflow-hidden">
          {genreList.map((g, idx) => (
            <span 
              key={idx} 
              className="px-1.5 py-0.2 rounded bg-white/[0.08] text-[10px] font-medium text-gray-300 truncate max-w-[80px]"
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const MovieCard = memo(MovieCardComponent);
