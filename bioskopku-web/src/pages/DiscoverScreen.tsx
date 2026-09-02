
import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X, Loader2, Sparkles, RotateCcw, Plus, Check } from 'lucide-react';
import type { Movie, MovieDetails } from '../types';
import { searchMovies, fetchFilteredCatalog } from '../services/api';
import { MovieCard } from '../components/MovieCard';

interface DiscoverScreenProps {
  initialQuery?: string;
  initialGenre?: string;
  defaultPopular?: (Movie | MovieDetails)[];
  onSelectMovie: (movie: Movie | MovieDetails) => void;
}

const GENRE_LIST = [
  'Gender Bender', 'Body Swap', 'Action', 'Romance', 'Horror', 'Comedy', 'Sci-Fi', 'Drama', 'Thriller', 'Fantasy', 'Animation', 'Adventure', 'Crime', 'Mystery'
];

const TYPE_OPTIONS = [
  { id: 'all', label: 'Semua Kategori' },
  { id: 'movie', label: '🎬 Film Bioskop (Movies)' },
  { id: 'series', label: '📺 TV Series' },
  { id: 'indo', label: '🇮🇩 Film Indonesia' },
  { id: 'kdrama', label: '🇰🇷 Drama Korea (Drakor)' },
  { id: 'dracin', label: '🇨🇳 Drama China (Dracin)' },
  { id: 'jdrama', label: '🇯🇵 Dorama Jepang' },
  { id: 'anime', label: '🎌 Anime' },
];

const SORT_OPTIONS = [
  { id: 'popularity', label: '🔥 Paling Populer' },
  { id: 'rating', label: '⭐ Rating Tertinggi' },
  { id: 'latest', label: '📅 Rilis Terbaru' },
];

