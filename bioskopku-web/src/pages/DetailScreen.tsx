import { ActorModal } from '../components/ActorModal';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Star, ArrowLeft, Video, Sparkles, 
  ChevronLeft, ChevronRight, ArrowUpDown, Plus, Check, Download,
  Zap, RefreshCw, Maximize2, Minimize2, ExternalLink, X
} from 'lucide-react';
import type { MovieDetails, Movie, EpisodeItem, StreamSource, ActorProfile } from '../types';
import { fetchSeasonEpisodes, fetchSimilarMovies, fetchMovieDetails, fetchStreamSources, fetchActorDetailsAndCredits, fetchMovieTrailer } from '../services/api';
import { MovieCard } from '../components/MovieCard';
import { DownloadModal } from '../components/DownloadModal';

interface DetailScreenProps {
  movie: MovieDetails;
  isSaved?: boolean;
  relatedMovies?: (Movie | MovieDetails)[];
  onBack: () => void;
  onToggleSave?: (movie: MovieDetails) => void;
  onWatchNow: (movie: MovieDetails, season?: number, episode?: number, episodeItem?: EpisodeItem) => void;
  onWatchTrailer: (movie: MovieDetails) => void;
  onSelectMovie?: (movie: Movie) => void;
  onSelectSimilarMovie?: (movie: Movie) => void;
  onOpenAddToPlaylist?: (movie: MovieDetails) => void;
}

function formatAirDate(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
}