const YEAR_OPTIONS = [
  { id: 'all', label: 'Semua Tahun' },
  { id: '2026', label: '2026' },
  { id: '2025', label: '2025' },
  { id: '2024', label: '2024' },
  { id: '2023', label: '2023' },
  { id: '2022', label: '2022' },
  { id: '2021', label: '2021' },
  { id: '2020', label: '2020' },
  { id: '2010s', label: 'Era 2010-2019' },
  { id: 'classic', label: 'Klasik (Pre-2010)' },
];

  const normalizeGenreToType = (g?: string) => {
    if (!g) return 'all';
    const lower = g.toLowerCase();
    if (lower === 'kdrama' || lower === 'k-drama' || lower === 'drakor') return 'kdrama';
    if (lower === 'dracin' || lower === 'drama china') return 'dracin';
    if (lower === 'indo' || lower === 'film indo' || lower === 'film indonesia') return 'indo';
    if (lower === 'jdrama' || lower === 'dorama') return 'jdrama';
    if (lower === 'anime') return 'anime';
    if (lower === 'movie' || lower === 'movies') return 'movie';
    if (lower === 'series' || lower === 'tv series') return 'series';
    return 'all';
  };

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  initialQuery = '',
  initialGenre,
  onSelectMovie,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  
  // Filter States
  const [selectedType, setSelectedType] = useState<string>(normalizeGenreToType(initialGenre));
  const [selectedGenre, setSelectedGenre] = useState<string>(
    GENRE_LIST.includes(initialGenre || '') ? (initialGenre || '').toLowerCase() : 'all'
  );
  const [selectedSort, setSelectedSort] = useState<string>('popularity');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Pop-up Modal State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Temporary modal states (before applying)
  const [tempType, setTempType] = useState<string>(selectedType);
  const [tempGenre, setTempGenre] = useState<string>(selectedGenre);
  const [tempSort, setTempSort] = useState<string>(selectedSort);
  const [tempYear, setTempYear] = useState<string>(selectedYear);

  const [results, setResults] = useState<(Movie | MovieDetails)[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (initialGenre) {
      const mapped = normalizeGenreToType(initialGenre);
      setSelectedType(mapped);
      setTempType(mapped);
      setSearchQuery('');
    }
  }, [initialGenre]);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  const loadData = (type: string, genre: string, sort: string, year: string, search: string) => {
    setLoading(true);
    setCurrentPage(1);

    if (search.trim()) {
      searchMovies(search.trim()).then((data) => {
        setResults(data);
        setLoading(false);
      });
      return;
    }

    fetchFilteredCatalog({
      type,
      genre,
      sortBy: sort,
      year,
      page: 1,
    }).then((data) => {
      setResults(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData(selectedType, selectedGenre, selectedSort, selectedYear, searchQuery);
  }, [selectedType, selectedGenre, selectedSort, selectedYear, searchQuery]);

  const openFilterModal = () => {
    setTempType(selectedType);
    setTempGenre(selectedGenre);
    setTempSort(selectedSort);
    setTempYear(selectedYear);
    setIsFilterModalOpen(true);
  };

  const applyFilters = () => {
    setSelectedType(tempType);
    setSelectedGenre(tempGenre);
    setSelectedSort(tempSort);
    setSelectedYear(tempYear);
    setSearchQuery('');
    setIsFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setSelectedType('all');
    setSelectedGenre('all');
    setSelectedSort('popularity');
    setSelectedYear('all');
    setTempType('all');
    setTempGenre('all');
    setTempSort('popularity');
    setTempYear('all');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    fetchFilteredCatalog({
      type: selectedType,
      genre: selectedGenre,
      sortBy: selectedSort,
      year: selectedYear,
      page: nextPage,
    }).then((more) => {
      if (more.length > 0) {
        setResults((prev) => {
          const seen = new Set(prev.map((m) => m._id));
          const additions = more.filter((m) => !seen.has(m._id));
          return [...prev, ...additions];
        });
        setCurrentPage(nextPage);
      }
      setLoadingMore(false);
    });
  };

  const activeFilterCount = (selectedType !== 'all' ? 1 : 0) + 
    (selectedGenre !== 'all' ? 1 : 0) + 
    (selectedSort !== 'popularity' ? 1 : 0) + 
    (selectedYear !== 'all' ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-28 space-y-6 animate-in fade-in duration-300">
      
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Eksplorasi & Pencarian
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Temukan ribuan film bioskop, drama Korea, dracin, dorama, dan anime.
          </p>
        </div>

        {/* Action Controls: Search Input + Filter Action Button */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-72 lg:w-80">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul, aktor, anime..."
              className="w-full bg-[#1F1F1F] border border-white/10 focus:border-[#E50914] text-xs text-white placeholder-gray-400 rounded-lg py-3 pl-10 pr-9 outline-none transition-all shadow-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ACTION BUTTON: FILTER POP-UP */}
          <button
            onClick={openFilterModal}
            className={`px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 shrink-0 ${
              activeFilterCount > 0
                ? 'bg-[#E50914] hover:bg-[#F40612] text-white shadow-[#E50914]/30'
                : 'bg-[#1F1F1F] hover:bg-[#2A2A2A] text-gray-200 border border-white/10'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filter Sinema</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-black text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Chips & Reset */}
      {activeFilterCount > 0 && !searchQuery && (
        <div className="flex items-center gap-2 flex-wrap text-xs bg-[#181818] p-2.5 rounded-lg border border-white/10">
          <span className="text-gray-400 font-medium text-[11px]">Filter Aktif:</span>
          {selectedType !== 'all' && (
            <span className="px-2.5 py-1 rounded bg-[#E50914] text-white text-[11px] font-bold">
              {TYPE_OPTIONS.find(t => t.id === selectedType)?.label}
            </span>
          )}
          {selectedGenre !== 'all' && (
            <span className="px-2.5 py-1 rounded bg-[#E50914] text-white text-[11px] font-bold">
              Genre: {selectedGenre.toUpperCase()}
            </span>
          )}
          {selectedSort !== 'popularity' && (
            <span className="px-2.5 py-1 rounded bg-white/20 text-white text-[11px] font-bold">
              {SORT_OPTIONS.find(s => s.id === selectedSort)?.label}
            </span>
          )}
          {selectedYear !== 'all' && (
            <span className="px-2.5 py-1 rounded bg-white/20 text-white text-[11px] font-bold">
              Tahun: {selectedYear}
            </span>
          )}
          <button
            onClick={handleResetFilters}
            className="ml-auto text-xs text-gray-400 hover:text-white flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3 h-3 text-[#E50914]" />
            <span>Reset</span>
          </button>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
          {searchQuery ? `Hasil Pencarian "${searchQuery}"` : 'Koleksi Sinema'}
        </h2>
        <span className="text-xs text-gray-300 font-bold bg-[#181818] px-2.5 py-1 rounded border border-white/10">
          {results.length} Judul Ditemukan
        </span>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[#E50914] animate-spin" />
          <span className="text-xs text-gray-400">Menerapkan filter sinema...</span>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {results.map((movie) => (
              <MovieCard
                key={movie._id}
                movie={movie}
                onClick={onSelectMovie}
                layout="grid"
                showRating={true}
              />
            ))}
          </div>

          {!searchQuery && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded bg-[#242424] hover:bg-[#E50914] text-white border border-white/10 font-bold text-xs sm:text-sm flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Memuat...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Muat Lebih Banyak ({results.length} Judul)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center space-y-3 bg-[#181818] rounded-xl border border-white/10 p-8 max-w-md mx-auto">
          <Sparkles className="w-10 h-10 text-gray-500 mx-auto" />
          <p className="text-sm font-bold text-white">Tidak ada judul yang cocok.</p>
          <p className="text-xs text-gray-400">Coba ubah kata kunci atau atur ulang filter.</p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded bg-[#E50914] text-white font-bold text-xs shadow-md mt-2"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* CLEAN POP-UP FILTER MODAL */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#181818] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#E50914] flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">Filter & Pilihan Genre</h3>
                  <p className="text-[11px] text-gray-400">Pilih kombinasi kategori dan genre yang Anda inginkan</p>
                </div>
              </div>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. PILIH GENRE */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white">1. Pilih Genre</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTempGenre('all')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-between ${
                    tempGenre === 'all'
                      ? 'bg-[#E50914] text-white border-[#E50914] shadow-md'
                      : 'bg-[#242424] text-gray-300 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span>Semua</span>
                  {tempGenre === 'all' && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
                {GENRE_LIST.map((g) => {
                  const isSelected = tempGenre === g.toLowerCase();
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setTempGenre(g.toLowerCase())}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#E50914] text-white border-[#E50914] shadow-md'
                          : 'bg-[#242424] text-gray-300 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <span>{g}</span>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. KATEGORI / ASAL */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-xs font-bold text-white">2. Kategori / Asal Sinema</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {TYPE_OPTIONS.map((item) => {
                  const isSelected = tempType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTempType(item.id)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#E50914] text-white border-[#E50914] shadow-md'
                          : 'bg-[#242424] text-gray-300 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {isSelected && <Check className="w-3 h-3 stroke-[3] shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. URUTKAN & TAHUN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white">3. Urutkan</label>
                <select
                  value={tempSort}
                  onChange={(e) => setTempSort(e.target.value)}
                  className="w-full bg-[#242424] text-xs font-bold text-white border border-white/10 rounded-lg p-2.5 outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#141414] text-white">{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white">4. Tahun Rilis</label>
                <select
                  value={tempYear}
                  onChange={(e) => setTempYear(e.target.value)}
                  className="w-full bg-[#242424] text-xs font-bold text-white border border-white/10 rounded-lg p-2.5 outline-none cursor-pointer"
                >
                  {YEAR_OPTIONS.map(y => (
                    <option key={y.id} value={y.id} className="bg-[#141414] text-white">{y.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10 gap-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold transition-all"
              >
                Reset Semua
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 py-2.5 rounded-lg bg-[#E50914] hover:bg-[#F40612] text-white font-bold text-xs shadow-lg shadow-[#E50914]/30 active:scale-98 transition-all"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