export const DetailScreen: React.FC<DetailScreenProps> = ({
  movie: initialMovie,
  isSaved = false,
  onBack,
  onToggleSave,
  onWatchTrailer: _onWatchTrailer,
  onSelectMovie,
  onSelectSimilarMovie,
  onOpenAddToPlaylist,
}) => {
  const [currentMovie, setCurrentMovie] = useState<MovieDetails>(initialMovie);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedActorProfile, setSelectedActorProfile] = useState<ActorProfile | null>(null);

  // In-Page Cinema Video Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingMode, setPlayingMode] = useState<'stream' | 'trailer'>('stream');
  const [playingSeason, setPlayingSeason] = useState(1);
  const [playingEpisode, setPlayingEpisode] = useState(1);
  const [playingEpisodeItem, setPlayingEpisodeItem] = useState<EpisodeItem | null>(null);
  const [streamSources, setStreamSources] = useState<StreamSource[]>([]);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [loadingStream, setLoadingStream] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isTheater, setIsTheater] = useState(false);

  const isSeries = currentMovie.type === 'series' || Boolean(currentMovie.seasons && currentMovie.seasons.length > 0);
  
  const [selectedSeason, setSelectedSeason] = useState<number>(
    currentMovie.seasons && currentMovie.seasons.length > 0 ? currentMovie.seasons[0].seasonNumber : 1
  );
  const [episodes, setEpisodes] = useState<EpisodeItem[]>(currentMovie.episodes || []);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(true);

  const playerRef = useRef<HTMLDivElement>(null);
  const seasonScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentMovie(initialMovie);
    setIsPlaying(false);

    // Fetch full details
    fetchMovieDetails(initialMovie._id).then((full) => {
      if (full) {
        setCurrentMovie(full);
        if (full.seasons && full.seasons.length > 0) {
          setSelectedSeason(full.seasons[0].seasonNumber);
        }
      }
    });

    // Fetch similar
    setLoadingSimilar(true);
    fetchSimilarMovies(initialMovie._id, isSeries, initialMovie.genres).then((sim) => {
      setSimilarMovies(sim);
      setLoadingSimilar(false);
    });
  }, [initialMovie._id, isSeries]);

  useEffect(() => {
    if (isSeries) {
      setLoadingEpisodes(true);
      fetchSeasonEpisodes(currentMovie._id, selectedSeason).then((eps) => {
        setEpisodes(eps);
        setLoadingEpisodes(false);
      });
    }
  }, [selectedSeason, currentMovie._id, isSeries]);

  // Load Stream Sources when playing changes
  useEffect(() => {
    if (!isPlaying) return;

    if (playingMode === 'trailer') {
      setLoadingStream(true);
      fetchMovieTrailer(currentMovie._id, isSeries, currentMovie.title).then((trUrl) => {
        setStreamSources([
          {
            provider: 'Official Trailer HD',
            url: trUrl,
            resolutions: ['1080p Full HD'],
          }
        ]);
        setActiveSourceIndex(0);
        setLoadingStream(false);
      });
    } else {
      setLoadingStream(true);
      fetchStreamSources(currentMovie, isSeries, playingSeason, playingEpisode).then((srcs) => {
        setStreamSources(srcs);
        setActiveSourceIndex(0);
        setLoadingStream(false);
      });
    }
  }, [isPlaying, playingMode, playingSeason, playingEpisode, currentMovie, isSeries]);

  const handleStartPlay = (s = 1, e = 1, epItem?: EpisodeItem) => {
    setPlayingMode('stream');
    setPlayingSeason(s);
    setPlayingEpisode(e);
    if (epItem) setPlayingEpisodeItem(epItem);
    setIsPlaying(true);
    setIframeKey((k) => k + 1);

    setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleStartTrailer = () => {
    setPlayingMode('trailer');
    setIsPlaying(true);
    setIframeKey((k) => k + 1);

    setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

    const handleActorClick = async (personId?: number) => {
    if (!personId) return;
    const profile = await fetchActorDetailsAndCredits(personId);
    if (profile) {
      setSelectedActorProfile(profile);
      const castSection = document.getElementById('cast-section');
      if (castSection) {
        castSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const scrollSeasons = (direction: 'left' | 'right') => {
    if (seasonScrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      seasonScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const sortedEpisodes = [...episodes].sort((a, b) => {
    return sortOrder === 'asc' 
      ? a.episodeNumber - b.episodeNumber 
      : b.episodeNumber - a.episodeNumber;
  });

  const handleMovieClick = (m: Movie) => {
    if (onSelectMovie) onSelectMovie(m);
    else if (onSelectSimilarMovie) onSelectSimilarMovie(m);
  };

  const currentSource = streamSources[activeSourceIndex] || streamSources[0];

  return (
    <div className="min-h-screen bg-[#111111] text-white pb-24">

      {/* 🎬 IN-PAGE CINEMA VIDEO PLAYER (IDLIX EXACT EMBEDDED PLAYER) */}
      {isPlaying && (
        <div ref={playerRef} className="w-full bg-black border-b border-white/10 pt-4 pb-6 px-3 sm:px-6 lg:px-8 animate-in fade-in duration-300">
          <div className={`mx-auto ${isTheater ? 'max-w-[98vw]' : 'max-w-6xl'} space-y-3`}>
            
            {/* Player Container */}
            <div className="relative w-full aspect-video bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(229,9,20,0.2)] border border-white/15 ring-1 ring-white/10 flex items-center justify-center">
              {loadingStream ? (
                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <div className="w-12 h-12 rounded-full border-3 border-[#E50914] border-t-transparent animate-spin" />
                  <span className="text-sm font-bold text-gray-200">Menghubungkan ke Server Sub Indo...</span>
                </div>
              ) : currentSource?.url ? (
                <iframe
                  key={iframeKey}
                  src={currentSource.url}
                  title={currentMovie.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <p className="text-xs text-gray-300">Server sedang sibuk. Silakan pilih server lain di bawah.</p>
                </div>
              )}
            </div>

            {/* Controller & Clean Auto-Connect Server Switcher */}
            <div className="bg-[#181818] border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
              
              {/* Left: Active Status & Series Episode Controls */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    SERVER AKTIF (SUB INDO)
                  </span>
                  {isSeries && (
                    <span className="px-2 py-1 rounded bg-[#E50914] text-white font-black text-[11px] uppercase">
                      S{playingSeason} E{playingEpisode}{playingEpisodeItem?.title ? ` • ${playingEpisodeItem.title}` : ''}
                    </span>
                  )}
                </div>

                {isSeries && playingMode === 'stream' && (
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <button
                      onClick={() => {
                        if (playingEpisode > 1) handleStartPlay(playingSeason, playingEpisode - 1);
                      }}
                      disabled={playingEpisode <= 1}
                      className="px-2.5 py-1 rounded bg-[#252525] hover:bg-[#333333] disabled:opacity-30 text-xs font-bold text-white flex items-center gap-0.5 border border-white/10"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>

                    <button
                      onClick={() => {
                        handleStartPlay(playingSeason, playingEpisode + 1);
                      }}
                      className="px-2.5 py-1 rounded bg-[#252525] hover:bg-[#333333] text-xs font-bold text-white flex items-center gap-0.5 border border-white/10"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Center/Right: Clean Compact Server Switcher (Top 3 VIP Pills + Dropdown) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto justify-start sm:justify-end">
                {streamSources.slice(0, 3).map((src, idx) => {
                  const isSel = idx === activeSourceIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveSourceIndex(idx);
                        setIframeKey(k => k + 1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/40'
                          : 'bg-[#252525] text-gray-300 hover:bg-[#303030] hover:text-white border border-white/10'
                      }`}
                    >
                      <Zap className={`w-3 h-3 ${isSel ? 'text-white' : 'text-[#E50914]'}`} />
                      <span>{src.provider}</span>
                    </button>
                  );
                })}

                {streamSources.length > 3 && (
                  <select
                    value={activeSourceIndex >= 3 ? activeSourceIndex : ''}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      if (!isNaN(idx)) {
                        setActiveSourceIndex(idx);
                        setIframeKey(k => k + 1);
                      }
                    }}
                    className="bg-[#252525] text-gray-300 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-white/10 outline-none cursor-pointer hover:border-white/30"
                  >
                    <option value="" disabled>+ Server Cadangan ▾</option>
                    {streamSources.slice(3).map((src, idx) => (
                      <option key={idx + 3} value={idx + 3} className="bg-[#181818] text-white">
                        {src.provider}
                      </option>
                    ))}
                  </select>
                )}

                {/* Right Action Icons */}
                <div className="flex items-center gap-1 pl-1 border-l border-white/10">
                  <button
                    onClick={() => setIframeKey(k => k + 1)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white"
                    title="Refresh Video"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsTheater(!isTheater)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white"
                    title={isTheater ? "Mode Normal" : "Mode Bioskop"}
                  >
                    {isTheater ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  {currentSource?.url && (
                    <a
                      href={currentSource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white"
                      title="Buka di Tab Baru"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={() => setIsPlaying(false)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-[#E50914] text-white ml-0.5"
                    title="Tutup Pemutar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Top Hero Backdrop */}
      <div className="relative w-full h-[50vh] sm:h-[65vh] lg:h-[75vh] overflow-hidden">
        <img
          src={currentMovie.backdropImg || currentMovie.posterImg}
          alt={currentMovie.title}
          className="w-full h-full object-cover object-center"
        />

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/60 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111111] via-[#111111]/30 to-transparent" />

        {/* Back Button */}
        <button
          onClick={onBack}
          className="absolute top-6 left-4 sm:left-8 z-30 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-black/60 hover:bg-[#E50914] text-white backdrop-blur-md border border-white/10 text-xs font-bold transition-all shadow-xl active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        {/* Hero Title and Metadata */}
        <div className="absolute bottom-8 left-4 sm:left-8 right-4 sm:right-8 z-20 space-y-3 max-w-4xl">
          {/* Genre Line */}
          <p className="text-xs sm:text-sm font-semibold text-gray-300 tracking-wide">
            {currentMovie.genres?.join(' · ') || 'Action · Adventure · Drama'}
          </p>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-lg">
            {currentMovie.title}
          </h1>

          {/* Action Buttons: Putar, Trailer, Download, Simpan */}
          <div className="flex items-center flex-wrap gap-2.5 pt-2">
            <button
              onClick={() => handleStartPlay(selectedSeason, 1)}
              className="px-6 py-2.5 rounded bg-[#E50914] hover:bg-[#F40612] text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-white stroke-none" />
              <span>{isSeries ? 'Putar Episode 1' : 'Putar Film'}</span>
            </button>

            <button
              onClick={() => setShowDownloadModal(true)}
              className="px-4 py-2.5 rounded bg-white/10 hover:bg-white/20 text-emerald-400 font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/10 backdrop-blur-md active:scale-95 transition-all"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Film HD</span>
            </button>

            <button
              onClick={handleStartTrailer}
              className="px-4 py-2.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/10 backdrop-blur-md active:scale-95 transition-all"
            >
              <Video className="w-4 h-4 text-[#E50914]" />
              <span>Trailer</span>
            </button>

            {onToggleSave && (
              <button
                onClick={() => onToggleSave(currentMovie)}
                className="px-4 py-2.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/10 backdrop-blur-md active:scale-95 transition-all"
              >
                {isSaved ? <Check className="w-4 h-4 text-green-400" /> : <Plus className="w-4 h-4 text-[#E50914]" />}
                <span>{isSaved ? 'Tersimpan' : 'Daftar Saya'}</span>
              </button>
            )}

            {onOpenAddToPlaylist && (
              <button
                onClick={() => onOpenAddToPlaylist(currentMovie)}
                className="px-4 py-2.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/10 backdrop-blur-md active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 text-[#E50914]" />
                <span>Koleksi</span>
              </button>
            )}
          </div>

          {/* Metadata line */}
          <div className="flex items-center flex-wrap gap-3 text-xs text-gray-300 font-medium pt-1">
            <span className="text-white font-bold">{currentMovie.year || '2024'}</span>
            <span>·</span>
            <span>{isSeries ? `${currentMovie.seasons?.length || 1} Season` : currentMovie.duration || '2h 15m'}</span>
            <span>·</span>
            <div className="flex items-center gap-1 text-[#F5C518] font-black">
              <Star className="w-3.5 h-3.5 fill-[#F5C518]" />
              <span>{currentMovie.rating || '8.2'}</span>
            </div>
            <span>·</span>
            <span>{currentMovie.countries?.[0] || 'International'}</span>
            <span>·</span>
            <span className="px-1.5 py-0.5 rounded bg-[#222222] font-bold text-[10px] text-gray-200 border border-white/10">
              HD
            </span>
            <span>·</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black text-[10px] tracking-wider border border-emerald-500/30 uppercase">
              {currentMovie.releaseStatus || (isSeries ? 'ONGOING' : 'RELEASED')}
            </span>
          </div>

          {/* Directors */}
          {currentMovie.directors && currentMovie.directors.length > 0 && (
            <p className="text-xs text-gray-400 font-medium">
              <span className="text-gray-300 font-bold">Creator / Sutradara : </span>
              {currentMovie.directors.join(', ')}
            </p>
          )}

          {/* Synopsis */}
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-3xl line-clamp-3">
            {currentMovie.synopsis}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8">

        {/* 🎬 IDLIX EXACT EPISODES SECTION */}
        {isSeries && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Episodes
                </h2>
                <span className="px-2 py-0.5 rounded bg-white/10 text-xs font-bold text-gray-300">
                  Season {selectedSeason} ({episodes.length} eps)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {currentMovie.seasons && currentMovie.seasons.length > 1 && (
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                    className="bg-[#1f1f1f] text-xs font-bold text-white border border-white/15 rounded-lg px-3 py-2 outline-none cursor-pointer focus:border-[#E50914]"
                  >
                    {currentMovie.seasons.map((s) => (
                      <option key={s.seasonNumber} value={s.seasonNumber} className="bg-[#141414]">
                        Season {s.seasonNumber} ({s.episodeCount} eps)
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] text-xs font-bold text-gray-200 border border-white/15 transition-colors"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#E50914]" />
                  <span>{sortOrder === 'asc' ? 'Oldest' : 'Newest'}</span>
                </button>
              </div>
            </div>

            {/* Horizontal Season Pills */}
            {currentMovie.seasons && currentMovie.seasons.length > 1 && (
              <div className="relative flex items-center">
                <button
                  onClick={() => scrollSeasons('left')}
                  className="w-7 h-7 rounded-full bg-black/80 hover:bg-[#E50914] text-white flex items-center justify-center shrink-0 mr-2 z-10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div 
                  ref={seasonScrollRef}
                  className="flex items-center gap-2 overflow-x-auto scroll-smooth no-scrollbar py-1 flex-1"
                >
                  {currentMovie.seasons.map((s) => {
                    const isCurrent = selectedSeason === s.seasonNumber;
                    return (
                      <button
                        key={s.seasonNumber}
                        onClick={() => setSelectedSeason(s.seasonNumber)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                          isCurrent
                            ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/30'
                            : 'bg-[#222222] text-gray-300 hover:bg-[#333333] hover:text-white border border-white/10'
                        }`}
                      >
                        Season {s.seasonNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => scrollSeasons('right')}
                  className="w-7 h-7 rounded-full bg-black/80 hover:bg-[#E50914] text-white flex items-center justify-center shrink-0 ml-2 z-10 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Episode Grid */}
            {loadingEpisodes ? (
              <div className="py-16 text-center text-xs text-gray-400">
                Memuat daftar episode Season {selectedSeason}...
              </div>
            ) : sortedEpisodes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {sortedEpisodes.map((ep) => (
                  <div
                    key={ep.episodeNumber}
                    onClick={() => handleStartPlay(selectedSeason, ep.episodeNumber, ep)}
                    className="group cursor-pointer select-none flex flex-col space-y-2.5"
                  >
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-[#181818] border border-white/10 group-hover:border-[#E50914] shadow-md group-hover:shadow-2xl transition-all">
                      <img
                        src={ep.stillPath || currentMovie.backdropImg || currentMovie.posterImg}
                        alt={ep.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/600x338/181818/E50914?text=${encodeURIComponent(`S${selectedSeason} E${ep.episodeNumber}`)}`;
                        }}
                      />

                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors pointer-events-none" />

                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-black text-white tracking-wider border border-white/10 pointer-events-none">
                        {`S${String(selectedSeason).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`}
                      </div>

                      {ep.releaseDate && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-bold text-gray-200 border border-white/10 pointer-events-none">
                          {formatAirDate(ep.releaseDate)}
                        </div>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="w-11 h-11 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                          <Play className="w-5 h-5 fill-white stroke-none ml-0.5" />
                        </div>
                      </div>

                      {ep.rating && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/10 pointer-events-none">
                          <Star className="w-3 h-3 text-[#F5C518] fill-[#F5C518]" />
                          <span>{ep.rating}</span>
                        </div>
                      )}

                      <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-gray-300 border border-white/10 pointer-events-none">
                        {ep.duration || '24m'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-white group-hover:text-[#E50914] transition-colors truncate">
                        {ep.title}
                      </h3>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {ep.overview || `Sinopsis episode ${ep.episodeNumber} dari Season ${selectedSeason}.`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-gray-400">
                Episode siap diputar. Klik tombol "Putar Episode 1" di atas.
              </div>
            )}
          </div>
        )}

        {/* 🌟 Pemeran & Aktor Utama (Foto Profil Wajah Asli & Karakter) */}
        {currentMovie.castMembers && currentMovie.castMembers.length > 0 ? (
          <div className="space-y-4 border-t border-white/10 pt-8" id="cast-section">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Pemeran & Aktor Utama
                </h2>
                <p className="text-xs text-gray-400">Klik foto artis untuk melihat pop-up filmografi lengkap</p>
              </div>
              <span className="text-xs text-gray-400 font-semibold">{currentMovie.castMembers.length} Aktor</span>
            </div>

            {/* Avatars Row */}
            <div className="flex items-start gap-4 overflow-x-auto no-scrollbar py-2">
              {currentMovie.castMembers.map((actor, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleActorClick(actor.id)}
                  className="flex flex-col items-center space-y-2 shrink-0 w-24 text-center group cursor-pointer hover:scale-105 transition-transform"
                >
                  <div className="relative w-20 h-20 rounded-full overflow-hidden bg-[#222222] border-2 border-white/10 group-hover:border-[#E50914] shadow-xl transition-all duration-300">
                    <img
                      src={actor.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.name)}&background=222222&color=fff&size=200`}
                      alt={actor.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.name)}&background=222222&color=fff&size=200`;
                      }}
                    />
                  </div>

                  <div className="space-y-0.5 w-full px-1">
                    <p className="text-xs font-bold text-white group-hover:text-[#E50914] transition-colors truncate">
                      {actor.name}
                    </p>
                    {actor.character && (
                      <p className="text-[10px] text-gray-400 font-medium truncate">
                        {actor.character}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Dynamic Similar / Recommended Content */}
        <div className="space-y-4 border-t border-white/10 pt-8">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#E50914]" />
            <h2 className="text-xl font-black text-white tracking-tight">
              Konten Serupa & Rekomendasi
            </h2>
          </div>

          {loadingSimilar ? (
            <div className="py-10 text-center text-xs text-gray-400">
              Mencari judul serupa terbaik...
            </div>
          ) : similarMovies.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
              {similarMovies.map((simMovie) => (
                <MovieCard
                  key={simMovie._id}
                  movie={simMovie}
                  onClick={(m) => handleMovieClick(m as Movie)}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">
              Tidak ada konten serupa yang ditemukan.
            </div>
          )}
        </div>

      </div>

      

      {/* Download Pop-up Modal */}
      <ActorModal
        actor={selectedActorProfile}
        isOpen={Boolean(selectedActorProfile)}
        onClose={() => setSelectedActorProfile(null)}
        onSelectMovie={handleMovieClick}
      />

      <DownloadModal
        movie={currentMovie}
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        selectedSeason={selectedSeason}
        episodes={episodes}
      />
    </div>
  );
};
